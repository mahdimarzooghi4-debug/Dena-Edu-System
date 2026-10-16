import { randomUUID } from "node:crypto";
import { and, inArray, eq } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  courseConversationMessages,
  courseConversations,
  courseTeamMembers,
  courses,
  memberships,
  privateMediaAssets,
  problemSolvingRequests,
  problemSolvingSessions,
  session,
  studentEnrollments,
  supervisionGrants,
  user,
  verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("course team communication and problem-solving stay course-scoped", () => {
  const db = getDb();
  const users = {
    admin: randomUUID(),
    provider: randomUUID(),
    institute: randomUUID(),
    student: randomUUID(),
    otherStudent: randomUUID(),
    supporter: randomUUID(),
    otherSupporter: randomUUID(),
    counselor: randomUUID(),
    teacher: randomUUID(),
  };
  const tokens = Object.fromEntries(
    Object.keys(users).map((name) => [name, randomUUID()]),
  ) as Record<keyof typeof users, string>;

  const providerId = randomUUID();
  const instituteId = randomUUID();
  const courseId = randomUUID();
  const assetId = randomUUID();

  let supporterTeamMemberId = "";
  let counselorTeamMemberId = "";
  let teacherTeamMemberId = "";
  let conversationId = "";
  let requestId = "";
  let problemSessionId = "";

  async function signed(as: keyof typeof users): Promise<string> {
    const value = await serializeSignedCookie(
      "better-auth.session_token",
      tokens[as],
      process.env.BETTER_AUTH_SECRET!,
    );
    return value.split(";")[0];
  }

  async function client(as?: keyof typeof users): Promise<APIRequestContext> {
    return request.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: as ? { Cookie: await signed(as) } : {},
    });
  }

  const origin = { Origin: "http://localhost:3000" };
  const attackerOrigin = { Origin: "https://attacker.invalid" };

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id,
      name: name === "student"
        ? "دانش‌آموز آزمون"
        : name === "supporter"
          ? "پشتیبان آزمون"
          : name === "counselor"
            ? "مشاور آزمون"
            : name === "teacher"
              ? "مدرس آزمون"
              : name,
      email: `${id}@example.test`,
    })));

    await db.insert(verifiedEntities).values([
      {
        id: providerId,
        role: "provider",
        name: "ارائه‌دهنده آزمون تیم آموزشی",
        evidenceReference: "integration/course-team-provider",
        verifiedByUserId: users.admin,
      },
      {
        id: instituteId,
        role: "institute",
        name: "مؤسسه آزمون تیم آموزشی",
        evidenceReference: "integration/course-team-institute",
        verifiedByUserId: users.admin,
      },
    ]);

    await db.insert(memberships).values([
      { userId: users.provider, role: "provider", providerId },
      { userId: users.institute, role: "institute", instituteId },
      { userId: users.student, role: "student" },
      { userId: users.otherStudent, role: "student" },
    ]);

    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(session).values(
      Object.entries(tokens).map(([name, token]) => ({
        userId: users[name as keyof typeof users],
        token,
        expiresAt,
      })),
    );

    await db.insert(courses).values({
      id: courseId,
      providerId,
      responsibleInstituteId: instituteId,
      title: "دوره آزمون ارتباط تیم آموزشی",
      publicationStatus: "published",
      publishedAt: new Date(),
      createdByProviderUserId: users.provider,
      clientRequestId: randomUUID(),
    });

    await db.insert(supervisionGrants).values({
      courseId,
      providerId,
      instituteId,
      status: "approved",
      requestedByProviderUserId: users.provider,
      approvedByInstituteUserId: users.institute,
      approvedAt: new Date(),
    });

    await db.insert(privateMediaAssets).values({
      id: assetId,
      courseId,
      title: "محتوای آماده آزمون",
      objectKey: `${courseId}/${assetId}.mp4`,
      status: "ready",
    });

    await db.insert(studentEnrollments).values({
      courseId,
      studentUserId: users.student,
      status: "active",
    });
  });

  test.afterAll(async () => {
    const conversations = await db.select({ id: courseConversations.id })
      .from(courseConversations)
      .where(eq(courseConversations.courseId, courseId));
    const conversationIds = conversations.map((row) => row.id);

    if (conversationIds.length > 0) {
      await db.delete(courseConversationMessages).where(
        inArray(courseConversationMessages.conversationId, conversationIds),
      );
    }
    await db.delete(courseConversations).where(
      eq(courseConversations.courseId, courseId),
    );
    await db.delete(problemSolvingSessions).where(
      eq(problemSolvingSessions.courseId, courseId),
    );
    await db.delete(problemSolvingRequests).where(
      eq(problemSolvingRequests.courseId, courseId),
    );
    await db.delete(courseTeamMembers).where(
      eq(courseTeamMembers.courseId, courseId),
    );
    await db.delete(privateMediaAssets).where(
      eq(privateMediaAssets.courseId, courseId),
    );
    await db.delete(studentEnrollments).where(
      eq(studentEnrollments.courseId, courseId),
    );
    await db.delete(supervisionGrants).where(
      eq(supervisionGrants.courseId, courseId),
    );
    await db.delete(courses).where(eq(courses.id, courseId));
    await db.delete(memberships).where(
      inArray(memberships.userId, Object.values(users)),
    );
    await db.delete(verifiedEntities).where(
      inArray(verifiedEntities.id, [providerId, instituteId]),
    );
    await db.delete(session).where(
      inArray(session.userId, Object.values(users)),
    );
    await db.delete(user).where(
      inArray(user.id, Object.values(users)),
    );
  });

  test("institute assigns course roles without granting global roles", async () => {
    const institute = await client("institute");
    const provider = await client("provider");

    expect((await provider.post(
      `/api/institute/courses/${courseId}/team`,
      {
        data: { memberUserId: users.supporter, role: "academic_supporter" },
        headers: origin,
      },
    )).status()).toBe(403);

    const supporter = await institute.post(
      `/api/institute/courses/${courseId}/team`,
      {
        data: { memberUserId: users.supporter, role: "academic_supporter" },
        headers: origin,
      },
    );
    expect(supporter.status()).toBe(201);
    supporterTeamMemberId = (await supporter.json()).teamMemberId;

    const otherSupporter = await institute.post(
      `/api/institute/courses/${courseId}/team`,
      {
        data: {
          memberUserId: users.otherSupporter,
          role: "academic_supporter",
        },
        headers: origin,
      },
    );
    expect(otherSupporter.status()).toBe(201);

    const counselor = await institute.post(
      `/api/institute/courses/${courseId}/team`,
      {
        data: { memberUserId: users.counselor, role: "counselor" },
        headers: origin,
      },
    );
    expect(counselor.status()).toBe(201);
    counselorTeamMemberId = (await counselor.json()).teamMemberId;

    const teacher = await institute.post(
      `/api/institute/courses/${courseId}/team`,
      {
        data: { memberUserId: users.teacher, role: "teacher" },
        headers: origin,
      },
    );
    expect(teacher.status()).toBe(201);
    teacherTeamMemberId = (await teacher.json()).teamMemberId;

    const [supporterMemberships, counselorMemberships] = await Promise.all([
      db.select().from(memberships).where(eq(memberships.userId, users.supporter)),
      db.select().from(memberships).where(eq(memberships.userId, users.counselor)),
    ]);
    expect(supporterMemberships).toHaveLength(0);
    expect(counselorMemberships).toHaveLength(0);

    await provider.dispose();
    await institute.dispose();
  });

  test("student sees sanitized own course team; unrelated student sees nothing", async () => {
    const student = await client("student");
    const otherStudent = await client("otherStudent");

    const own = await student.get(`/api/student/courses/${courseId}/team`);
    expect(own.status()).toBe(200);
    const payload = await own.json() as {
      team: Array<Record<string, unknown>>;
    };
    expect(payload.team).toHaveLength(4);
    expect(payload.team.map((entry) => entry.role).sort()).toEqual([
      "academic_supporter",
      "academic_supporter",
      "counselor",
      "teacher",
    ]);
    for (const entry of payload.team) {
      expect(entry).not.toHaveProperty("memberUserId");
      expect(entry).not.toHaveProperty("email");
      expect(entry).not.toHaveProperty("phoneNumber");
    }

    expect((await otherStudent.get(
      `/api/student/courses/${courseId}/team`,
    )).status()).toBe(404);

    await student.dispose();
    await otherStudent.dispose();
  });

  test("course conversation is two-way and exact-assignment scoped", async () => {
    const student = await client("student");
    const otherStudent = await client("otherStudent");
    const supporter = await client("supporter");
    const otherSupporter = await client("otherSupporter");

    const path =
      `/api/student/courses/${courseId}/team/${supporterTeamMemberId}/conversation`;
    const teacherPath =
      `/api/student/courses/${courseId}/team/${teacherTeamMemberId}/conversation`;

    expect((await student.get(teacherPath)).status()).toBe(404);
    expect((await student.post(teacherPath, {
      data: { body: "گفت‌وگو با مدرس هنوز تعریف نشده است." },
      headers: origin,
    })).status()).toBe(404);

    expect((await student.post(path, {
      data: { body: "پیام با origin نامعتبر" },
      headers: attackerOrigin,
    })).status()).toBe(403);

    expect((await otherStudent.post(path, {
      data: { body: "نباید ارسال شود" },
      headers: origin,
    })).status()).toBe(404);

    const sent = await student.post(path, {
      data: { body: "برای ادامه این دوره یک سؤال دارم." },
      headers: origin,
    });
    expect(sent.status()).toBe(201);
    conversationId = (await sent.json()).conversationId;

    const list = await student.get(
      `/api/student/courses/${courseId}/conversations`,
    );
    expect(list.status()).toBe(200);
    const listPayload = await list.json() as {
      conversations: Array<{ teamMemberId: string; role: string }>;
    };
    expect(listPayload.conversations).toEqual([
      expect.objectContaining({
        teamMemberId: supporterTeamMemberId,
        role: "academic_supporter",
      }),
    ]);
    expect(listPayload.conversations.some(
      (item) => item.teamMemberId === teacherTeamMemberId,
    )).toBe(false);

    // Course-team assignment is enough; no global membership is required.
    const workspace = await supporter.get("/course-team", {
      maxRedirects: 0,
    });
    expect(workspace.status()).toBe(200);
    expect(await workspace.text()).toContain("فضای ارتباط آموزشی");

    const account = await supporter.get("/account", { maxRedirects: 0 });
    expect(account.status()).toBe(200);
    const accountHtml = await account.text();
    expect(accountHtml).toContain("عضو تیم آموزشی دوره");
    expect(accountHtml).toContain("فضای تیم آموزشی");

    const memberPath =
      `/api/course-team/assignments/${supporterTeamMemberId}/conversations/${conversationId}`;
    const wrongMemberPath =
      `/api/course-team/assignments/${supporterTeamMemberId}/conversations/${conversationId}`;

    expect((await otherSupporter.get(wrongMemberPath)).status()).toBe(404);
    expect((await otherSupporter.post(wrongMemberPath, {
      data: { body: "نباید پاسخ داده شود" },
      headers: origin,
    })).status()).toBe(404);

    const thread = await supporter.get(memberPath);
    expect(thread.status()).toBe(200);
    expect(JSON.stringify(await thread.json()))
      .not.toContain(users.student);
    // Public payload contains display name, never contact/auth fields.
    const threadAgain = await supporter.get(memberPath);
    const threadText = JSON.stringify(await threadAgain.json());
    expect(threadText).toContain("دانش‌آموز آزمون");
    expect(threadText).not.toContain(`${users.student}@example.test`);
    expect(threadText).not.toContain("phoneNumber");

    expect((await supporter.post(memberPath, {
      data: { body: "پیامت را دریافت کردم." },
      headers: attackerOrigin,
    })).status()).toBe(403);

    const reply = await supporter.post(memberPath, {
      data: { body: "پیامت را دریافت کردم." },
      headers: origin,
    });
    expect(reply.status()).toBe(201);

    const studentThread = await student.get(path);
    expect(studentThread.status()).toBe(200);
    const studentPayload = JSON.stringify(await studentThread.json());
    expect(studentPayload).toContain("پیامت را دریافت کردم.");
    expect(studentPayload).not.toContain(users.supporter);
    expect(studentPayload).not.toContain(`${users.supporter}@example.test`);

    await student.dispose();
    await otherStudent.dispose();
    await supporter.dispose();
    await otherSupporter.dispose();
  });

  test("student can message the course supporter through the browser", async ({ page }) => {
    const cookie = await serializeSignedCookie(
      "better-auth.session_token", tokens.student,
      process.env.BETTER_AUTH_SECRET!,
    );
    const cookiePair = cookie.split(";")[0];
    const cookieSeparator = cookiePair.indexOf("=");
    await page.context().addCookies([{
      name: cookiePair.slice(0, cookieSeparator),
      value: cookiePair.slice(cookieSeparator + 1),
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    }]);

    await page.goto(`http://localhost:3000/student/courses/${courseId}`);
    await page.getByRole("link", { name: /پشتیبان آزمون/ }).click();
    await page.getByRole("link", { name: "مشاهده گفت‌وگو" }).click();

    const message = "برای ادامهٔ درس از رابط دانش‌آموز پیام می‌فرستم.";
    await page.getByLabel("پیام خود را بنویسید").fill(message);
    await page.getByRole("button", { name: "ارسال" }).click();
    await expect(page.getByText(message)).toBeVisible();

    const supporter = await client("supporter");
    const reply = "پیامت را از مسیر گفت‌وگوی دوره دریافت کردم.";
    const response = await supporter.post(
      `/api/course-team/assignments/${supporterTeamMemberId}/conversations/${conversationId}`,
      { data: { body: reply }, headers: origin },
    );
    expect(response.status()).toBe(201);
    await supporter.dispose();

    await page.reload();
    await expect(page.getByText(reply)).toBeVisible();
  });

  test("problem-solving is supporter-only and institute-enabled", async () => {
    const student = await client("student");
    const otherStudent = await client("otherStudent");
    const institute = await client("institute");
    const supporter = await client("supporter");
    const otherSupporter = await client("otherSupporter");
    const counselor = await client("counselor");

    const studentPath =
      `/api/student/courses/${courseId}/team/${supporterTeamMemberId}/problem-solving`;
    const counselorPath =
      `/api/student/courses/${courseId}/team/${counselorTeamMemberId}/problem-solving`;

    expect((await student.post(studentPath, {
      data: { subject: "رفع اشکال مبحث" },
      headers: origin,
    })).status()).toBe(404);

    expect((await institute.patch(
      `/api/institute/courses/${courseId}/team/${counselorTeamMemberId}`,
      { data: { enabled: true }, headers: origin },
    )).status()).toBe(404);

    expect((await institute.patch(
      `/api/institute/courses/${courseId}/team/${supporterTeamMemberId}`,
      { data: { enabled: true }, headers: attackerOrigin },
    )).status()).toBe(403);

    const enabled = await institute.patch(
      `/api/institute/courses/${courseId}/team/${supporterTeamMemberId}`,
      { data: { enabled: true }, headers: origin },
    );
    expect(enabled.status()).toBe(200);
    expect(await enabled.json()).toMatchObject({
      teamMemberId: supporterTeamMemberId,
      studentSessionRequestsEnabled: true,
    });

    expect((await student.get(counselorPath)).status()).toBe(404);
    expect((await counselor.get(
      `/course-team/${counselorTeamMemberId}/problem-solving`,
    )).status()).toBe(404);

    expect((await otherStudent.post(studentPath, {
      data: { subject: "درخواست خارج از دوره" },
      headers: origin,
    })).status()).toBe(404);

    const created = await student.post(studentPath, {
      data: {
        subject: "تمرین‌های ترکیبی این مبحث",
        description: "برای حل چند تمرین ترکیبی نیاز به توضیح بیشتر دارم.",
      },
      headers: origin,
    });
    expect(created.status()).toBe(201);
    requestId = (await created.json()).request.id;

    const requestDecisionPath =
      `/api/course-team/assignments/${supporterTeamMemberId}/problem-solving/requests/${requestId}`;

    expect((await otherSupporter.patch(requestDecisionPath, {
      data: { action: "review" },
      headers: origin,
    })).status()).toBe(404);

    expect((await supporter.patch(requestDecisionPath, {
      data: { action: "review" },
      headers: attackerOrigin,
    })).status()).toBe(403);

    expect((await supporter.patch(requestDecisionPath, {
      data: { action: "review" },
      headers: origin,
    })).status()).toBe(200);

    const scheduledAt = new Date(Date.now() + 86_400_000).toISOString();
    const scheduled = await supporter.patch(requestDecisionPath, {
      data: { action: "schedule", scheduledAt },
      headers: origin,
    });
    expect(scheduled.status()).toBe(200);
    const scheduledPayload = await scheduled.json();
    problemSessionId = scheduledPayload.sessionId;
    expect(scheduledPayload.status).toBe("scheduled");

    const studentState = await student.get(studentPath);
    expect(studentState.status()).toBe(200);
    const state = await studentState.json() as {
      requests: Array<{ id: string; status: string }>;
      sessions: Array<{ id: string; status: string }>;
    };
    expect(state.requests.find((row) => row.id === requestId)?.status)
      .toBe("scheduled");
    expect(state.sessions.find((row) => row.id === problemSessionId)?.status)
      .toBe("scheduled");

    const sessionPath =
      `/api/course-team/assignments/${supporterTeamMemberId}/problem-solving/sessions/${problemSessionId}`;
    const held = await supporter.patch(sessionPath, {
      data: { status: "held" },
      headers: origin,
    });
    expect(held.status()).toBe(200);
    expect((await held.json()).status).toBe("held");

    await student.dispose();
    await otherStudent.dispose();
    await institute.dispose();
    await supporter.dispose();
    await otherSupporter.dispose();
    await counselor.dispose();
  });

  test("deactivation immediately closes both messaging and session capability", async () => {
    const institute = await client("institute");
    const student = await client("student");
    const supporter = await client("supporter");

    const removed = await institute.delete(
      `/api/institute/courses/${courseId}/team/${supporterTeamMemberId}`,
      { headers: origin },
    );
    expect(removed.status()).toBe(200);

    const studentConversation =
      `/api/student/courses/${courseId}/team/${supporterTeamMemberId}/conversation`;
    expect((await student.get(studentConversation)).status()).toBe(404);
    expect((await student.post(studentConversation, {
      data: { body: "نباید بعد از پایان assignment ارسال شود" },
      headers: origin,
    })).status()).toBe(404);

    const memberConversation =
      `/api/course-team/assignments/${supporterTeamMemberId}/conversations/${conversationId}`;
    expect((await supporter.get(memberConversation)).status()).toBe(404);
    expect((await supporter.post(memberConversation, {
      data: { body: "نباید بعد از پایان assignment پاسخ داده شود" },
      headers: origin,
    })).status()).toBe(404);

    expect((await student.get(
      `/api/student/courses/${courseId}/team/${supporterTeamMemberId}/problem-solving`,
    )).status()).toBe(404);

    const workspace = await supporter.get("/course-team", {
      maxRedirects: 0,
    });
    expect(workspace.status()).toBe(307);
    expect(workspace.headers().location).toBe("/account");

    const [row] = await db.select({
      requestsEnabled: courseTeamMembers.studentSessionRequestsEnabled,
    }).from(courseTeamMembers)
      .where(eq(courseTeamMembers.id, supporterTeamMemberId));
    expect(row.requestsEnabled).toBe(false);

    const reactivated = await institute.post(
      `/api/institute/courses/${courseId}/team`, {
        data: { memberUserId: users.supporter, role: "academic_supporter" },
        headers: origin,
      },
    );
    expect(reactivated.status()).toBe(201);
    expect((await reactivated.json()).teamMemberId).toBe(supporterTeamMemberId);
    const enabled = await institute.patch(
      `/api/institute/courses/${courseId}/team/${supporterTeamMemberId}`,
      { data: { enabled: true }, headers: origin },
    );
    expect(enabled.status()).toBe(200);

    const counselorConversation =
      `/api/student/courses/${courseId}/team/${counselorTeamMemberId}/conversation`;
    const problemSolvingPath =
      `/api/student/courses/${courseId}/team/${supporterTeamMemberId}/problem-solving`;
    const [messageDuringCancellation, requestDuringCancellation, cancelled] = await Promise.all([
      student.post(counselorConversation, {
        data: { body: "پیام هم‌زمان با لغو ثبت‌نام" }, headers: origin,
      }),
      student.post(problemSolvingPath, {
        data: {
          subject: "درخواست هم‌زمان با لغو ثبت‌نام",
          description: "برای حل تمرین به راهنمایی نیاز دارم.",
        }, headers: origin,
      }),
      student.post(`/api/student/courses/${courseId}/cancel`, {
        data: {}, headers: origin,
      }),
    ]);
    expect([201, 404]).toContain(messageDuringCancellation.status());
    expect([201, 404]).toContain(requestDuringCancellation.status());
    expect(cancelled.status()).toBe(200);
    const messagesAfterCancellation = await db.select({ id: courseConversationMessages.id })
      .from(courseConversationMessages).innerJoin(courseConversations,
        eq(courseConversations.id, courseConversationMessages.conversationId))
      .where(and(
        eq(courseConversations.studentUserId, users.student),
        eq(courseConversations.courseId, courseId),
      ));
    const requestsAfterCancellation = await db.select({ id: problemSolvingRequests.id })
      .from(problemSolvingRequests).where(and(
        eq(problemSolvingRequests.studentUserId, users.student),
        eq(problemSolvingRequests.courseId, courseId),
      ));
    expect((await student.post(counselorConversation, {
      data: { body: "پیام پس از لغو" }, headers: origin,
    })).status()).toBe(404);
    const messagesAfterDeniedRetry = await db.select({ id: courseConversationMessages.id })
      .from(courseConversationMessages).innerJoin(courseConversations,
        eq(courseConversations.id, courseConversationMessages.conversationId))
      .where(and(
        eq(courseConversations.studentUserId, users.student),
        eq(courseConversations.courseId, courseId),
      ));
    expect((await student.post(problemSolvingPath, {
      data: { subject: "درخواست پس از لغو" }, headers: origin,
    })).status()).toBe(404);
    const requestsAfterDeniedRetry = await db.select({ id: problemSolvingRequests.id })
      .from(problemSolvingRequests).where(and(
        eq(problemSolvingRequests.studentUserId, users.student),
        eq(problemSolvingRequests.courseId, courseId),
      ));
    expect(messagesAfterDeniedRetry.map((message) => message.id))
      .toEqual(messagesAfterCancellation.map((message) => message.id));
    expect(requestsAfterDeniedRetry.map((request) => request.id))
      .toEqual(requestsAfterCancellation.map((request) => request.id));

    await institute.dispose();
    await student.dispose();
    await supporter.dispose();
  });
});
