import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  coursePracticeQuestions, courses, memberships, privateMediaAssets,
  session, studentEnrollments, studentPracticeAttempts,
  supervisionEvents, supervisionGrants, studentVideoCompletions,
  studentVideoNotes, user, verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("free enrollment and private video access must stay course-scoped", () => {
  const db = getDb();
  const users = {
    admin: randomUUID(), provider: randomUUID(), institute: randomUUID(),
    student: randomUUID(), otherStudent: randomUUID(), stranger: randomUUID(),
  };
  const tokens = Object.fromEntries(
    Object.keys(users).map((name) => [name, randomUUID()]),
  ) as Record<keyof typeof users, string>;
  const providerId = randomUUID();
  const instituteId = randomUUID();
  const ids = { live: randomUUID(), pending: randomUUID(), draft: randomUUID() };
  const videoIds = {
    ready: randomUUID(), withdrawn: randomUUID(), pending: randomUUID(),
  };
  const mediaPath = (courseId: string, assetId: string) =>
    `/api/student/courses/${courseId}/media/${assetId}`;
  const progressPath = (courseId: string, assetId: string) =>
    `${mediaPath(courseId, assetId)}/completion`;
  const notePath = (courseId: string, assetId: string) =>
    `${mediaPath(courseId, assetId)}/note`;
  const practicePath = (courseId: string) =>
    `/api/student/courses/${courseId}/practice`;
  const authorPath = (courseId: string) =>
    `/api/provider/courses/${courseId}/practice`;
  const institutePracticePath = (courseId: string) =>
    `/api/institute/courses/${courseId}/practice`;
  const listAssets = (courseId: string) =>
    `/api/student/courses/${courseId}/assets`;
  const enrollPath = (courseId: string) =>
    `/api/student/courses/${courseId}/enroll`;
  const decisionPath = (courseId: string) =>
    `/api/institute/supervision/${courseId}/decision`;

  async function signed(as: keyof typeof users): Promise<string> {
    const text = await serializeSignedCookie(
      "better-auth.session_token", tokens[as], process.env.BETTER_AUTH_SECRET!,
    );
    return text.split(";")[0];
  }
  async function client(as?: keyof typeof users): Promise<APIRequestContext> {
    return request.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: as ? { Cookie: await signed(as) } : {},
    });
  }
  const post = (ctx: APIRequestContext, path: string, data: object) =>
    ctx.post(path, { data, headers: { Origin: "http://localhost:3000" } });

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id, name, email: `${id}@example.test`,
    })));
    await db.insert(verifiedEntities).values([
      { id: providerId, role: "provider", name: "verified provider",
        evidenceReference: "test/provider", verifiedByUserId: users.admin },
      { id: instituteId, role: "institute", name: "verified institute",
        evidenceReference: "test/institute", verifiedByUserId: users.admin },
    ]);
    await db.insert(memberships).values([
      { userId: users.admin, role: "admin" },
      { userId: users.provider, role: "provider", providerId },
      { userId: users.institute, role: "institute", instituteId },
      { userId: users.student, role: "student" },
      { userId: users.otherStudent, role: "student" },
    ]);
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(session).values(
      Object.entries(tokens).map(([name, token]) => ({
        userId: users[name as keyof typeof users], token, expiresAt,
      })),
    );
    await db.insert(courses).values([
      { id: ids.live, providerId, responsibleInstituteId: instituteId,
        title: "دوره رایگان با محتوای خصوصی", createdByProviderUserId: users.provider,
        clientRequestId: randomUUID() },
      { id: ids.pending, providerId, responsibleInstituteId: instituteId,
        title: "دوره بدون تایید مؤسسه", createdByProviderUserId: users.provider,
        clientRequestId: randomUUID() },
      { id: ids.draft, providerId, responsibleInstituteId: instituteId,
        title: "دوره تاییدشده اما منتشرنشده", createdByProviderUserId: users.provider,
        clientRequestId: randomUUID() },
    ]);
    await db.insert(supervisionGrants).values([
      ...[ids.live, ids.draft].map((courseId) => ({
        courseId, providerId, instituteId, status: "approved" as const,
        requestedByProviderUserId: users.provider,
        approvedByInstituteUserId: users.institute, approvedAt: new Date(),
      })),
      { courseId: ids.pending, providerId, instituteId, status: "requested",
        requestedByProviderUserId: users.provider },
    ]);
    await db.insert(privateMediaAssets).values([
      { id: videoIds.ready, courseId: ids.live, title: "بخش اول دوره",
        objectKey: `${ids.live}/${videoIds.ready}.mp4` },
      { id: videoIds.withdrawn, courseId: ids.live, title: "ویدئوی حذف‌شده",
        status: "withdrawn",
        objectKey: `${ids.live}/${videoIds.withdrawn}.mp4` },
      { id: videoIds.pending, courseId: ids.pending, title: "بخش محرمانه",
        objectKey: `${ids.pending}/${videoIds.pending}.mp4` },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(studentPracticeAttempts).where(inArray(
      studentPracticeAttempts.courseId, Object.values(ids),
    ));
    await db.delete(coursePracticeQuestions).where(inArray(
      coursePracticeQuestions.courseId, Object.values(ids),
    ));
    await db.delete(studentVideoNotes).where(inArray(
      studentVideoNotes.assetId, Object.values(videoIds),
    ));
    await db.delete(studentVideoCompletions).where(inArray(
      studentVideoCompletions.assetId, Object.values(videoIds),
    ));
    await db.delete(privateMediaAssets).where(
      inArray(privateMediaAssets.courseId, Object.values(ids)));
    await db.delete(studentEnrollments).where(
      inArray(studentEnrollments.courseId, Object.values(ids)));
    await db.delete(supervisionEvents).where(
      inArray(supervisionEvents.courseId, Object.values(ids)));
    await db.delete(supervisionGrants).where(
      inArray(supervisionGrants.courseId, Object.values(ids)));
    await db.delete(courses).where(inArray(courses.id, Object.values(ids)));
    await db.delete(memberships).where(
      inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities).where(
      inArray(verifiedEntities.id, [providerId, instituteId]));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("draft or merely requested courses never enter the free catalog", async ({ page }) => {
    const anonymous = await client();
    expect((await anonymous.get("/api/student/courses")).status()).toBe(401);
    expect((await anonymous.get("/api/student/progress")).status()).toBe(401);
    expect((await anonymous.get(practicePath(ids.live))).status()).toBe(401);
    expect((await post(anonymous, practicePath(ids.live), {
      selectedOption: 0,
    })).status()).toBe(401);
    expect((await post(anonymous, authorPath(ids.live), {
      prompt: "سؤال کوتاه آزمایشی", options: ["یک", "دو", "سه", "چهار"],
      correctOption: 0,
    })).status()).toBe(401);
    const noSessionProgress = await anonymous.get("/student/progress", {
      maxRedirects: 0,
    });
    expect(noSessionProgress.status()).toBe(307);
    expect(noSessionProgress.headers().location).toBe("/login");
    const anonymousHome = await anonymous.get("/student", { maxRedirects: 0 });
    expect(anonymousHome.status()).toBe(307);
    expect(anonymousHome.headers().location).toBe("/login");
    expect((await anonymous.get(listAssets(ids.live))).status()).toBe(401);
    expect((await anonymous.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(401);
    expect((await post(anonymous, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(401);
    expect((await anonymous.put(notePath(ids.live, videoIds.ready), {
      data: { note: "private" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(401);
    expect((await post(anonymous, enrollPath(ids.live), {})).status()).toBe(401);
    await anonymous.dispose();

    const provider = await client("provider");
    expect((await provider.get("/api/student/courses")).status()).toBe(403);
    expect((await provider.get("/student")).status()).toBe(404);
    expect((await provider.get("/student/progress")).status()).toBe(404);
    expect((await provider.get("/api/student/progress")).status()).toBe(403);
    expect((await provider.get(practicePath(ids.live))).status()).toBe(403);
    expect((await post(provider, enrollPath(ids.live), {})).status()).toBe(403);
    expect((await provider.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await post(provider, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(403);
    expect((await provider.put(notePath(ids.live, videoIds.ready), {
      data: { note: "foreign" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(403);
    expect((await post(provider, `/api/provider/courses/${ids.pending}/publication`,
      { action: "publish" })).status()).toBe(404);
    expect((await post(provider, `/api/provider/courses/${ids.draft}/publication`,
      { action: "publish" })).status()).toBe(404); // no ready video
    expect((await provider.post(
      `/api/provider/courses/${ids.live}/publication`, {
        data: { action: "publish" }, headers: { Origin: "https://attacker.invalid" },
      },
    )).status()).toBe(403);
    expect((await post(provider, `/api/provider/courses/${ids.live}/publication`,
      { action: "publish", status: "approved" })).status()).toBe(400);
    const author = {
      prompt: "کدام گزینه پاسخ این سؤال تمرینی در دوره دناست؟",
      options: ["پاسخ نادرست یک", "پاسخ نادرست دو",
        "پاسخ درست دوره", "پاسخ نادرست سه"],
      correctOption: 2,
    };
    expect((await post(provider, authorPath(ids.pending), author)).status())
      .toBe(404);
    expect((await post(provider, authorPath(ids.live), {
      ...author, correctOption: 4,
    })).status()).toBe(400);
    expect((await post(provider, authorPath(ids.live), {
      ...author, options: ["تکراری", "تکراری", "سه", "چهار"],
    })).status()).toBe(400);
    expect((await provider.post(authorPath(ids.live), {
      data: author, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    const providerCookie = await signed("provider");
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: providerCookie.split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false,
      sameSite: "Lax",
    }]);
    await page.goto(`http://localhost:3000/provider/courses/${ids.draft}/practice`);
    await expect(page.getByRole("heading", {
      name: "تمرین کوتاه: دوره تاییدشده اما منتشرنشده",
    })).toBeVisible();
    await page.getByRole("textbox", {
      name: "متن پرسش کوتاه",
    }).fill("تمرین سادهٔ دورهٔ پیش‌نویس کدام است؟");
    for (const [index, value] of [
      "گزینه اول", "گزینه دوم", "گزینه سوم", "گزینه چهارم",
    ].entries()) {
      await page.getByRole("textbox", {
        name: `گزینهٔ ${(index + 1).toLocaleString("fa-IR")}`,
      }).fill(value);
    }
    await page.getByRole("radio", {
      name: "گزینهٔ ۱ پاسخ درست است",
    }).check();
    const providerAnswer = page.waitForResponse((response) =>
      response.url().endsWith(authorPath(ids.draft)) &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", {
      name: "ثبت نهایی سؤال تمرینی",
    }).click();
    expect((await providerAnswer).status()).toBe(201);
    await expect(page.getByText(
      "سؤال تمرینی در پایگاه داده ثبت شد و دیگر قابل ویرایش نیست.",
    )).toBeVisible();
    await page.reload();
    await expect(page.getByText(
      "تمرین سادهٔ دورهٔ پیش‌نویس کدام است؟",
    )).toBeVisible();
    const createdQuestion = await post(provider, authorPath(ids.live), author);
    expect(createdQuestion.status()).toBe(201);
    expect(await createdQuestion.json()).toEqual({
      courseId: ids.live, created: true,
    });
    expect((await post(provider, authorPath(ids.live), author)).status())
      .toBe(409);
    const ownQuestion = await provider.get(authorPath(ids.live));
    expect(ownQuestion.status()).toBe(200);
    expect((await ownQuestion.json()).question).toMatchObject({
      prompt: author.prompt, correctOption: 2,
      reviewStatus: "pending", reviewReason: null,
    });
    expect((await provider.get(institutePracticePath(ids.live))).status())
      .toBe(403);
    expect((await post(provider, institutePracticePath(ids.live), {
      action: "approve",
      reason: "ارائه‌دهنده نباید بتواند سؤال تمرینی خودش را تأیید کند.",
    })).status()).toBe(403);
    const beforePublish = await client("student");
    expect((await beforePublish.get(practicePath(ids.live))).status()).toBe(404);
    await beforePublish.dispose();
    const blocked = await post(provider,
      `/api/provider/courses/${ids.live}/publication`, { action: "publish" });
    expect(blocked.status()).toBe(409);
    expect(await blocked.json()).toEqual({
      error: "practice_review_pending",
    });
    const institute = await client("institute");
    const review = await institute.get(institutePracticePath(ids.live));
    expect(review.status()).toBe(200);
    expect((await review.json()).question).toMatchObject({
      prompt: author.prompt, correctOption: 2,
      reviewStatus: "pending",
    });
    expect((await institute.post(institutePracticePath(ids.live), {
      data: { action: "approve", reason: "کوتاه" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(400);
    expect((await institute.post(institutePracticePath(ids.live), {
      data: {
        action: "approve",
        reason: "سؤال و پاسخ اعلام‌شده با محتوای همین دوره سازگار است.",
      },
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    await page.context().clearCookies();
    const instituteCookie = await signed("institute");
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: instituteCookie.split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false,
      sameSite: "Lax",
    }]);
    await page.goto(
      `http://localhost:3000/institute/courses/${ids.live}/practice`,
    );
    await expect(page.getByRole("heading", {
      name: "دوره رایگان با محتوای خصوصی",
    })).toBeVisible();
    await expect(page.getByText(author.prompt)).toBeVisible();
    await expect(page.getByText(
      "پاسخ درست دوره — پاسخ درست اعلام‌شده توسط ارائه‌دهنده",
    )).toBeVisible();
    await page.getByRole("textbox", {
      name: "دلیل تصمیم مؤسسه",
    }).fill("سؤال و پاسخ اعلام‌شده با محتوای همین دوره سازگار است.");
    const approvedResponse = page.waitForResponse((response) =>
      response.url().endsWith(institutePracticePath(ids.live)) &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "تأیید سؤال تمرینی" }).click();
    expect((await approvedResponse).status()).toBe(200);
    await expect(page.getByText(
      "تأییدشده برای نمایش به دانش‌آموز",
    )).toBeVisible();
    expect((await post(institute, institutePracticePath(ids.live), {
      action: "reject",
      reason: "تصمیم دوباره روی سؤال تمرینی نباید قابل ثبت باشد.",
    })).status()).toBe(409);
    await institute.dispose();
    const reviewedQuestion = await provider.get(authorPath(ids.live));
    expect((await reviewedQuestion.json()).question).toMatchObject({
      reviewStatus: "approved",
      reviewReason: "سؤال و پاسخ اعلام‌شده با محتوای همین دوره سازگار است.",
    });
    const first = await post(provider,
      `/api/provider/courses/${ids.live}/publication`, { action: "publish" });
    expect(first.status()).toBe(200);
    expect(await first.json()).toEqual({
      courseId: ids.live, publicationStatus: "published", replayed: false,
    });
    const retry = await post(provider,
      `/api/provider/courses/${ids.live}/publication`, { action: "publish" });
    expect((await retry.json()).replayed).toBe(true);
    expect((await post(provider, authorPath(ids.live), author)).status())
      .toBe(404);
    await provider.dispose();

    const student = await client("student");
    const listing = await student.get("/api/student/courses");
    expect(listing.headers()["cache-control"]).toContain("no-store");
    const ownListing = ((await listing.json()).courses as Array<{ courseId: string }>)
      .filter((row) => (Object.values(ids) as string[]).includes(row.courseId));
    expect(ownListing).toEqual([
      { courseId: ids.live, title: "دوره رایگان با محتوای خصوصی",
        providerId, responsibleInstituteId: instituteId,
        enrolled: false, free: true },
    ]);
    const beforeEnrollmentHome = await student.get("/student");
    expect(beforeEnrollmentHome.status()).toBe(200);
    expect(await beforeEnrollmentHome.text()).toContain("فعلاً دورهٔ قابل ادامه‌ای نداری");
    const emptyOverview = await student.get("/api/student/progress");
    expect(emptyOverview.status()).toBe(200);
    expect(emptyOverview.headers()["cache-control"]).toContain("no-store");
    expect(await emptyOverview.json()).toMatchObject({
      courses: [], hasMore: false,
      displayedReadyVideos: 0, displayedMarkedVideos: 0,
      displayedApprovedPractices: 0, displayedAnsweredPractices: 0,
    });
    const emptyProgressPage = await student.get("/student/progress");
    expect(emptyProgressPage.status()).toBe(200);
    expect(await emptyProgressPage.text()).toContain(
      "فعلاً دورهٔ قابل دسترسی برای پیگیری نداری",
    );
    expect((await student.get(listAssets(ids.live))).status()).toBe(404);
    expect((await student.get(practicePath(ids.live))).status()).toBe(404);
    expect((await post(student, practicePath(ids.live), {
      selectedOption: 2,
    })).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await post(student, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(404);
    expect((await student.put(notePath(ids.live, videoIds.ready), {
      data: { note: "not enrolled" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(404);
    expect((await post(student, enrollPath(ids.pending), {})).status()).toBe(404);
    expect((await post(student, enrollPath(ids.draft), {})).status()).toBe(404);
    await student.dispose();
  });

  test("pre-enrollment course detail exposes only currently supervised metadata", async () => {
    const api = (id: string) => `/api/student/courses/${id}`;
    const anonymous = await client();
    const provider = await client("provider");
    const student = await client("student");
    const other = await client("otherStudent");
    expect((await anonymous.get(api(ids.live))).status()).toBe(401);
    const anonPage = await anonymous.get(
      `/student/courses/${ids.live}`, { maxRedirects: 0 },
    );
    expect(anonPage.status()).toBe(307);
    expect(anonPage.headers().location).toBe("/login");
    expect((await provider.get(api(ids.live))).status()).toBe(403);
    expect((await provider.get(`/student/courses/${ids.live}`)).status())
      .toBe(404);
    for (const invalid of [ids.pending, ids.draft, randomUUID(), "invalid"]) {
      expect((await student.get(api(invalid))).status()).toBe(404);
      expect((await student.get(`/student/courses/${invalid}`)).status())
        .toBe(404);
    }
    const response = await student.get(api(ids.live));
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("private");
    expect(response.headers()["cache-control"]).toContain("no-store");
    const detail = await response.json();
    expect(detail).toMatchObject({
      courseId: ids.live,
      title: "دوره رایگان با محتوای خصوصی",
      providerName: "verified provider",
      responsibleInstituteName: "verified institute",
      readyVideoCount: 1,
      enrollmentStatus: null,
      free: true,
    });
    expect(detail.publishedAt).toBeTruthy();
    for (const forbidden of [
      videoIds.ready, videoIds.withdrawn, videoIds.pending,
      "بخش اول دوره", "ویدئوی حذف‌شده", "بخش محرمانه",
      "test/provider", "test/institute", users.admin,
      "objectKey", "studentUserId", "evidenceReference",
    ]) expect(JSON.stringify(detail)).not.toContain(forbidden);
    expect((await (await other.get(api(ids.live))).json())
      .enrollmentStatus).toBeNull();
    const page = await student.get(`/student/courses/${ids.live}`);
    expect(page.status()).toBe(200);
    const html = await page.text();
    expect(html).toContain("verified provider");
    expect(html).toContain("verified institute");
    expect(html).toContain("ثبت‌نام رایگان در همین دوره");
    expect(html).not.toContain("بخش اول دوره");
    expect(html).not.toContain(videoIds.ready);
    expect(html).not.toContain("test/provider");
    expect(html).not.toContain("test/institute");
    await anonymous.dispose();
    await provider.dispose();
    await student.dispose();
    await other.dispose();
  });

  test("catalog searches literal titles, filters own enrollment and pages beyond 50", async ({ page }) => {
    test.setTimeout(90_000); // 54 disposable PostgreSQL course/media fixtures + real browser.
    const extra = Array.from({ length: 52 }, (_, index) => ({
      courseId: randomUUID(),
      assetId: randomUUID(),
      title: `آزمایش صفحه‌بندی ${String(index).padStart(2, "0")}`,
    }));
    const special = [
      { courseId: randomUUID(), assetId: randomUUID(),
        title: "عنوان با نماد % ویژه" },
      { courseId: randomUUID(), assetId: randomUUID(),
        title: "عنوان با نماد _ ویژه" },
    ];
    const all = [...extra, ...special];
    await db.insert(courses).values(all.map((row) => ({
      id: row.courseId, title: row.title, providerId,
      responsibleInstituteId: instituteId, publicationStatus: "published" as const,
      createdByProviderUserId: users.provider,
      clientRequestId: randomUUID(), publishedAt: new Date(),
    })));
    await db.insert(supervisionGrants).values(all.map((row) => ({
      courseId: row.courseId, providerId, instituteId,
      status: "approved" as const,
      requestedByProviderUserId: users.provider,
      approvedByInstituteUserId: users.institute, approvedAt: new Date(),
    })));
    await db.insert(privateMediaAssets).values(all.map((row) => ({
      id: row.assetId, courseId: row.courseId,
      title: "ویدئوی آماده آزمایشی",
      objectKey: `${row.courseId}/${row.assetId}.mp4`,
    })));
    const student = await client("student");
    const other = await client("otherStudent");
    const catalog = (query: Record<string, string>) =>
      "/api/student/courses?" + new URLSearchParams(query);
    try {
      const seen = new Set<string>();
      let cursor: string | null = null;
      const pageSizes: number[] = [];
      for (let index = 0; index < 3; index += 1) {
        const response = await student.get(catalog({
          q: "آزمایش صفحه‌بندی",
          ...(cursor ? { cursor } : {}),
        }));
        expect(response.status()).toBe(200);
        expect(response.headers()["cache-control"]).toContain("no-store");
        const data = await response.json() as {
          courses: Array<{ courseId: string; title: string; enrolled: boolean }>;
          nextCursor: string | null;
        };
        pageSizes.push(data.courses.length);
        for (const row of data.courses) {
          expect(row.title).toContain("آزمایش صفحه‌بندی");
          expect(seen.has(row.courseId)).toBe(false);
          seen.add(row.courseId);
        }
        cursor = data.nextCursor;
        if (index < 2) expect(cursor).toBeTruthy();
        else expect(cursor).toBeNull();
      }
      expect(pageSizes).toEqual([20, 20, 12]);
      expect(seen.size).toBe(52);

      for (const [term, expected] of [
        ["%", special[0]], ["_", special[1]],
      ] as const) {
        const result = await student.get(catalog({ q: term }));
        expect(result.status()).toBe(200);
        const payload = await result.json();
        expect(payload.courses.map((row: { courseId: string }) =>
          row.courseId)).toEqual([expected.courseId]);
      }
      expect((await student.get(catalog({ q: "آزمایش صفحه‌بندی", mine: "1" }))
        .then((response) => response.json())).courses).toEqual([]);
      expect((await post(student, enrollPath(extra[0].courseId), {}))
        .status()).toBe(201);
      expect((await post(other, enrollPath(extra[1].courseId), {}))
        .status()).toBe(201);
      const mine = await (await student.get(catalog({
        q: "آزمایش صفحه‌بندی", mine: "1",
      }))).json();
      expect(mine.courses.map((row: { courseId: string }) => row.courseId))
        .toEqual([extra[0].courseId]);
      expect(mine.courses[0].enrolled).toBe(true);
      const noQuestionSummary = await (await student.get(
        "/api/student/progress",
      )).json();
      expect(noQuestionSummary.courses.find((course: {
        courseId: string;
      }) => course.courseId === extra[0].courseId).practice)
        .toEqual({ state: "not_available" });
      const theirs = await (await other.get(catalog({
        q: "آزمایش صفحه‌بندی", mine: "1",
      }))).json();
      expect(theirs.courses.map((row: { courseId: string }) => row.courseId))
        .toEqual([extra[1].courseId]);
      for (const invalid of [
        catalog({ q: "x".repeat(81) }),
        catalog({ mine: "true" }),
        catalog({ cursor: "not-valid!" }),
        catalog({ q: "متفاوت", cursor: Buffer.from(JSON.stringify({
          title: extra[0].title, id: extra[0].courseId,
          q: "آزمایش صفحه‌بندی", mine: false,
        })).toString("base64url") }),
      ]) {
        expect((await student.get(invalid)).status()).toBe(400);
      }

      const cookie = await signed("student");
      await page.context().addCookies([{
        name: "better-auth.session_token",
        value: cookie.split("=").slice(1).join("="),
        domain: "localhost", path: "/", httpOnly: true,
        secure: false, sameSite: "Lax",
      }]);
      await page.goto("http://localhost:3000/student/courses");
      await page.getByRole("searchbox", {
        name: "جست‌وجوی عنوان دوره",
      }).fill("آزمایش صفحه‌بندی");
      await page.getByRole("button", { name: "جست‌وجو" }).click();
      await expect(page.locator("ul > li").filter({
        hasText: "آزمایش صفحه‌بندی",
      })).toHaveCount(20);
      await page.getByRole("button", {
        name: "نمایش دوره‌های بیشتر",
      }).click();
      await expect(page.locator("ul > li").filter({
        hasText: "آزمایش صفحه‌بندی",
      })).toHaveCount(40);
      await page.getByRole("checkbox", {
        name: "فقط ثبت‌نام‌های من",
      }).check();
      await page.getByRole("button", { name: "جست‌وجو" }).click();
      await expect(page.locator("ul > li").filter({
        hasText: "آزمایش صفحه‌بندی",
      })).toHaveCount(1);
      await expect(page.getByRole("link", {
        name: "مشاهده محتوای دوره",
      })).toHaveCount(1);
      await page.getByRole("button", {
        name: "پاک‌کردن فیلترها",
      }).click();
      await expect(page.getByRole("searchbox", {
        name: "جست‌وجوی عنوان دوره",
      })).toHaveValue("");
    } finally {
      await student.dispose();
      await other.dispose();
      await db.delete(studentEnrollments).where(
        inArray(studentEnrollments.courseId, all.map((row) => row.courseId)),
      );
      await db.delete(privateMediaAssets).where(
        inArray(privateMediaAssets.courseId, all.map((row) => row.courseId)),
      );
      await db.delete(supervisionGrants).where(
        inArray(supervisionGrants.courseId, all.map((row) => row.courseId)),
      );
      await db.delete(courses).where(
        inArray(courses.id, all.map((row) => row.courseId)),
      );
    }
  });

  test("one free enrollment unlocks metadata and proxy bytes but never shares origin keys", async () => {
    const student = await client("student");
    expect((await post(student, enrollPath(ids.live), {
      role: "admin",
    })).status()).toBe(400);
    expect((await student.post(enrollPath(ids.live), {
      data: {}, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    const first = await post(student, enrollPath(ids.live), {});
    expect(first.status()).toBe(201);
    expect(await first.json()).toEqual({
      courseId: ids.live, enrolled: true, replayed: false, free: true,
    });
    const retry = await post(student, enrollPath(ids.live), {});
    expect(retry.status()).toBe(200);
    expect((await retry.json()).replayed).toBe(true);
    const existing = await db.select().from(studentEnrollments).where(and(
      eq(studentEnrollments.courseId, ids.live),
      eq(studentEnrollments.studentUserId, users.student),
    ));
    expect(existing).toHaveLength(1);
    const privatePractice = await student.get(practicePath(ids.live));
    expect(privatePractice.status()).toBe(200);
    expect(privatePractice.headers()["cache-control"]).toContain("private");
    const initialQuestion = await privatePractice.json();
    expect(initialQuestion.practice).toMatchObject({
      courseId: ids.live,
      prompt: "کدام گزینه پاسخ این سؤال تمرینی در دوره دناست؟",
      options: ["پاسخ نادرست یک", "پاسخ نادرست دو",
        "پاسخ درست دوره", "پاسخ نادرست سه"],
      attempt: null,
    });
    expect(JSON.stringify(initialQuestion)).not.toContain("correctOption");
    expect(JSON.stringify(initialQuestion)).not.toContain("authoredByProviderUserId");
    expect(JSON.stringify(initialQuestion)).not.toContain(users.otherStudent);
    const beforeAnswerSummary = await (await student.get(
      "/api/student/progress",
    )).json();
    expect(beforeAnswerSummary).toMatchObject({
      displayedApprovedPractices: 1, displayedAnsweredPractices: 0,
      courses: [expect.objectContaining({
        courseId: ids.live, practice: { state: "not_attempted" },
      })],
    });
    expect(JSON.stringify(beforeAnswerSummary)).not.toContain(
      "correctOption",
    );
    const firstNextStep = await (await student.get("/student/progress")).text();
    expect(firstNextStep).toContain("رفتن به نخستین ویدئوی بی‌علامت");
    expect(firstNextStep).toContain(
      `/student/courses/${ids.live}/watch#next-unmarked-video`,
    );
    const firstHome = await (await student.get("/student")).text();
    expect(firstHome).toContain("علامت‌خورده به انتخاب خودت");
    expect(firstHome).toContain("رفتن به نخستین ویدئوی بی‌علامت");
    expect(firstHome).not.toContain("correctOption");
    expect(firstHome).not.toContain("objectKey");
    // All self-marked videos and an unanswered approved question recommend
    // practice instead. Undo the marker to leave the shared fixture intact.
    expect((await post(student, progressPath(ids.live, videoIds.ready), {}))
      .status()).toBe(201);
    const nextPractice = await (await student.get("/student/progress")).text();
    expect(nextPractice).toContain("پاسخ به تمرین کوتاه تأییدشده");
    expect(nextPractice).toContain(
      `/student/courses/${ids.live}/watch#course-practice-heading`,
    );
    const nextHome = await (await student.get("/student")).text();
    expect(nextHome).toContain("پاسخ به تمرین کوتاه تأییدشده");
    expect(nextHome).toContain(
      `/student/courses/${ids.live}/watch#course-practice-heading`,
    );
    expect((await student.delete(progressPath(ids.live, videoIds.ready), {
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(200);
    expect((await post(student, practicePath(ids.live), {
      selectedOption: 4,
    })).status()).toBe(400);
    expect((await post(student, practicePath(ids.live), {
      selectedOption: 2, correct: true,
    })).status()).toBe(400);
    expect((await student.post(practicePath(ids.live), {
      data: { selectedOption: 2 },
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    const wrongAttempt = await post(student, practicePath(ids.live), {
      selectedOption: 1,
    });
    expect(wrongAttempt.status()).toBe(201);
    expect(await wrongAttempt.json()).toMatchObject({
      courseId: ids.live, selectedOption: 1,
      correct: false, replayed: false,
    });
    const retryAnswer = await post(student, practicePath(ids.live), {
      selectedOption: 2,
    });
    expect(retryAnswer.status()).toBe(200);
    expect(await retryAnswer.json()).toMatchObject({
      selectedOption: 1, correct: false, replayed: true,
    });
    expect((await (await student.get(practicePath(ids.live))).json())
      .practice.attempt).toMatchObject({
        selectedOption: 1, correct: false,
    });
    const ownPracticeRows = await db.select().from(studentPracticeAttempts)
      .where(eq(studentPracticeAttempts.studentUserId, users.student));
    expect(ownPracticeRows).toHaveLength(1);
    expect(ownPracticeRows[0].correct).toBe(false);
    const practiceProvider = await client("provider");
    const providerView = JSON.stringify(await (await practiceProvider.get(
      authorPath(ids.live),
    )).json());
    expect(providerView).toContain('"correctOption":2');
    expect(providerView).not.toContain(users.student);
    expect(providerView).not.toContain("selectedOption");
    expect(providerView).not.toContain("submittedAt");
    await practiceProvider.dispose();
    const otherPractice = await client("otherStudent");
    expect((await otherPractice.get(practicePath(ids.live))).status())
      .toBe(404);
    await otherPractice.dispose();
    const firstOverview = await student.get("/api/student/progress");
    expect(firstOverview.status()).toBe(200);
    expect(firstOverview.headers()["cache-control"]).toContain("private");
    const firstSummary = await firstOverview.json();
    expect(firstSummary.courses).toEqual([{
      courseId: ids.live, title: "دوره رایگان با محتوای خصوصی",
      readyVideos: 1, markedVideos: 0,
      practice: {
        state: "answered", selectedOption: 1, correct: false,
        submittedAt: expect.any(String),
      },
    }]);
    expect(firstSummary).toMatchObject({
      hasMore: false, displayedReadyVideos: 1, displayedMarkedVideos: 0,
      displayedApprovedPractices: 1, displayedAnsweredPractices: 1,
    });
    expect(firstSummary.courses[0].practice.submittedAt).toBe(
      ownPracticeRows[0].submittedAt.toISOString(),
    );
    expect(JSON.stringify(firstSummary)).not.toContain(users.student);
    expect(JSON.stringify(firstSummary)).not.toContain(videoIds.withdrawn);
    expect(JSON.stringify(firstSummary)).not.toContain("objectKey");
    expect(JSON.stringify(firstSummary)).not.toContain("correctOption");
    expect(JSON.stringify(firstSummary)).not.toContain(
      "پاسخ درست دوره",
    );
    expect(JSON.stringify(firstSummary)).not.toContain(
      "authoredByProviderUserId",
    );
    const practiceProgressHtml = await (await student.get(
      "/student/progress",
    )).text();
    expect(practiceProgressHtml).toContain("پاسخ همین تمرین درست نبود.");
    expect(practiceProgressHtml).toContain("رفتن به نخستین ویدئوی بی‌علامت");
    // Next SSR interleaves React comment boundaries between text nodes.
    // Exact participation counts are asserted in the JSON payload above.
    expect(practiceProgressHtml).toContain(
      "تمرین‌های چهارگزینه‌ای تأییدشده که خودت پاسخ داده‌ای",
    );
    expect(practiceProgressHtml).not.toContain("پاسخ درست دوره");
    const otherOverviewClient = await client("otherStudent");
    const otherSummary = await (await otherOverviewClient.get(
      "/api/student/progress",
    )).json();
    expect(otherSummary.courses).toHaveLength(0);
    expect(otherSummary.displayedApprovedPractices).toBe(0);
    expect(otherSummary.displayedAnsweredPractices).toBe(0);
    await otherOverviewClient.dispose();
    const dashboard = await student.get("/student");
    expect(dashboard.status()).toBe(200);
    const dashboardHtml = await dashboard.text();
    expect(dashboardHtml).toContain("دوره رایگان با محتوای خصوصی");
    expect(dashboardHtml).toContain("رفتن به نخستین ویدئوی بی‌علامت");
    expect(dashboardHtml).toContain("پاسخ تمرین کوتاه تو ثبت شده است.");
    expect(dashboardHtml).toContain(`/student/courses/${ids.live}/watch`);
    expect(dashboardHtml).not.toContain("دوره بدون تایید مؤسسه");
    expect(dashboardHtml).not.toContain(videoIds.withdrawn);
    expect(dashboardHtml).not.toContain("objectKey");
    const manifest = await student.get(listAssets(ids.live));
    expect(manifest.status()).toBe(200);
    const manifestText = await manifest.text();
    expect(manifestText).not.toContain("objectKey");
    expect(manifestText).not.toContain("private/");
    expect(manifestText).not.toContain(videoIds.withdrawn);
    expect(manifestText).toContain(videoIds.ready);
    expect((await manifest.json()).assets).toEqual([
      { assetId: videoIds.ready, title: "بخش اول دوره", completed: false, note: null },
    ]);
    const completionPath = progressPath(ids.live, videoIds.ready);
    expect((await post(student, completionPath, { completed: true })).status())
      .toBe(400);
    expect((await student.post(completionPath, {
      data: {}, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    for (const [courseId, assetId] of [
      [ids.live, videoIds.withdrawn],
      [ids.pending, videoIds.pending],
      [ids.live, videoIds.pending],
      [ids.live, randomUUID()],
    ]) {
      expect((await post(student, progressPath(courseId, assetId), {})).status())
        .toBe(404);
    }
    const marked = await post(student, completionPath, {});
    expect(marked.status()).toBe(201);
    expect(await marked.json()).toEqual({
      courseId: ids.live, assetId: videoIds.ready,
      completed: true, replayed: false,
    });
    const replayed = await post(student, completionPath, {});
    expect(replayed.status()).toBe(200);
    expect((await replayed.json()).replayed).toBe(true);
    const ownProgress = await (await student.get(listAssets(ids.live))).json();
    expect(ownProgress.assets[0].completed).toBe(true);
    const markedSummary = await (await student.get("/api/student/progress")).json();
    expect(markedSummary).toMatchObject({
      displayedReadyVideos: 1, displayedMarkedVideos: 1,
      courses: [expect.objectContaining({
        courseId: ids.live, readyVideos: 1, markedVideos: 1,
      })],
    });
    const privateOverviewHtml = await (await student.get("/student/progress")).text();
    expect(privateOverviewHtml).toContain("دوره رایگان با محتوای خصوصی");
    expect(privateOverviewHtml).toContain("ویدئوهایی که خودت انجام‌شده علامت زده‌ای");
    expect(privateOverviewHtml).toContain("مرور محتوای دوره");
    expect(privateOverviewHtml).not.toContain("#next-unmarked-video");
    const homeAfterMark = await (await student.get("/student")).text();
    expect(homeAfterMark).toContain("مرور محتوای دوره");
    expect(homeAfterMark).not.toContain("#next-unmarked-video");
    expect(privateOverviewHtml).not.toContain("objectKey");
    expect(privateOverviewHtml).not.toContain(videoIds.withdrawn);
    expect(JSON.stringify(ownProgress)).not.toContain("studentUserId");
    const ownNotePath = notePath(ids.live, videoIds.ready);
    const headers = { Origin: "http://localhost:3000" };
    for (const invalid of [
      {}, { note: "" }, { note: "   " },
      { note: "x".repeat(2001) }, { note: "private", role: "admin" },
      { note: "line\u0000break" },
    ]) {
      expect((await student.put(ownNotePath, {
        data: invalid, headers,
      })).status()).toBe(400);
    }
    expect((await student.put(ownNotePath, {
      data: { note: "unsafe origin" },
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    for (const [courseId, assetId] of [
      [ids.live, videoIds.withdrawn],
      [ids.pending, videoIds.pending],
      [ids.live, videoIds.pending],
      [ids.live, randomUUID()],
    ]) {
      expect((await student.put(notePath(courseId, assetId), {
        data: { note: "wrong course or asset" }, headers,
      })).status()).toBe(404);
    }
    const firstNote = await student.put(ownNotePath, {
      data: { note: "  نکته خصوصی ویدئو  " }, headers,
    });
    expect(firstNote.status()).toBe(200);
    expect(firstNote.headers()["cache-control"]).toContain("private");
    expect(await firstNote.json()).toEqual({
      courseId: ids.live, assetId: videoIds.ready,
      note: "نکته خصوصی ویدئو",
    });
    expect((await (await student.get(listAssets(ids.live))).json())
      .assets[0].note).toBe("نکته خصوصی ویدئو");
    expect(await (await student.get("/student/courses/" + ids.live + "/watch"))
      .text()).toContain("نکته خصوصی ویدئو");
    expect(await (await student.get("/student/progress")).text())
      .not.toContain("نکته خصوصی ویدئو");
    const editedNote = await student.put(ownNotePath, {
      data: { note: "ویرایش دوم یادداشت خصوصی" }, headers,
    });
    expect(editedNote.status()).toBe(200);
    const notes = await db.select().from(studentVideoNotes).where(and(
      eq(studentVideoNotes.studentUserId, users.student),
      eq(studentVideoNotes.assetId, videoIds.ready),
    ));
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe("ویرایش دوم یادداشت خصوصی");
    const privateOtherStudent = await client("otherStudent");
    expect((await privateOtherStudent.get(listAssets(ids.live))).status())
      .toBe(404);
    expect((await privateOtherStudent.put(ownNotePath, {
      data: { note: "attempted overwrite" }, headers,
    })).status()).toBe(404);
    await privateOtherStudent.dispose();
    const privateOtherProvider = await client("provider");
    expect((await privateOtherProvider.get("/student/courses/" + ids.live + "/watch"))
      .status()).toBe(404);
    await privateOtherProvider.dispose();
    expect((await student.delete(ownNotePath, {
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    expect((await student.delete(ownNotePath, { headers })).status()).toBe(200);
    expect((await student.delete(ownNotePath, { headers })).status()).toBe(200);
    expect((await (await student.get(listAssets(ids.live))).json())
      .assets[0].note).toBeNull();
    expect((await (await student.get(listAssets(ids.live))).json())
      .assets[0].completed).toBe(true);
    const completionRows = await db.select().from(studentVideoCompletions)
      .where(eq(studentVideoCompletions.assetId, videoIds.ready));
    expect(completionRows).toHaveLength(1);
    expect(completionRows[0].studentUserId).toBe(users.student);
    expect((await student.delete(completionPath, {
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    expect((await student.delete(completionPath, {
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(200);
    expect((await student.delete(completionPath, {
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(200);
    expect((await (await student.get(listAssets(ids.live))).json())
      .assets[0].completed).toBe(false);
    expect((await (await student.get("/api/student/progress")).json())
      .displayedMarkedVideos).toBe(0);
    expect((await student.get(listAssets(ids.pending))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, videoIds.withdrawn))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.pending, videoIds.pending))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, videoIds.pending))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, randomUUID()))).status()).toBe(404);

    const full = await student.get(mediaPath(ids.live, videoIds.ready));
    expect(full.status()).toBe(200);
    expect(full.headers()["content-type"]).toContain("video/mp4");
    expect(full.headers()["cache-control"]).toContain("no-store");
    expect(full.headers()["cross-origin-resource-policy"]).toBe("same-origin");
    expect(full.headers()["set-cookie"]).toBeUndefined();
    expect(full.headers()["location"]).toBeUndefined();
    expect((await full.body()).length).toBeGreaterThan(0);
    const partial = await student.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3" },
    });
    expect(partial.status()).toBe(206);
    expect(partial.headers()["content-range"]).toMatch(/^bytes 0-3\/\d+$/);
    expect((await partial.body()).length).toBe(4);

    // This test-only private origin deliberately returns a 206 for the wrong
    // bytes. The student proxy must not relay that inconsistent metadata.
    const testOrigin = await fetch(
      `http://127.0.0.1:4318/__test__/wrong-private-range/${ids.live}/${videoIds.ready}.mp4`,
      { method: "POST", headers: {
        Authorization: `Bearer ${process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN}`,
      } },
    );
    expect(testOrigin.status).toBe(200);
    expect((await student.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3" },
    })).status()).toBe(503);
    expect((await student.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3" },
    })).status()).toBe(206); // mock's one-shot corruption has cleared

    expect((await student.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3,6-8" },
    })).status()).toBe(416);
    expect((await student.head(mediaPath(ids.live, videoIds.ready))).status()).toBe(405);

    // Storage never accepts direct/browser requests without server-only Bearer.
    const direct = await fetch(
      `http://127.0.0.1:4318/private/${ids.live}/${videoIds.ready}.mp4`,
    );
    expect(direct.status).toBe(401);
    const other = await client("otherStudent");
    expect((await other.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await other.get(listAssets(ids.live))).status()).toBe(404);
    expect((await post(other, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(404);
    await other.dispose();
    await student.dispose();
  });

  test("real student UI enrolls, displays private URL and cancellation closes access", async ({ page }) => {
    const cookie = await signed("otherStudent");
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: cookie.split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false,
      sameSite: "Lax",
    }]);
    await page.goto("http://localhost:3000/student/courses");
    await expect(page.getByRole("heading", {
      name: "دوره‌های رایگان منتشرشده",
    })).toBeVisible();
    await expect(page.getByText("دوره رایگان با محتوای خصوصی")).toBeVisible();
    const ownCard = page.locator("li").filter({
      hasText: "دوره رایگان با محتوای خصوصی",
    });
    await ownCard.getByRole("link", {
      name: "جزئیات دوره و مؤسسهٔ مسئول",
    }).click();
    await expect(page).toHaveURL(
      new RegExp(`/student/courses/${ids.live}$`),
    );
    await expect(page.getByRole("heading", {
      name: "دوره رایگان با محتوای خصوصی",
    })).toBeVisible();
    await expect(page.getByText("verified provider")).toBeVisible();
    await expect(page.getByText("verified institute")).toBeVisible();
    await expect(page.getByText("بخش اول دوره")).toHaveCount(0);
    const enrolling = page.waitForResponse((response) =>
      response.url().endsWith(enrollPath(ids.live)) &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", {
      name: "ثبت‌نام رایگان در همین دوره",
    }).click();
    expect((await enrolling).status()).toBe(201);
    await expect(page).toHaveURL(
      new RegExp(`/student/courses/${ids.live}/watch$`),
    );
    await page.goto("http://localhost:3000/student");
    await expect(page.getByRole("heading", { name: "نمای کلی یادگیری" })).toBeVisible();
    await expect(page.getByRole("heading", {
      name: "دوره رایگان با محتوای خصوصی",
    })).toBeVisible();
    await page.getByRole("link", {
      name: "پیگیری ویدئوهای انجام‌شده",
    }).click();
    await expect(page).toHaveURL(/\/student\/progress$/);
    await expect(page.getByRole("heading", {
      name: "پیگیری شخصی به تفکیک دوره",
    })).toBeVisible();
    await expect(page.locator("li").filter({
      hasText: "دوره رایگان با محتوای خصوصی",
    })).toContainText("۰ از ۱ ویدئوی آماده");
    await expect(page.getByRole("link", {
      name: "رفتن به نخستین ویدئوی بی‌علامت",
    })).toHaveAttribute("href",
      `/student/courses/${ids.live}/watch#next-unmarked-video`);
    await page.getByRole("link", {
      name: "بازگشت به خانه دانش‌آموز",
    }).click();
    await expect(page).toHaveURL(/\/student$/);
    await page.getByRole("link", {
      name: "رفتن به نخستین ویدئوی بی‌علامت",
    }).click();
    await expect(page).toHaveURL(new RegExp(
      `/student/courses/${ids.live}/watch#next-unmarked-videoimport { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  coursePracticeQuestions, courses, memberships, privateMediaAssets,
  session, studentEnrollments, studentPracticeAttempts,
  supervisionEvents, supervisionGrants, studentVideoCompletions,
  studentVideoNotes, user, verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("free enrollment and private video access must stay course-scoped", () => {
  const db = getDb();
  const users = {
    admin: randomUUID(), provider: randomUUID(), institute: randomUUID(),
    student: randomUUID(), otherStudent: randomUUID(), stranger: randomUUID(),
  };
  const tokens = Object.fromEntries(
    Object.keys(users).map((name) => [name, randomUUID()]),
  ) as Record<keyof typeof users, string>;
  const providerId = randomUUID();
  const instituteId = randomUUID();
  const ids = { live: randomUUID(), pending: randomUUID(), draft: randomUUID() };
  const videoIds = {
    ready: randomUUID(), withdrawn: randomUUID(), pending: randomUUID(),
  };
  const mediaPath = (courseId: string, assetId: string) =>
    `/api/student/courses/${courseId}/media/${assetId}`;
  const progressPath = (courseId: string, assetId: string) =>
    `${mediaPath(courseId, assetId)}/completion`;
  const notePath = (courseId: string, assetId: string) =>
    `${mediaPath(courseId, assetId)}/note`;
  const practicePath = (courseId: string) =>
    `/api/student/courses/${courseId}/practice`;
  const authorPath = (courseId: string) =>
    `/api/provider/courses/${courseId}/practice`;
  const institutePracticePath = (courseId: string) =>
    `/api/institute/courses/${courseId}/practice`;
  const listAssets = (courseId: string) =>
    `/api/student/courses/${courseId}/assets`;
  const enrollPath = (courseId: string) =>
    `/api/student/courses/${courseId}/enroll`;
  const decisionPath = (courseId: string) =>
    `/api/institute/supervision/${courseId}/decision`;

  async function signed(as: keyof typeof users): Promise<string> {
    const text = await serializeSignedCookie(
      "better-auth.session_token", tokens[as], process.env.BETTER_AUTH_SECRET!,
    );
    return text.split(";")[0];
  }
  async function client(as?: keyof typeof users): Promise<APIRequestContext> {
    return request.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: as ? { Cookie: await signed(as) } : {},
    });
  }
  const post = (ctx: APIRequestContext, path: string, data: object) =>
    ctx.post(path, { data, headers: { Origin: "http://localhost:3000" } });

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id, name, email: `${id}@example.test`,
    })));
    await db.insert(verifiedEntities).values([
      { id: providerId, role: "provider", name: "verified provider",
        evidenceReference: "test/provider", verifiedByUserId: users.admin },
      { id: instituteId, role: "institute", name: "verified institute",
        evidenceReference: "test/institute", verifiedByUserId: users.admin },
    ]);
    await db.insert(memberships).values([
      { userId: users.admin, role: "admin" },
      { userId: users.provider, role: "provider", providerId },
      { userId: users.institute, role: "institute", instituteId },
      { userId: users.student, role: "student" },
      { userId: users.otherStudent, role: "student" },
    ]);
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(session).values(
      Object.entries(tokens).map(([name, token]) => ({
        userId: users[name as keyof typeof users], token, expiresAt,
      })),
    );
    await db.insert(courses).values([
      { id: ids.live, providerId, responsibleInstituteId: instituteId,
        title: "دوره رایگان با محتوای خصوصی", createdByProviderUserId: users.provider,
        clientRequestId: randomUUID() },
      { id: ids.pending, providerId, responsibleInstituteId: instituteId,
        title: "دوره بدون تایید مؤسسه", createdByProviderUserId: users.provider,
        clientRequestId: randomUUID() },
      { id: ids.draft, providerId, responsibleInstituteId: instituteId,
        title: "دوره تاییدشده اما منتشرنشده", createdByProviderUserId: users.provider,
        clientRequestId: randomUUID() },
    ]);
    await db.insert(supervisionGrants).values([
      ...[ids.live, ids.draft].map((courseId) => ({
        courseId, providerId, instituteId, status: "approved" as const,
        requestedByProviderUserId: users.provider,
        approvedByInstituteUserId: users.institute, approvedAt: new Date(),
      })),
      { courseId: ids.pending, providerId, instituteId, status: "requested",
        requestedByProviderUserId: users.provider },
    ]);
    await db.insert(privateMediaAssets).values([
      { id: videoIds.ready, courseId: ids.live, title: "بخش اول دوره",
        objectKey: `${ids.live}/${videoIds.ready}.mp4` },
      { id: videoIds.withdrawn, courseId: ids.live, title: "ویدئوی حذف‌شده",
        status: "withdrawn",
        objectKey: `${ids.live}/${videoIds.withdrawn}.mp4` },
      { id: videoIds.pending, courseId: ids.pending, title: "بخش محرمانه",
        objectKey: `${ids.pending}/${videoIds.pending}.mp4` },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(studentPracticeAttempts).where(inArray(
      studentPracticeAttempts.courseId, Object.values(ids),
    ));
    await db.delete(coursePracticeQuestions).where(inArray(
      coursePracticeQuestions.courseId, Object.values(ids),
    ));
    await db.delete(studentVideoNotes).where(inArray(
      studentVideoNotes.assetId, Object.values(videoIds),
    ));
    await db.delete(studentVideoCompletions).where(inArray(
      studentVideoCompletions.assetId, Object.values(videoIds),
    ));
    await db.delete(privateMediaAssets).where(
      inArray(privateMediaAssets.courseId, Object.values(ids)));
    await db.delete(studentEnrollments).where(
      inArray(studentEnrollments.courseId, Object.values(ids)));
    await db.delete(supervisionEvents).where(
      inArray(supervisionEvents.courseId, Object.values(ids)));
    await db.delete(supervisionGrants).where(
      inArray(supervisionGrants.courseId, Object.values(ids)));
    await db.delete(courses).where(inArray(courses.id, Object.values(ids)));
    await db.delete(memberships).where(
      inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities).where(
      inArray(verifiedEntities.id, [providerId, instituteId]));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("draft or merely requested courses never enter the free catalog", async ({ page }) => {
    const anonymous = await client();
    expect((await anonymous.get("/api/student/courses")).status()).toBe(401);
    expect((await anonymous.get("/api/student/progress")).status()).toBe(401);
    expect((await anonymous.get(practicePath(ids.live))).status()).toBe(401);
    expect((await post(anonymous, practicePath(ids.live), {
      selectedOption: 0,
    })).status()).toBe(401);
    expect((await post(anonymous, authorPath(ids.live), {
      prompt: "سؤال کوتاه آزمایشی", options: ["یک", "دو", "سه", "چهار"],
      correctOption: 0,
    })).status()).toBe(401);
    const noSessionProgress = await anonymous.get("/student/progress", {
      maxRedirects: 0,
    });
    expect(noSessionProgress.status()).toBe(307);
    expect(noSessionProgress.headers().location).toBe("/login");
    const anonymousHome = await anonymous.get("/student", { maxRedirects: 0 });
    expect(anonymousHome.status()).toBe(307);
    expect(anonymousHome.headers().location).toBe("/login");
    expect((await anonymous.get(listAssets(ids.live))).status()).toBe(401);
    expect((await anonymous.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(401);
    expect((await post(anonymous, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(401);
    expect((await anonymous.put(notePath(ids.live, videoIds.ready), {
      data: { note: "private" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(401);
    expect((await post(anonymous, enrollPath(ids.live), {})).status()).toBe(401);
    await anonymous.dispose();

    const provider = await client("provider");
    expect((await provider.get("/api/student/courses")).status()).toBe(403);
    expect((await provider.get("/student")).status()).toBe(404);
    expect((await provider.get("/student/progress")).status()).toBe(404);
    expect((await provider.get("/api/student/progress")).status()).toBe(403);
    expect((await provider.get(practicePath(ids.live))).status()).toBe(403);
    expect((await post(provider, enrollPath(ids.live), {})).status()).toBe(403);
    expect((await provider.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await post(provider, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(403);
    expect((await provider.put(notePath(ids.live, videoIds.ready), {
      data: { note: "foreign" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(403);
    expect((await post(provider, `/api/provider/courses/${ids.pending}/publication`,
      { action: "publish" })).status()).toBe(404);
    expect((await post(provider, `/api/provider/courses/${ids.draft}/publication`,
      { action: "publish" })).status()).toBe(404); // no ready video
    expect((await provider.post(
      `/api/provider/courses/${ids.live}/publication`, {
        data: { action: "publish" }, headers: { Origin: "https://attacker.invalid" },
      },
    )).status()).toBe(403);
    expect((await post(provider, `/api/provider/courses/${ids.live}/publication`,
      { action: "publish", status: "approved" })).status()).toBe(400);
    const author = {
      prompt: "کدام گزینه پاسخ این سؤال تمرینی در دوره دناست؟",
      options: ["پاسخ نادرست یک", "پاسخ نادرست دو",
        "پاسخ درست دوره", "پاسخ نادرست سه"],
      correctOption: 2,
    };
    expect((await post(provider, authorPath(ids.pending), author)).status())
      .toBe(404);
    expect((await post(provider, authorPath(ids.live), {
      ...author, correctOption: 4,
    })).status()).toBe(400);
    expect((await post(provider, authorPath(ids.live), {
      ...author, options: ["تکراری", "تکراری", "سه", "چهار"],
    })).status()).toBe(400);
    expect((await provider.post(authorPath(ids.live), {
      data: author, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    const providerCookie = await signed("provider");
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: providerCookie.split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false,
      sameSite: "Lax",
    }]);
    await page.goto(`http://localhost:3000/provider/courses/${ids.draft}/practice`);
    await expect(page.getByRole("heading", {
      name: "تمرین کوتاه: دوره تاییدشده اما منتشرنشده",
    })).toBeVisible();
    await page.getByRole("textbox", {
      name: "متن پرسش کوتاه",
    }).fill("تمرین سادهٔ دورهٔ پیش‌نویس کدام است؟");
    for (const [index, value] of [
      "گزینه اول", "گزینه دوم", "گزینه سوم", "گزینه چهارم",
    ].entries()) {
      await page.getByRole("textbox", {
        name: `گزینهٔ ${(index + 1).toLocaleString("fa-IR")}`,
      }).fill(value);
    }
    await page.getByRole("radio", {
      name: "گزینهٔ ۱ پاسخ درست است",
    }).check();
    const providerAnswer = page.waitForResponse((response) =>
      response.url().endsWith(authorPath(ids.draft)) &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", {
      name: "ثبت نهایی سؤال تمرینی",
    }).click();
    expect((await providerAnswer).status()).toBe(201);
    await expect(page.getByText(
      "سؤال تمرینی در پایگاه داده ثبت شد و دیگر قابل ویرایش نیست.",
    )).toBeVisible();
    await page.reload();
    await expect(page.getByText(
      "تمرین سادهٔ دورهٔ پیش‌نویس کدام است؟",
    )).toBeVisible();
    const createdQuestion = await post(provider, authorPath(ids.live), author);
    expect(createdQuestion.status()).toBe(201);
    expect(await createdQuestion.json()).toEqual({
      courseId: ids.live, created: true,
    });
    expect((await post(provider, authorPath(ids.live), author)).status())
      .toBe(409);
    const ownQuestion = await provider.get(authorPath(ids.live));
    expect(ownQuestion.status()).toBe(200);
    expect((await ownQuestion.json()).question).toMatchObject({
      prompt: author.prompt, correctOption: 2,
      reviewStatus: "pending", reviewReason: null,
    });
    expect((await provider.get(institutePracticePath(ids.live))).status())
      .toBe(403);
    expect((await post(provider, institutePracticePath(ids.live), {
      action: "approve",
      reason: "ارائه‌دهنده نباید بتواند سؤال تمرینی خودش را تأیید کند.",
    })).status()).toBe(403);
    const beforePublish = await client("student");
    expect((await beforePublish.get(practicePath(ids.live))).status()).toBe(404);
    await beforePublish.dispose();
    const blocked = await post(provider,
      `/api/provider/courses/${ids.live}/publication`, { action: "publish" });
    expect(blocked.status()).toBe(409);
    expect(await blocked.json()).toEqual({
      error: "practice_review_pending",
    });
    const institute = await client("institute");
    const review = await institute.get(institutePracticePath(ids.live));
    expect(review.status()).toBe(200);
    expect((await review.json()).question).toMatchObject({
      prompt: author.prompt, correctOption: 2,
      reviewStatus: "pending",
    });
    expect((await institute.post(institutePracticePath(ids.live), {
      data: { action: "approve", reason: "کوتاه" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(400);
    expect((await institute.post(institutePracticePath(ids.live), {
      data: {
        action: "approve",
        reason: "سؤال و پاسخ اعلام‌شده با محتوای همین دوره سازگار است.",
      },
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    await page.context().clearCookies();
    const instituteCookie = await signed("institute");
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: instituteCookie.split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false,
      sameSite: "Lax",
    }]);
    await page.goto(
      `http://localhost:3000/institute/courses/${ids.live}/practice`,
    );
    await expect(page.getByRole("heading", {
      name: "دوره رایگان با محتوای خصوصی",
    })).toBeVisible();
    await expect(page.getByText(author.prompt)).toBeVisible();
    await expect(page.getByText(
      "پاسخ درست دوره — پاسخ درست اعلام‌شده توسط ارائه‌دهنده",
    )).toBeVisible();
    await page.getByRole("textbox", {
      name: "دلیل تصمیم مؤسسه",
    }).fill("سؤال و پاسخ اعلام‌شده با محتوای همین دوره سازگار است.");
    const approvedResponse = page.waitForResponse((response) =>
      response.url().endsWith(institutePracticePath(ids.live)) &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "تأیید سؤال تمرینی" }).click();
    expect((await approvedResponse).status()).toBe(200);
    await expect(page.getByText(
      "تأییدشده برای نمایش به دانش‌آموز",
    )).toBeVisible();
    expect((await post(institute, institutePracticePath(ids.live), {
      action: "reject",
      reason: "تصمیم دوباره روی سؤال تمرینی نباید قابل ثبت باشد.",
    })).status()).toBe(409);
    await institute.dispose();
    const reviewedQuestion = await provider.get(authorPath(ids.live));
    expect((await reviewedQuestion.json()).question).toMatchObject({
      reviewStatus: "approved",
      reviewReason: "سؤال و پاسخ اعلام‌شده با محتوای همین دوره سازگار است.",
    });
    const first = await post(provider,
      `/api/provider/courses/${ids.live}/publication`, { action: "publish" });
    expect(first.status()).toBe(200);
    expect(await first.json()).toEqual({
      courseId: ids.live, publicationStatus: "published", replayed: false,
    });
    const retry = await post(provider,
      `/api/provider/courses/${ids.live}/publication`, { action: "publish" });
    expect((await retry.json()).replayed).toBe(true);
    expect((await post(provider, authorPath(ids.live), author)).status())
      .toBe(404);
    await provider.dispose();

    const student = await client("student");
    const listing = await student.get("/api/student/courses");
    expect(listing.headers()["cache-control"]).toContain("no-store");
    const ownListing = ((await listing.json()).courses as Array<{ courseId: string }>)
      .filter((row) => (Object.values(ids) as string[]).includes(row.courseId));
    expect(ownListing).toEqual([
      { courseId: ids.live, title: "دوره رایگان با محتوای خصوصی",
        providerId, responsibleInstituteId: instituteId,
        enrolled: false, free: true },
    ]);
    const beforeEnrollmentHome = await student.get("/student");
    expect(beforeEnrollmentHome.status()).toBe(200);
    expect(await beforeEnrollmentHome.text()).toContain("فعلاً دورهٔ قابل ادامه‌ای نداری");
    const emptyOverview = await student.get("/api/student/progress");
    expect(emptyOverview.status()).toBe(200);
    expect(emptyOverview.headers()["cache-control"]).toContain("no-store");
    expect(await emptyOverview.json()).toMatchObject({
      courses: [], hasMore: false,
      displayedReadyVideos: 0, displayedMarkedVideos: 0,
      displayedApprovedPractices: 0, displayedAnsweredPractices: 0,
    });
    const emptyProgressPage = await student.get("/student/progress");
    expect(emptyProgressPage.status()).toBe(200);
    expect(await emptyProgressPage.text()).toContain(
      "فعلاً دورهٔ قابل دسترسی برای پیگیری نداری",
    );
    expect((await student.get(listAssets(ids.live))).status()).toBe(404);
    expect((await student.get(practicePath(ids.live))).status()).toBe(404);
    expect((await post(student, practicePath(ids.live), {
      selectedOption: 2,
    })).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await post(student, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(404);
    expect((await student.put(notePath(ids.live, videoIds.ready), {
      data: { note: "not enrolled" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(404);
    expect((await post(student, enrollPath(ids.pending), {})).status()).toBe(404);
    expect((await post(student, enrollPath(ids.draft), {})).status()).toBe(404);
    await student.dispose();
  });

  test("pre-enrollment course detail exposes only currently supervised metadata", async () => {
    const api = (id: string) => `/api/student/courses/${id}`;
    const anonymous = await client();
    const provider = await client("provider");
    const student = await client("student");
    const other = await client("otherStudent");
    expect((await anonymous.get(api(ids.live))).status()).toBe(401);
    const anonPage = await anonymous.get(
      `/student/courses/${ids.live}`, { maxRedirects: 0 },
    );
    expect(anonPage.status()).toBe(307);
    expect(anonPage.headers().location).toBe("/login");
    expect((await provider.get(api(ids.live))).status()).toBe(403);
    expect((await provider.get(`/student/courses/${ids.live}`)).status())
      .toBe(404);
    for (const invalid of [ids.pending, ids.draft, randomUUID(), "invalid"]) {
      expect((await student.get(api(invalid))).status()).toBe(404);
      expect((await student.get(`/student/courses/${invalid}`)).status())
        .toBe(404);
    }
    const response = await student.get(api(ids.live));
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("private");
    expect(response.headers()["cache-control"]).toContain("no-store");
    const detail = await response.json();
    expect(detail).toMatchObject({
      courseId: ids.live,
      title: "دوره رایگان با محتوای خصوصی",
      providerName: "verified provider",
      responsibleInstituteName: "verified institute",
      readyVideoCount: 1,
      enrollmentStatus: null,
      free: true,
    });
    expect(detail.publishedAt).toBeTruthy();
    for (const forbidden of [
      videoIds.ready, videoIds.withdrawn, videoIds.pending,
      "بخش اول دوره", "ویدئوی حذف‌شده", "بخش محرمانه",
      "test/provider", "test/institute", users.admin,
      "objectKey", "studentUserId", "evidenceReference",
    ]) expect(JSON.stringify(detail)).not.toContain(forbidden);
    expect((await (await other.get(api(ids.live))).json())
      .enrollmentStatus).toBeNull();
    const page = await student.get(`/student/courses/${ids.live}`);
    expect(page.status()).toBe(200);
    const html = await page.text();
    expect(html).toContain("verified provider");
    expect(html).toContain("verified institute");
    expect(html).toContain("ثبت‌نام رایگان در همین دوره");
    expect(html).not.toContain("بخش اول دوره");
    expect(html).not.toContain(videoIds.ready);
    expect(html).not.toContain("test/provider");
    expect(html).not.toContain("test/institute");
    await anonymous.dispose();
    await provider.dispose();
    await student.dispose();
    await other.dispose();
  });

  test("catalog searches literal titles, filters own enrollment and pages beyond 50", async ({ page }) => {
    test.setTimeout(90_000); // 54 disposable PostgreSQL course/media fixtures + real browser.
    const extra = Array.from({ length: 52 }, (_, index) => ({
      courseId: randomUUID(),
      assetId: randomUUID(),
      title: `آزمایش صفحه‌بندی ${String(index).padStart(2, "0")}`,
    }));
    const special = [
      { courseId: randomUUID(), assetId: randomUUID(),
        title: "عنوان با نماد % ویژه" },
      { courseId: randomUUID(), assetId: randomUUID(),
        title: "عنوان با نماد _ ویژه" },
    ];
    const all = [...extra, ...special];
    await db.insert(courses).values(all.map((row) => ({
      id: row.courseId, title: row.title, providerId,
      responsibleInstituteId: instituteId, publicationStatus: "published" as const,
      createdByProviderUserId: users.provider,
      clientRequestId: randomUUID(), publishedAt: new Date(),
    })));
    await db.insert(supervisionGrants).values(all.map((row) => ({
      courseId: row.courseId, providerId, instituteId,
      status: "approved" as const,
      requestedByProviderUserId: users.provider,
      approvedByInstituteUserId: users.institute, approvedAt: new Date(),
    })));
    await db.insert(privateMediaAssets).values(all.map((row) => ({
      id: row.assetId, courseId: row.courseId,
      title: "ویدئوی آماده آزمایشی",
      objectKey: `${row.courseId}/${row.assetId}.mp4`,
    })));
    const student = await client("student");
    const other = await client("otherStudent");
    const catalog = (query: Record<string, string>) =>
      "/api/student/courses?" + new URLSearchParams(query);
    try {
      const seen = new Set<string>();
      let cursor: string | null = null;
      const pageSizes: number[] = [];
      for (let index = 0; index < 3; index += 1) {
        const response = await student.get(catalog({
          q: "آزمایش صفحه‌بندی",
          ...(cursor ? { cursor } : {}),
        }));
        expect(response.status()).toBe(200);
        expect(response.headers()["cache-control"]).toContain("no-store");
        const data = await response.json() as {
          courses: Array<{ courseId: string; title: string; enrolled: boolean }>;
          nextCursor: string | null;
        };
        pageSizes.push(data.courses.length);
        for (const row of data.courses) {
          expect(row.title).toContain("آزمایش صفحه‌بندی");
          expect(seen.has(row.courseId)).toBe(false);
          seen.add(row.courseId);
        }
        cursor = data.nextCursor;
        if (index < 2) expect(cursor).toBeTruthy();
        else expect(cursor).toBeNull();
      }
      expect(pageSizes).toEqual([20, 20, 12]);
      expect(seen.size).toBe(52);

      for (const [term, expected] of [
        ["%", special[0]], ["_", special[1]],
      ] as const) {
        const result = await student.get(catalog({ q: term }));
        expect(result.status()).toBe(200);
        const payload = await result.json();
        expect(payload.courses.map((row: { courseId: string }) =>
          row.courseId)).toEqual([expected.courseId]);
      }
      expect((await student.get(catalog({ q: "آزمایش صفحه‌بندی", mine: "1" }))
        .then((response) => response.json())).courses).toEqual([]);
      expect((await post(student, enrollPath(extra[0].courseId), {}))
        .status()).toBe(201);
      expect((await post(other, enrollPath(extra[1].courseId), {}))
        .status()).toBe(201);
      const mine = await (await student.get(catalog({
        q: "آزمایش صفحه‌بندی", mine: "1",
      }))).json();
      expect(mine.courses.map((row: { courseId: string }) => row.courseId))
        .toEqual([extra[0].courseId]);
      expect(mine.courses[0].enrolled).toBe(true);
      const noQuestionSummary = await (await student.get(
        "/api/student/progress",
      )).json();
      expect(noQuestionSummary.courses.find((course: {
        courseId: string;
      }) => course.courseId === extra[0].courseId).practice)
        .toEqual({ state: "not_available" });
      const theirs = await (await other.get(catalog({
        q: "آزمایش صفحه‌بندی", mine: "1",
      }))).json();
      expect(theirs.courses.map((row: { courseId: string }) => row.courseId))
        .toEqual([extra[1].courseId]);
      for (const invalid of [
        catalog({ q: "x".repeat(81) }),
        catalog({ mine: "true" }),
        catalog({ cursor: "not-valid!" }),
        catalog({ q: "متفاوت", cursor: Buffer.from(JSON.stringify({
          title: extra[0].title, id: extra[0].courseId,
          q: "آزمایش صفحه‌بندی", mine: false,
        })).toString("base64url") }),
      ]) {
        expect((await student.get(invalid)).status()).toBe(400);
      }

      const cookie = await signed("student");
      await page.context().addCookies([{
        name: "better-auth.session_token",
        value: cookie.split("=").slice(1).join("="),
        domain: "localhost", path: "/", httpOnly: true,
        secure: false, sameSite: "Lax",
      }]);
      await page.goto("http://localhost:3000/student/courses");
      await page.getByRole("searchbox", {
        name: "جست‌وجوی عنوان دوره",
      }).fill("آزمایش صفحه‌بندی");
      await page.getByRole("button", { name: "جست‌وجو" }).click();
      await expect(page.locator("ul > li").filter({
        hasText: "آزمایش صفحه‌بندی",
      })).toHaveCount(20);
      await page.getByRole("button", {
        name: "نمایش دوره‌های بیشتر",
      }).click();
      await expect(page.locator("ul > li").filter({
        hasText: "آزمایش صفحه‌بندی",
      })).toHaveCount(40);
      await page.getByRole("checkbox", {
        name: "فقط ثبت‌نام‌های من",
      }).check();
      await page.getByRole("button", { name: "جست‌وجو" }).click();
      await expect(page.locator("ul > li").filter({
        hasText: "آزمایش صفحه‌بندی",
      })).toHaveCount(1);
      await expect(page.getByRole("link", {
        name: "مشاهده محتوای دوره",
      })).toHaveCount(1);
      await page.getByRole("button", {
        name: "پاک‌کردن فیلترها",
      }).click();
      await expect(page.getByRole("searchbox", {
        name: "جست‌وجوی عنوان دوره",
      })).toHaveValue("");
    } finally {
      await student.dispose();
      await other.dispose();
      await db.delete(studentEnrollments).where(
        inArray(studentEnrollments.courseId, all.map((row) => row.courseId)),
      );
      await db.delete(privateMediaAssets).where(
        inArray(privateMediaAssets.courseId, all.map((row) => row.courseId)),
      );
      await db.delete(supervisionGrants).where(
        inArray(supervisionGrants.courseId, all.map((row) => row.courseId)),
      );
      await db.delete(courses).where(
        inArray(courses.id, all.map((row) => row.courseId)),
      );
    }
  });

  test("one free enrollment unlocks metadata and proxy bytes but never shares origin keys", async () => {
    const student = await client("student");
    expect((await post(student, enrollPath(ids.live), {
      role: "admin",
    })).status()).toBe(400);
    expect((await student.post(enrollPath(ids.live), {
      data: {}, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    const first = await post(student, enrollPath(ids.live), {});
    expect(first.status()).toBe(201);
    expect(await first.json()).toEqual({
      courseId: ids.live, enrolled: true, replayed: false, free: true,
    });
    const retry = await post(student, enrollPath(ids.live), {});
    expect(retry.status()).toBe(200);
    expect((await retry.json()).replayed).toBe(true);
    const existing = await db.select().from(studentEnrollments).where(and(
      eq(studentEnrollments.courseId, ids.live),
      eq(studentEnrollments.studentUserId, users.student),
    ));
    expect(existing).toHaveLength(1);
    const privatePractice = await student.get(practicePath(ids.live));
    expect(privatePractice.status()).toBe(200);
    expect(privatePractice.headers()["cache-control"]).toContain("private");
    const initialQuestion = await privatePractice.json();
    expect(initialQuestion.practice).toMatchObject({
      courseId: ids.live,
      prompt: "کدام گزینه پاسخ این سؤال تمرینی در دوره دناست؟",
      options: ["پاسخ نادرست یک", "پاسخ نادرست دو",
        "پاسخ درست دوره", "پاسخ نادرست سه"],
      attempt: null,
    });
    expect(JSON.stringify(initialQuestion)).not.toContain("correctOption");
    expect(JSON.stringify(initialQuestion)).not.toContain("authoredByProviderUserId");
    expect(JSON.stringify(initialQuestion)).not.toContain(users.otherStudent);
    const beforeAnswerSummary = await (await student.get(
      "/api/student/progress",
    )).json();
    expect(beforeAnswerSummary).toMatchObject({
      displayedApprovedPractices: 1, displayedAnsweredPractices: 0,
      courses: [expect.objectContaining({
        courseId: ids.live, practice: { state: "not_attempted" },
      })],
    });
    expect(JSON.stringify(beforeAnswerSummary)).not.toContain(
      "correctOption",
    );
    const firstNextStep = await (await student.get("/student/progress")).text();
    expect(firstNextStep).toContain("رفتن به نخستین ویدئوی بی‌علامت");
    expect(firstNextStep).toContain(
      `/student/courses/${ids.live}/watch#next-unmarked-video`,
    );
    const firstHome = await (await student.get("/student")).text();
    expect(firstHome).toContain("۰ از");
    expect(firstHome).toContain("رفتن به نخستین ویدئوی بی‌علامت");
    expect(firstHome).not.toContain("correctOption");
    expect(firstHome).not.toContain("objectKey");
    // All self-marked videos and an unanswered approved question recommend
    // practice instead. Undo the marker to leave the shared fixture intact.
    expect((await post(student, progressPath(ids.live, videoIds.ready), {}))
      .status()).toBe(201);
    const nextPractice = await (await student.get("/student/progress")).text();
    expect(nextPractice).toContain("پاسخ به تمرین کوتاه تأییدشده");
    expect(nextPractice).toContain(
      `/student/courses/${ids.live}/watch#course-practice-heading`,
    );
    const nextHome = await (await student.get("/student")).text();
    expect(nextHome).toContain("پاسخ به تمرین کوتاه تأییدشده");
    expect(nextHome).toContain(
      `/student/courses/${ids.live}/watch#course-practice-heading`,
    );
    expect((await student.delete(progressPath(ids.live, videoIds.ready), {
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(200);
    expect((await post(student, practicePath(ids.live), {
      selectedOption: 4,
    })).status()).toBe(400);
    expect((await post(student, practicePath(ids.live), {
      selectedOption: 2, correct: true,
    })).status()).toBe(400);
    expect((await student.post(practicePath(ids.live), {
      data: { selectedOption: 2 },
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    const wrongAttempt = await post(student, practicePath(ids.live), {
      selectedOption: 1,
    });
    expect(wrongAttempt.status()).toBe(201);
    expect(await wrongAttempt.json()).toMatchObject({
      courseId: ids.live, selectedOption: 1,
      correct: false, replayed: false,
    });
    const retryAnswer = await post(student, practicePath(ids.live), {
      selectedOption: 2,
    });
    expect(retryAnswer.status()).toBe(200);
    expect(await retryAnswer.json()).toMatchObject({
      selectedOption: 1, correct: false, replayed: true,
    });
    expect((await (await student.get(practicePath(ids.live))).json())
      .practice.attempt).toMatchObject({
        selectedOption: 1, correct: false,
    });
    const ownPracticeRows = await db.select().from(studentPracticeAttempts)
      .where(eq(studentPracticeAttempts.studentUserId, users.student));
    expect(ownPracticeRows).toHaveLength(1);
    expect(ownPracticeRows[0].correct).toBe(false);
    const practiceProvider = await client("provider");
    const providerView = JSON.stringify(await (await practiceProvider.get(
      authorPath(ids.live),
    )).json());
    expect(providerView).toContain('"correctOption":2');
    expect(providerView).not.toContain(users.student);
    expect(providerView).not.toContain("selectedOption");
    expect(providerView).not.toContain("submittedAt");
    await practiceProvider.dispose();
    const otherPractice = await client("otherStudent");
    expect((await otherPractice.get(practicePath(ids.live))).status())
      .toBe(404);
    await otherPractice.dispose();
    const firstOverview = await student.get("/api/student/progress");
    expect(firstOverview.status()).toBe(200);
    expect(firstOverview.headers()["cache-control"]).toContain("private");
    const firstSummary = await firstOverview.json();
    expect(firstSummary.courses).toEqual([{
      courseId: ids.live, title: "دوره رایگان با محتوای خصوصی",
      readyVideos: 1, markedVideos: 0,
      practice: {
        state: "answered", selectedOption: 1, correct: false,
        submittedAt: expect.any(String),
      },
    }]);
    expect(firstSummary).toMatchObject({
      hasMore: false, displayedReadyVideos: 1, displayedMarkedVideos: 0,
      displayedApprovedPractices: 1, displayedAnsweredPractices: 1,
    });
    expect(firstSummary.courses[0].practice.submittedAt).toBe(
      ownPracticeRows[0].submittedAt.toISOString(),
    );
    expect(JSON.stringify(firstSummary)).not.toContain(users.student);
    expect(JSON.stringify(firstSummary)).not.toContain(videoIds.withdrawn);
    expect(JSON.stringify(firstSummary)).not.toContain("objectKey");
    expect(JSON.stringify(firstSummary)).not.toContain("correctOption");
    expect(JSON.stringify(firstSummary)).not.toContain(
      "پاسخ درست دوره",
    );
    expect(JSON.stringify(firstSummary)).not.toContain(
      "authoredByProviderUserId",
    );
    const practiceProgressHtml = await (await student.get(
      "/student/progress",
    )).text();
    expect(practiceProgressHtml).toContain("پاسخ همین تمرین درست نبود.");
    expect(practiceProgressHtml).toContain("رفتن به نخستین ویدئوی بی‌علامت");
    // Next SSR interleaves React comment boundaries between text nodes.
    // Exact participation counts are asserted in the JSON payload above.
    expect(practiceProgressHtml).toContain(
      "تمرین‌های چهارگزینه‌ای تأییدشده که خودت پاسخ داده‌ای",
    );
    expect(practiceProgressHtml).not.toContain("پاسخ درست دوره");
    const otherOverviewClient = await client("otherStudent");
    const otherSummary = await (await otherOverviewClient.get(
      "/api/student/progress",
    )).json();
    expect(otherSummary.courses).toHaveLength(0);
    expect(otherSummary.displayedApprovedPractices).toBe(0);
    expect(otherSummary.displayedAnsweredPractices).toBe(0);
    await otherOverviewClient.dispose();
    const dashboard = await student.get("/student");
    expect(dashboard.status()).toBe(200);
    const dashboardHtml = await dashboard.text();
    expect(dashboardHtml).toContain("دوره رایگان با محتوای خصوصی");
    expect(dashboardHtml).toContain("رفتن به نخستین ویدئوی بی‌علامت");
    expect(dashboardHtml).toContain("پاسخ تمرین کوتاه تو ثبت شده است.");
    expect(dashboardHtml).toContain(`/student/courses/${ids.live}/watch`);
    expect(dashboardHtml).not.toContain("دوره بدون تایید مؤسسه");
    expect(dashboardHtml).not.toContain(videoIds.withdrawn);
    expect(dashboardHtml).not.toContain("objectKey");
    const manifest = await student.get(listAssets(ids.live));
    expect(manifest.status()).toBe(200);
    const manifestText = await manifest.text();
    expect(manifestText).not.toContain("objectKey");
    expect(manifestText).not.toContain("private/");
    expect(manifestText).not.toContain(videoIds.withdrawn);
    expect(manifestText).toContain(videoIds.ready);
    expect((await manifest.json()).assets).toEqual([
      { assetId: videoIds.ready, title: "بخش اول دوره", completed: false, note: null },
    ]);
    const completionPath = progressPath(ids.live, videoIds.ready);
    expect((await post(student, completionPath, { completed: true })).status())
      .toBe(400);
    expect((await student.post(completionPath, {
      data: {}, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    for (const [courseId, assetId] of [
      [ids.live, videoIds.withdrawn],
      [ids.pending, videoIds.pending],
      [ids.live, videoIds.pending],
      [ids.live, randomUUID()],
    ]) {
      expect((await post(student, progressPath(courseId, assetId), {})).status())
        .toBe(404);
    }
    const marked = await post(student, completionPath, {});
    expect(marked.status()).toBe(201);
    expect(await marked.json()).toEqual({
      courseId: ids.live, assetId: videoIds.ready,
      completed: true, replayed: false,
    });
    const replayed = await post(student, completionPath, {});
    expect(replayed.status()).toBe(200);
    expect((await replayed.json()).replayed).toBe(true);
    const ownProgress = await (await student.get(listAssets(ids.live))).json();
    expect(ownProgress.assets[0].completed).toBe(true);
    const markedSummary = await (await student.get("/api/student/progress")).json();
    expect(markedSummary).toMatchObject({
      displayedReadyVideos: 1, displayedMarkedVideos: 1,
      courses: [expect.objectContaining({
        courseId: ids.live, readyVideos: 1, markedVideos: 1,
      })],
    });
    const privateOverviewHtml = await (await student.get("/student/progress")).text();
    expect(privateOverviewHtml).toContain("دوره رایگان با محتوای خصوصی");
    expect(privateOverviewHtml).toContain("ویدئوهایی که خودت انجام‌شده علامت زده‌ای");
    expect(privateOverviewHtml).toContain("مرور محتوای دوره");
    expect(privateOverviewHtml).not.toContain("#next-unmarked-video");
    const homeAfterMark = await (await student.get("/student")).text();
    expect(homeAfterMark).toContain("مرور محتوای دوره");
    expect(homeAfterMark).not.toContain("#next-unmarked-video");
    expect(privateOverviewHtml).not.toContain("objectKey");
    expect(privateOverviewHtml).not.toContain(videoIds.withdrawn);
    expect(JSON.stringify(ownProgress)).not.toContain("studentUserId");
    const ownNotePath = notePath(ids.live, videoIds.ready);
    const headers = { Origin: "http://localhost:3000" };
    for (const invalid of [
      {}, { note: "" }, { note: "   " },
      { note: "x".repeat(2001) }, { note: "private", role: "admin" },
      { note: "line\u0000break" },
    ]) {
      expect((await student.put(ownNotePath, {
        data: invalid, headers,
      })).status()).toBe(400);
    }
    expect((await student.put(ownNotePath, {
      data: { note: "unsafe origin" },
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    for (const [courseId, assetId] of [
      [ids.live, videoIds.withdrawn],
      [ids.pending, videoIds.pending],
      [ids.live, videoIds.pending],
      [ids.live, randomUUID()],
    ]) {
      expect((await student.put(notePath(courseId, assetId), {
        data: { note: "wrong course or asset" }, headers,
      })).status()).toBe(404);
    }
    const firstNote = await student.put(ownNotePath, {
      data: { note: "  نکته خصوصی ویدئو  " }, headers,
    });
    expect(firstNote.status()).toBe(200);
    expect(firstNote.headers()["cache-control"]).toContain("private");
    expect(await firstNote.json()).toEqual({
      courseId: ids.live, assetId: videoIds.ready,
      note: "نکته خصوصی ویدئو",
    });
    expect((await (await student.get(listAssets(ids.live))).json())
      .assets[0].note).toBe("نکته خصوصی ویدئو");
    expect(await (await student.get("/student/courses/" + ids.live + "/watch"))
      .text()).toContain("نکته خصوصی ویدئو");
    expect(await (await student.get("/student/progress")).text())
      .not.toContain("نکته خصوصی ویدئو");
    const editedNote = await student.put(ownNotePath, {
      data: { note: "ویرایش دوم یادداشت خصوصی" }, headers,
    });
    expect(editedNote.status()).toBe(200);
    const notes = await db.select().from(studentVideoNotes).where(and(
      eq(studentVideoNotes.studentUserId, users.student),
      eq(studentVideoNotes.assetId, videoIds.ready),
    ));
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe("ویرایش دوم یادداشت خصوصی");
    const privateOtherStudent = await client("otherStudent");
    expect((await privateOtherStudent.get(listAssets(ids.live))).status())
      .toBe(404);
    expect((await privateOtherStudent.put(ownNotePath, {
      data: { note: "attempted overwrite" }, headers,
    })).status()).toBe(404);
    await privateOtherStudent.dispose();
    const privateOtherProvider = await client("provider");
    expect((await privateOtherProvider.get("/student/courses/" + ids.live + "/watch"))
      .status()).toBe(404);
    await privateOtherProvider.dispose();
    expect((await student.delete(ownNotePath, {
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    expect((await student.delete(ownNotePath, { headers })).status()).toBe(200);
    expect((await student.delete(ownNotePath, { headers })).status()).toBe(200);
    expect((await (await student.get(listAssets(ids.live))).json())
      .assets[0].note).toBeNull();
    expect((await (await student.get(listAssets(ids.live))).json())
      .assets[0].completed).toBe(true);
    const completionRows = await db.select().from(studentVideoCompletions)
      .where(eq(studentVideoCompletions.assetId, videoIds.ready));
    expect(completionRows).toHaveLength(1);
    expect(completionRows[0].studentUserId).toBe(users.student);
    expect((await student.delete(completionPath, {
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    expect((await student.delete(completionPath, {
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(200);
    expect((await student.delete(completionPath, {
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(200);
    expect((await (await student.get(listAssets(ids.live))).json())
      .assets[0].completed).toBe(false);
    expect((await (await student.get("/api/student/progress")).json())
      .displayedMarkedVideos).toBe(0);
    expect((await student.get(listAssets(ids.pending))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, videoIds.withdrawn))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.pending, videoIds.pending))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, videoIds.pending))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, randomUUID()))).status()).toBe(404);

    const full = await student.get(mediaPath(ids.live, videoIds.ready));
    expect(full.status()).toBe(200);
    expect(full.headers()["content-type"]).toContain("video/mp4");
    expect(full.headers()["cache-control"]).toContain("no-store");
    expect(full.headers()["cross-origin-resource-policy"]).toBe("same-origin");
    expect(full.headers()["set-cookie"]).toBeUndefined();
    expect(full.headers()["location"]).toBeUndefined();
    expect((await full.body()).length).toBeGreaterThan(0);
    const partial = await student.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3" },
    });
    expect(partial.status()).toBe(206);
    expect(partial.headers()["content-range"]).toMatch(/^bytes 0-3\/\d+$/);
    expect((await partial.body()).length).toBe(4);

    // This test-only private origin deliberately returns a 206 for the wrong
    // bytes. The student proxy must not relay that inconsistent metadata.
    const testOrigin = await fetch(
      `http://127.0.0.1:4318/__test__/wrong-private-range/${ids.live}/${videoIds.ready}.mp4`,
      { method: "POST", headers: {
        Authorization: `Bearer ${process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN}`,
      } },
    );
    expect(testOrigin.status).toBe(200);
    expect((await student.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3" },
    })).status()).toBe(503);
    expect((await student.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3" },
    })).status()).toBe(206); // mock's one-shot corruption has cleared

    expect((await student.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3,6-8" },
    })).status()).toBe(416);
    expect((await student.head(mediaPath(ids.live, videoIds.ready))).status()).toBe(405);

    // Storage never accepts direct/browser requests without server-only Bearer.
    const direct = await fetch(
      `http://127.0.0.1:4318/private/${ids.live}/${videoIds.ready}.mp4`,
    );
    expect(direct.status).toBe(401);
    const other = await client("otherStudent");
    expect((await other.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await other.get(listAssets(ids.live))).status()).toBe(404);
    expect((await post(other, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(404);
    await other.dispose();
    await student.dispose();
  });

  test("real student UI enrolls, displays private URL and cancellation closes access", async ({ page }) => {
    const cookie = await signed("otherStudent");
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: cookie.split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false,
      sameSite: "Lax",
    }]);
    await page.goto("http://localhost:3000/student/courses");
    await expect(page.getByRole("heading", {
      name: "دوره‌های رایگان منتشرشده",
    })).toBeVisible();
    await expect(page.getByText("دوره رایگان با محتوای خصوصی")).toBeVisible();
    const ownCard = page.locator("li").filter({
      hasText: "دوره رایگان با محتوای خصوصی",
    });
    await ownCard.getByRole("link", {
      name: "جزئیات دوره و مؤسسهٔ مسئول",
    }).click();
    await expect(page).toHaveURL(
      new RegExp(`/student/courses/${ids.live}$`),
    );
    await expect(page.getByRole("heading", {
      name: "دوره رایگان با محتوای خصوصی",
    })).toBeVisible();
    await expect(page.getByText("verified provider")).toBeVisible();
    await expect(page.getByText("verified institute")).toBeVisible();
    await expect(page.getByText("بخش اول دوره")).toHaveCount(0);
    const enrolling = page.waitForResponse((response) =>
      response.url().endsWith(enrollPath(ids.live)) &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", {
      name: "ثبت‌نام رایگان در همین دوره",
    }).click();
    expect((await enrolling).status()).toBe(201);
    await expect(page).toHaveURL(
      new RegExp(`/student/courses/${ids.live}/watch$`),
    );
    await page.goto("http://localhost:3000/student");
    await expect(page.getByRole("heading", { name: "نمای کلی یادگیری" })).toBeVisible();
    await expect(page.getByRole("heading", {
      name: "دوره رایگان با محتوای خصوصی",
    })).toBeVisible();
    await page.getByRole("link", {
      name: "پیگیری ویدئوهای انجام‌شده",
    }).click();
    await expect(page).toHaveURL(/\/student\/progress$/);
    await expect(page.getByRole("heading", {
      name: "پیگیری شخصی به تفکیک دوره",
    })).toBeVisible();
    await expect(page.locator("li").filter({
      hasText: "دوره رایگان با محتوای خصوصی",
    })).toContainText("۰ از ۱ ویدئوی آماده");
    await expect(page.getByRole("link", {
      name: "رفتن به نخستین ویدئوی بی‌علامت",
    })).toHaveAttribute("href",
      `/student/courses/${ids.live}/watch#next-unmarked-video`);
    await page.getByRole("link", {
      name: "بازگشت به خانه دانش‌آموز",
    }).click();
    await expect(page).toHaveURL(/\/student$/);
    await page.getByRole("link", {
      name: "رفتن به نخستین ویدئوی بی‌علامت",
    }).click();
,
    ));
    const player = page.locator("video");
    await expect(player).toHaveCount(1);
    await expect(player).toHaveAttribute("src",
      mediaPath(ids.live, videoIds.ready));
    await expect(page.locator("#next-unmarked-video")).toContainText(
      "بخش اول دوره",
    );
    await page.getByRole("link", {
      name: "رفتن به نخستین ویدئوی بی‌علامت",
    }).click();
    await expect(page).toHaveURL(/#next-unmarked-video$/);
    await expect(page.getByRole("heading", {
      name: "تمرین کوتاه این دوره",
    })).toBeVisible();
    expect(await page.locator("main").textContent()).not.toContain(
      "correctOption",
    );
    const practiceResponse = page.waitForResponse((response) =>
      response.url().endsWith(practicePath(ids.live)) &&
      response.request().method() === "POST",
    );
    await page.getByRole("radio", {
      name: "پاسخ درست دوره",
    }).check();
    await page.getByRole("button", {
      name: "ثبت نهایی پاسخ تمرین",
    }).click();
    expect((await practiceResponse).status()).toBe(201);
    await expect(page.getByText(
      "پاسخ این تمرین درست بود.", { exact: false },
    )).toBeVisible();
    await page.reload();
    await expect(page.getByText(
      "پاسخ این تمرین درست بود.", { exact: false },
    )).toBeVisible();
    await expect(page.getByRole("button", {
      name: "ثبت نهایی پاسخ تمرین",
    })).toHaveCount(0);
    const noteBox = page.getByRole("textbox", {
      name: "یادداشت شخصی برای بخش اول دوره",
    });
    await noteBox.fill("نکتهٔ شخصی مرورگر");
    const noteSaved = page.waitForResponse((response) =>
      response.url().endsWith(notePath(ids.live, videoIds.ready)) &&
      response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "ذخیره یادداشت شخصی" }).click();
    expect((await noteSaved).status()).toBe(200);
    await page.reload();
    await expect(page.getByRole("textbox", {
      name: "یادداشت شخصی برای بخش اول دوره",
    })).toHaveValue("نکتهٔ شخصی مرورگر");
    const noteRemoved = page.waitForResponse((response) =>
      response.url().endsWith(notePath(ids.live, videoIds.ready)) &&
      response.request().method() === "DELETE",
    );
    await page.getByRole("button", { name: "حذف یادداشت شخصی" }).click();
    expect((await noteRemoved).status()).toBe(200);
    await expect(page.getByRole("textbox", {
      name: "یادداشت شخصی برای بخش اول دوره",
    })).toHaveValue("");
    await expect(page.getByText("هنوز انجام‌شده علامت نخورده")).toBeVisible();
    const markResponse = page.waitForResponse((response) =>
      response.url().endsWith(progressPath(ids.live, videoIds.ready)) &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", {
      name: "علامت‌گذاری به‌عنوان انجام‌شده",
    }).click();
    expect((await markResponse).status()).toBe(201);
    await expect(page.getByText("به انتخاب شما انجام‌شده")).toBeVisible();
    await expect(page.locator("#next-unmarked-video")).toHaveCount(0);
    await expect(page.getByRole("link", {
      name: "رفتن به نخستین ویدئوی بی‌علامت",
    })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("به انتخاب شما انجام‌شده")).toBeVisible();
    await page.goto("http://localhost:3000/student/progress");
    const progressCard = page.locator("li").filter({
      hasText: "دوره رایگان با محتوای خصوصی",
    });
    await expect(progressCard).toContainText("۱ از ۱ ویدئوی آماده");
    await expect(progressCard).toContainText("پاسخ همین تمرین درست بود.");
    await expect(page.getByText(
      "تمرین‌های چهارگزینه‌ای تأییدشده که خودت پاسخ داده‌ای",
    )).toBeVisible();
    const otherProgress = await client("otherStudent");
    const otherProgressPayload = await (await otherProgress.get(
      "/api/student/progress",
    )).json();
    expect(otherProgressPayload.courses).toEqual([
      expect.objectContaining({
        courseId: ids.live,
        practice: expect.objectContaining({
          state: "answered", selectedOption: 2, correct: true,
        }),
      }),
    ]);
    expect(otherProgressPayload.displayedAnsweredPractices).toBe(1);
    await otherProgress.dispose();
    await page.getByRole("link", {
      name: "مرور محتوای دوره",
    }).click();
    await expect(page).toHaveURL(new RegExp(
      `/student/courses/${ids.live}/watch$`,
    ));
    const ownContext = await client("otherStudent");
    expect((await (await ownContext.get(listAssets(ids.live))).json())
      .assets[0].completed).toBe(true);
    await ownContext.dispose();
    const unmarkResponse = page.waitForResponse((response) =>
      response.url().endsWith(progressPath(ids.live, videoIds.ready)) &&
      response.request().method() === "DELETE",
    );
    await page.getByRole("button", {
      name: "برداشتن علامت انجام‌شده",
    }).click();
    expect((await unmarkResponse).status()).toBe(200);
    await expect(page.getByText("هنوز انجام‌شده علامت نخورده")).toBeVisible();
    const other = await client("otherStudent");
    expect((await other.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3" },
    })).status()).toBe(206);
    expect((await post(other, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(201);
    const ownNote = await other.put(notePath(ids.live, videoIds.ready), {
      data: { note: "یادداشت در زمان دسترسی" },
      headers: { Origin: "http://localhost:3000" },
    });
    expect(ownNote.status()).toBe(200);
    const firstStudent = await client("student");
    const firstStudentManifest = await (await firstStudent.get(
      listAssets(ids.live),
    )).json();
    expect(firstStudentManifest.assets[0].note).toBeNull();
    expect(JSON.stringify(firstStudentManifest))
      .not.toContain("یادداشت در زمان دسترسی");
    await firstStudent.dispose();
    expect((await post(other,
      `/api/student/courses/${ids.live}/cancel`, {})).status()).toBe(200);
    expect((await other.put(notePath(ids.live, videoIds.ready), {
      data: { note: "ویرایش نامجاز پس از انصراف" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(404);
    expect((await other.delete(notePath(ids.live, videoIds.ready), {
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(404);
    expect((await post(other, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(404);
    expect((await other.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await other.get(listAssets(ids.live))).status()).toBe(404);
    expect((await other.get(practicePath(ids.live))).status()).toBe(404);
    expect((await post(other, practicePath(ids.live), {
      selectedOption: 0,
    })).status()).toBe(404);
    const cancelledCourse = await (await other.get(
      `/api/student/courses/${ids.live}`,
    )).json();
    expect(cancelledCourse.enrollmentStatus).toBe("cancelled");
    expect(await (await other.get(
      `/student/courses/${ids.live}`,
    )).text()).toContain("ثبت‌نام این دوره قبلاً لغو شده است");
    expect((await (await other.get("/api/student/progress")).json())
      .courses).toHaveLength(0);
    expect(await (await other.get("/student/progress")).text()).not.toContain(
      "دوره رایگان با محتوای خصوصی",
    );
    const cancelledDashboard = await other.get("/student");
    expect(cancelledDashboard.status()).toBe(200);
    expect(await cancelledDashboard.text()).not.toContain(
      `/student/courses/${ids.live}/watch`,
    );
    expect((await post(other, enrollPath(ids.live), {})).status()).toBe(409);
    await page.reload();
    await expect(page).toHaveURL(/\/404|\/student\/courses/);
    await other.dispose();
  });

  test("a suspended student or revoked institute supervision blocks already enrolled video", async () => {
    const student = await client("student");
    await db.update(memberships).set({ status: "suspended" })
      .where(and(eq(memberships.userId, users.student),
        eq(memberships.role, "student")));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(401);
    const suspendedHome = await student.get("/student", { maxRedirects: 0 });
    expect(suspendedHome.status()).toBe(307);
    expect((await student.get(listAssets(ids.live))).status()).toBe(401);
    expect((await student.get("/api/student/progress")).status()).toBe(401);
    expect((await student.put(notePath(ids.live, videoIds.ready), {
      data: { note: "نکتهٔ دانش‌آموز معلق" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(401);
    const suspendedProgress = await student.get("/student/progress", {
      maxRedirects: 0,
    });
    expect(suspendedProgress.status()).toBe(307);
    expect((await post(student, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(401);
    expect((await post(student, enrollPath(ids.live), {})).status()).toBe(401);
    await db.update(memberships).set({ status: "active" })
      .where(and(eq(memberships.userId, users.student),
        eq(memberships.role, "student")));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(200);

    expect((await post(student, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(201);
    expect((await (await student.get("/api/student/progress")).json())
      .displayedMarkedVideos).toBe(1);
    const existingNote = await student.put(notePath(ids.live, videoIds.ready), {
      data: { note: "یادداشت فقط در دوره مجاز" },
      headers: { Origin: "http://localhost:3000" },
    });
    expect(existingNote.status()).toBe(200);
    await db.update(privateMediaAssets).set({ status: "withdrawn" })
      .where(eq(privateMediaAssets.id, videoIds.ready));
    expect((await student.get(practicePath(ids.live))).status()).toBe(404);
    expect((await student.put(notePath(ids.live, videoIds.ready), {
      data: { note: "پس از برداشتن ویدئو" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(404);
    expect((await (await student.get("/api/student/progress")).json())
      .courses).toHaveLength(0);
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await post(student, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(404);
    expect(((await (await student.get("/api/student/courses")).json())
      .courses as Array<{ courseId: string }>).filter((row) =>
        (Object.values(ids) as string[]).includes(row.courseId))).toHaveLength(0);
    expect((await post(student, enrollPath(ids.live), {})).status()).toBe(404);
    await db.update(privateMediaAssets).set({ status: "ready" })
      .where(eq(privateMediaAssets.id, videoIds.ready));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(200);
    expect((await (await student.get("/api/student/progress")).json())
      .displayedMarkedVideos).toBe(1);
    expect((await (await student.get(listAssets(ids.live))).json())
      .assets[0].note).toBe("یادداشت فقط در دوره مجاز");
    expect((await (await student.get(practicePath(ids.live))).json())
      .practice.attempt).toMatchObject({
        selectedOption: 1, correct: false,
      });

    // Supervision remains invalid when its *actual institute approver* or
    // course provider loses the associated active membership.
    await db.update(memberships).set({ status: "suspended" })
      .where(and(eq(memberships.userId, users.institute),
        eq(memberships.role, "institute")));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    await db.update(memberships).set({ status: "active" })
      .where(and(eq(memberships.userId, users.institute),
        eq(memberships.role, "institute")));
    await db.update(memberships).set({ status: "suspended" })
      .where(and(eq(memberships.userId, users.provider),
        eq(memberships.role, "provider")));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    await db.update(memberships).set({ status: "active" })
      .where(and(eq(memberships.userId, users.provider),
        eq(memberships.role, "provider")));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(200);

    const institute = await client("institute");
    const revoked = await post(institute, decisionPath(ids.live), {
      action: "revoke",
      reason: "نظارت مؤسسه بر دوره پایان یافت و دسترسی محتوای آن باید قطع شود.",
    });
    expect(revoked.status()).toBe(200);
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await student.get(`/api/student/courses/${ids.live}`)).status())
      .toBe(404);
    expect((await student.get(`/student/courses/${ids.live}`)).status())
      .toBe(404);
    expect((await student.get(listAssets(ids.live))).status()).toBe(404);
    expect((await student.get(practicePath(ids.live))).status()).toBe(404);
    expect((await post(student, practicePath(ids.live), {
      selectedOption: 2,
    })).status()).toBe(404);
    expect((await student.put(notePath(ids.live, videoIds.ready), {
      data: { note: "پس از لغو نظارت" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(404);
    expect((await (await student.get("/api/student/progress")).json())
      .courses).toHaveLength(0);
    expect(await (await student.get("/student/progress")).text()).not.toContain(
      "دوره رایگان با محتوای خصوصی",
    );
    expect((await post(student, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(404);
    const revokedDashboard = await student.get("/student");
    expect(revokedDashboard.status()).toBe(200);
    expect(await revokedDashboard.text()).not.toContain(
      `/student/courses/${ids.live}/watch`,
    );
    expect(((await (await student.get("/api/student/courses")).json())
      .courses as Array<{ courseId: string }>).filter((row) =>
        (Object.values(ids) as string[]).includes(row.courseId))).toHaveLength(0);
    expect((await post(student, enrollPath(ids.live), {})).status()).toBe(404);
    await institute.dispose();
    await student.dispose();
  });
  test("student can erase own retained notes after revoked supervision and cancelled enrollment", async ({ page }) => {
    const apiPath = "/api/student/private-notes";
    const origin = { Origin: "http://localhost:3000" };
    const confirmation = { confirm: "DELETE_ALL_MY_VIDEO_NOTES" };
    const anonymous = await client();
    const provider = await client("provider");
    const student = await client("student");
    const other = await client("otherStudent");

    expect((await anonymous.get(apiPath)).status()).toBe(401);
    expect((await anonymous.delete(apiPath, {
      data: confirmation, headers: origin,
    })).status()).toBe(401);
    expect((await provider.get(apiPath)).status()).toBe(403);
    expect((await provider.delete(apiPath, {
      data: confirmation, headers: origin,
    })).status()).toBe(403);
    expect((await provider.get("/student/privacy")).status()).toBe(404);

    const ownCount = await student.get(apiPath);
    expect(ownCount.status()).toBe(200);
    expect(ownCount.headers()["cache-control"]).toContain("private");
    expect(await ownCount.json()).toEqual({ noteCount: 1 });
    expect((await other.get(apiPath)).status()).toBe(200);
    expect(await (await other.get(apiPath)).json()).toEqual({ noteCount: 1 });

    const privacyHtml = await (await student.get("/student/privacy")).text();
    expect(privacyHtml).toContain("مدیریت و پاک‌کردن یادداشت‌های ویدئویی");
    expect(privacyHtml).not.toContain("یادداشت فقط در دوره مجاز");
    expect(privacyHtml).not.toContain(videoIds.ready);
    expect(privacyHtml).not.toContain("یادداشت در زمان دسترسی");

    for (const data of [
      {}, { confirm: "DELETE_ALL_MY_VIDEO_NOTES", userId: users.otherStudent },
      { confirm: "no" },
    ]) {
      expect((await student.delete(apiPath, {
        data, headers: origin,
      })).status()).toBe(400);
    }
    expect((await student.delete(apiPath, {
      data: confirmation,
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    expect(await (await student.get(apiPath)).json()).toEqual({ noteCount: 1 });

    const cookie = await signed("student");
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: cookie.split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false,
      sameSite: "Lax",
    }]);
    await page.goto("http://localhost:3000/student");
    await page.getByRole("link", { name: "مدیریت یادداشت‌های شخصی" }).click();
    await expect(page).toHaveURL(/\/student\/privacy$/);
    await expect(page.getByRole("heading", {
      name: "پاک‌کردن همهٔ یادداشت‌های شخصی",
    })).toBeVisible();
    const confirmButton = page.getByRole("button", {
      name: "حذف همه یادداشت‌ها",
    });
    const input = page.getByRole("textbox", {
      name: "برای تأیید، عبارت «حذف همه یادداشت‌ها» را دقیقاً وارد کن",
    });
    await expect(confirmButton).toBeDisabled();
    await input.fill("حذف یادداشت");
    await expect(confirmButton).toBeDisabled();
    await input.fill("حذف همه یادداشت‌ها");
    await expect(confirmButton).toBeEnabled();
    const deletedResponse = page.waitForResponse((response) =>
      response.url().endsWith(apiPath) &&
      response.request().method() === "DELETE",
    );
    await confirmButton.click();
    const deleted = await deletedResponse;
    expect(deleted.status()).toBe(200);
    expect(await deleted.json()).toEqual({ deleted: 1, noteCount: 0 });
    await expect(page.getByText(
      "یادداشت ویدئویی ذخیره‌شده‌ای برای پاک‌کردن باقی نمانده است.",
    )).toBeVisible();
    await page.reload();
    await expect(page.getByText(
      "یادداشت ویدئویی ذخیره‌شده‌ای برای پاک‌کردن باقی نمانده است.",
    )).toBeVisible();

    expect(await (await student.get(apiPath)).json()).toEqual({ noteCount: 0 });
    expect(await (await other.get(apiPath)).json()).toEqual({ noteCount: 1 });
    expect((await db.select().from(studentVideoNotes).where(
      eq(studentVideoNotes.studentUserId, users.student),
    ))).toHaveLength(0);
    expect((await db.select().from(studentVideoNotes).where(
      eq(studentVideoNotes.studentUserId, users.otherStudent),
    ))).toHaveLength(1);
    const [marker] = await db.select().from(studentVideoCompletions)
      .where(and(
        eq(studentVideoCompletions.studentUserId, users.student),
        eq(studentVideoCompletions.assetId, videoIds.ready),
      ));
    expect(marker).toBeDefined();

    const replay = await other.delete(apiPath, {
      data: confirmation, headers: origin,
    });
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toEqual({ deleted: 1, noteCount: 0 });
    const duplicate = await other.delete(apiPath, {
      data: confirmation, headers: origin,
    });
    expect(duplicate.status()).toBe(200);
    expect(await duplicate.json()).toEqual({ deleted: 0, noteCount: 0 });
    expect((await db.select().from(studentVideoNotes).where(
      inArray(studentVideoNotes.studentUserId, [
        users.student, users.otherStudent,
      ]),
    ))).toHaveLength(0);

    await anonymous.dispose();
    await provider.dispose();
    await student.dispose();
    await other.dispose();
  });

});
