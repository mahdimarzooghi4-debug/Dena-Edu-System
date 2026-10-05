import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  auditLogs, courseOwnershipEvents, courses, educatorInstituteAffiliationEvents,
  educatorInstituteAffiliations, independentEducatorProfiles, memberships,
  privateMediaAssets, session, studentEnrollments, supervisionGrants,
  user, verifiedEntities,
} from "../../src/db/schema";
import { hasStudentEntitlement } from "../../src/server/student/entitlement";
import { listStudentCatalog, readCatalogQuery } from "../../src/server/student/course-catalog";
import { getStudentCourseDetail } from "../../src/server/student/course-detail";

test.describe.configure({ mode: "serial" });

test.describe("independent educator institute affiliations", () => {
  const db = getDb();
  const users = {
    applicant: randomUUID(), instituteA: randomUUID(), instituteB: randomUUID(),
    outsider: randomUUID(), selfApplicant: randomUUID(),
  };
  const tokens = {
    applicant: randomUUID(), instituteA: randomUUID(), instituteB: randomUUID(),
    outsider: randomUUID(), selfApplicant: randomUUID(),
  };
  const institutes = { a: randomUUID(), b: randomUUID() };
  const ownedCourseId = randomUUID();
  const ownedAssetId = randomUUID();
  const requestIds = { a: randomUUID(), b: randomUUID(), self: randomUUID() };
  let affiliationA = "";
  let affiliationB = "";
  let selfAffiliation = "";
  let retryAffiliation = "";

  async function client(as?: keyof typeof tokens): Promise<APIRequestContext> {
    const cookie = as ? await serializeSignedCookie(
      "better-auth.session_token", tokens[as], process.env.BETTER_AUTH_SECRET!,
    ) : undefined;
    return request.newContext({ baseURL: "http://localhost:3000",
      extraHTTPHeaders: cookie ? { Cookie: cookie.split(";")[0] } : {} });
  }
  const post = (ctx: APIRequestContext, path: string, data: object, origin = "http://localhost:3000") =>
    ctx.post(path, { data, headers: { Origin: origin } });
  const apply = (instituteId: string, clientRequestId: string, displayName: string) => ({
    instituteId, clientRequestId, displayName,
    statement: "برای همکاری آموزشی مستقل با نام خودم درخواست بررسی دارم.",
  });
  const decisionPath = (id: string) => `/api/institute/educators/${id}/decision`;

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id], index) => ({
      id, name: `educator-${name}`,
      email: `${id}@independent-educator.example.test`,
      phoneNumber: `+9891200000${String(index).padStart(2, "0")}`,
      phoneNumberVerified: true,
    })));
    await db.insert(verifiedEntities).values([
      { id: institutes.a, role: "institute", name: "مؤسسهٔ آلفا",
        evidenceReference: "test/educator-institute-a", verifiedByUserId: users.instituteA },
      { id: institutes.b, role: "institute", name: "مؤسسهٔ بتا",
        evidenceReference: "test/educator-institute-b", verifiedByUserId: users.instituteB },
    ]);
    await db.insert(memberships).values([
      { userId: users.applicant, role: "student" },
      { userId: users.selfApplicant, role: "student" },
      { userId: users.selfApplicant, role: "institute", instituteId: institutes.a },
      { userId: users.instituteA, role: "institute", instituteId: institutes.a },
      { userId: users.instituteB, role: "institute", instituteId: institutes.b },
      { userId: users.outsider, role: "student" },
    ]);
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(session).values(Object.entries(tokens).map(([name, token]) => ({
      userId: users[name as keyof typeof users], token, expiresAt,
    })));
  });

  test.afterAll(async () => {
    await db.delete(courseOwnershipEvents).where(eq(courseOwnershipEvents.courseId, ownedCourseId));
    await db.delete(studentEnrollments).where(eq(studentEnrollments.courseId, ownedCourseId));
    await db.delete(privateMediaAssets).where(eq(privateMediaAssets.courseId, ownedCourseId));
    await db.delete(supervisionGrants).where(eq(supervisionGrants.courseId, ownedCourseId));
    await db.delete(courses).where(eq(courses.id, ownedCourseId));
    const profileIds = await db.select({ id: independentEducatorProfiles.id })
      .from(independentEducatorProfiles)
      .where(inArray(independentEducatorProfiles.userId, Object.values(users)));
    const affiliationIds = profileIds.length
      ? await db.select({ id: educatorInstituteAffiliations.id })
        .from(educatorInstituteAffiliations)
        .where(inArray(educatorInstituteAffiliations.educatorProfileId,
          profileIds.map((item) => item.id)))
      : [];
    const ids = affiliationIds.map((item) => item.id);
    if (ids.length) {
      await db.delete(educatorInstituteAffiliationEvents)
        .where(inArray(educatorInstituteAffiliationEvents.affiliationId, ids));
      await db.delete(auditLogs).where(and(
        eq(auditLogs.entityType, "EDUCATOR_AFFILIATION"), inArray(auditLogs.entityId, ids),
      ));
      await db.delete(educatorInstituteAffiliations)
        .where(inArray(educatorInstituteAffiliations.id, ids));
    }
    await db.delete(independentEducatorProfiles)
      .where(inArray(independentEducatorProfiles.userId, Object.values(users)));
    await db.delete(auditLogs).where(inArray(auditLogs.actorId, Object.values(users)));
    await db.delete(session).where(inArray(session.userId, Object.values(users)));
    await db.delete(memberships).where(inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities).where(inArray(verifiedEntities.id, Object.values(institutes)));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("supports multi-institute requests with institute-scoped decisions and lifecycle", async ({ page }) => {
    const anonymous = await client();
    expect((await anonymous.get("/api/independent-educator/affiliations")).status()).toBe(401);
    expect((await post(anonymous, "/api/independent-educator/affiliations",
      apply(institutes.a, randomUUID(), "همکار آزمایشی"))).status()).toBe(401);
    await anonymous.dispose();

    const applicant = await client("applicant");
    const badOrigin = await post(applicant, "/api/independent-educator/affiliations",
      apply(institutes.a, randomUUID(), "همکار آزمایشی"), "https://attacker.invalid");
    expect(badOrigin.status()).toBe(403);
    expect((await post(applicant, "/api/independent-educator/affiliations", {
      ...apply(institutes.a, randomUUID(), "همکار آزمایشی"), userId: users.outsider,
    })).status()).toBe(400);

    const first = await post(applicant, "/api/independent-educator/affiliations",
      apply(institutes.a, requestIds.a, "برند مستقل آوا"));
    expect(first.status()).toBe(201);
    affiliationA = (await first.json() as { id: string }).id;
    const replay = await post(applicant, "/api/independent-educator/affiliations",
      apply(institutes.a, requestIds.a, "برند مستقل آوا"));
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toMatchObject({ id: affiliationA, status: "requested", replayed: true });

    const second = await post(applicant, "/api/independent-educator/affiliations",
      apply(institutes.b, requestIds.b, "برند مستقل آوا"));
    expect(second.status()).toBe(201);
    affiliationB = (await second.json() as { id: string }).id;

    const instituteA = await client("instituteA");
    const instituteB = await client("instituteB");
    const aQueue = await (await instituteA.get("/api/institute/educators")).json() as {
      affiliations: Array<{ id: string; instituteId: string }>;
    };
    expect(aQueue.affiliations.map((item) => item.id)).toContain(affiliationA);
    expect(aQueue.affiliations.map((item) => item.id)).not.toContain(affiliationB);
    const bQueue = await (await instituteB.get("/api/institute/educators")).json() as {
      affiliations: Array<{ id: string; instituteId: string }>;
    };
    expect(bQueue.affiliations.map((item) => item.id)).toEqual([affiliationB]);
    expect((await instituteB.post(decisionPath(affiliationA), {
      data: { action: "approve", reason: "پذیرش درخواست برای آزمون scope" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(403);

    const selfApplicant = await client("selfApplicant");
    const selfRequest = await post(selfApplicant, "/api/independent-educator/affiliations",
      apply(institutes.a, requestIds.self, "متقاضی همزمان مؤسسه"));
    expect(selfRequest.status()).toBe(201);
    selfAffiliation = (await selfRequest.json() as { id: string }).id;
    expect((await post(selfApplicant, decisionPath(selfAffiliation), {
      action: "approve", reason: "نباید درخواست خود را بررسی کند",
    })).status()).toBe(403);

    expect((await post(instituteA, decisionPath(affiliationA), {
      action: "approve", reason: "اطلاعات معرفی بررسی و همکاری با مؤسسه پذیرفته شد.",
    })).status()).toBe(200);
    expect((await post(instituteB, decisionPath(affiliationB), {
      action: "reject", reason: "این درخواست در حال حاضر با برنامهٔ مؤسسه همخوان نیست.",
    })).status()).toBe(200);

    const [profile] = await db.select().from(independentEducatorProfiles)
      .where(eq(independentEducatorProfiles.userId, users.applicant));
    expect(profile?.displayName).toBe("برند مستقل آوا");
    const approvedAt = new Date();
    await db.insert(courses).values({
      id: ownedCourseId,
      ownerType: "independent_educator",
      independentEducatorProfileId: profile!.id,
      responsibleInstituteId: institutes.a,
      title: "دورهٔ آزمایشی همکار مستقل",
      publicationStatus: "published",
      publishedAt: approvedAt,
      createdByProviderUserId: users.applicant,
      clientRequestId: randomUUID(),
    });
    await db.insert(supervisionGrants).values({
      courseId: ownedCourseId,
      ownerType: "independent_educator",
      independentEducatorProfileId: profile!.id,
      instituteId: institutes.a,
      requestedByProviderUserId: users.applicant,
      status: "approved",
      approvedByInstituteUserId: users.instituteA,
      approvedAt,
    });
    await db.insert(privateMediaAssets).values({
      id: ownedAssetId,
      courseId: ownedCourseId,
      title: "درس آزمایشی",
      objectKey: `${ownedCourseId}/${ownedAssetId}.mp4`,
      status: "ready",
    });
    await db.insert(studentEnrollments).values({
      courseId: ownedCourseId, studentUserId: users.outsider,
    });
    expect(await hasStudentEntitlement(users.outsider, ownedCourseId)).toBe(true);
    const preTransferCatalog = await listStudentCatalog(
      users.outsider, readCatalogQuery(new URLSearchParams("mine=1")),
    );
    expect(preTransferCatalog.courses.some((course) =>
      course.courseId === ownedCourseId && course.ownerType === "independent_educator" &&
      course.independentEducatorName === "برند مستقل آوا")).toBe(true);
    expect(await getStudentCourseDetail(users.outsider, ownedCourseId)).toMatchObject({
      courseId: ownedCourseId, ownerType: "independent_educator",
      independentEducatorName: "برند مستقل آوا",
    });
    const providerMemberships = await db.select().from(memberships).where(and(
      eq(memberships.userId, users.applicant), eq(memberships.role, "provider"),
    ));
    expect(providerMemberships).toHaveLength(0);
    const [entity] = await db.select().from(verifiedEntities)
      .where(eq(verifiedEntities.id, profile!.id));
    expect(entity).toBeUndefined();
    const records = await db.select().from(educatorInstituteAffiliations)
      .where(inArray(educatorInstituteAffiliations.id, [affiliationA, affiliationB]));
    expect(records.find((item) => item.id === affiliationA)?.status).toBe("approved");
    expect(records.find((item) => item.id === affiliationB)?.status).toBe("rejected");

    const [signed] = (await serializeSignedCookie(
      "better-auth.session_token", tokens.applicant, process.env.BETTER_AUTH_SECRET!,
    )).split(";");
    const cookieValue = signed!.split("=").slice(1).join("=");
    await page.context().addCookies([{
      name: "better-auth.session_token", value: cookieValue,
      domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax",
    }]);
    await page.goto("http://localhost:3000/account/independent-educator");
    await expect(page.getByRole("heading", { name: "همکاری با مؤسسه‌های تأییدشده" })).toBeVisible();
    await expect(page.getByText("همکار مستقل · نشان نارنجی")).toBeVisible();
    expect((await post(instituteA, decisionPath(affiliationA), {
      action: "revoke", reason: "پایان همکاری به درخواست و تصمیم مؤسسه ثبت شد.",
    })).status()).toBe(200);
    const [transferredCourse] = await db.select().from(courses)
      .where(eq(courses.id, ownedCourseId));
    expect(transferredCourse).toMatchObject({
      ownerType: "institute", providerId: null,
      independentEducatorProfileId: null,
      responsibleInstituteId: institutes.a,
      publicationStatus: "published",
    });
    const [transferredGrant] = await db.select().from(supervisionGrants)
      .where(eq(supervisionGrants.courseId, ownedCourseId));
    expect(transferredGrant).toMatchObject({
      ownerType: "institute", providerId: null,
      independentEducatorProfileId: null, instituteId: institutes.a,
      status: "approved",
    });
    expect(await hasStudentEntitlement(users.outsider, ownedCourseId)).toBe(true);
    const studentCatalog = await listStudentCatalog(
      users.outsider, readCatalogQuery(new URLSearchParams("mine=1")),
    );
    expect(studentCatalog.courses.some((course) =>
      course.courseId === ownedCourseId && course.ownerType === "institute" &&
      course.providerName === null && course.independentEducatorName === null)).toBe(true);
    expect(await getStudentCourseDetail(users.outsider, ownedCourseId)).toMatchObject({
      courseId: ownedCourseId, ownerType: "institute", providerName: null,
      independentEducatorName: null,
    });
    const [transferEvent] = await db.select().from(courseOwnershipEvents)
      .where(eq(courseOwnershipEvents.courseId, ownedCourseId));
    expect(transferEvent).toMatchObject({
      sourceAffiliationId: affiliationA,
      previousOwnerType: "independent_educator",
      previousEducatorProfileId: profile!.id,
      nextOwnerType: "institute",
      instituteId: institutes.a,
    });
    const applicantState = await (await applicant.get("/api/independent-educator/affiliations")).json() as {
      affiliations: Array<{ id: string; status: string }>;
    };
    expect(applicantState.affiliations.find((item) => item.id === affiliationA)?.status).toBe("revoked");

    const retry = await post(applicant, "/api/independent-educator/affiliations",
      apply(institutes.a, randomUUID(), "برند مستقل آوا"));
    expect(retry.status()).toBe(201);
    retryAffiliation = (await retry.json() as { id: string }).id;

    expect((await post(instituteA, decisionPath(selfAffiliation), {
      action: "approve", reason: "درخواست پیشتر نباید به خود متقاضی واگذار شود",
    })).status()).toBe(200);
    const events = await db.select().from(educatorInstituteAffiliationEvents)
      .where(inArray(educatorInstituteAffiliationEvents.affiliationId,
        [affiliationA, affiliationB, selfAffiliation, retryAffiliation]));
    expect(events.some((item) => item.affiliationId === affiliationA && item.kind === "revoked")).toBe(true);
    expect(events.some((item) => item.affiliationId === affiliationB && item.kind === "rejected")).toBe(true);
    expect(await db.select().from(auditLogs).where(and(
      eq(auditLogs.entityType, "EDUCATOR_AFFILIATION"),
      eq(auditLogs.entityId, affiliationA),
    ))).toHaveLength(3);

    await page.context().clearCookies();
    await applicant.dispose(); await instituteA.dispose(); await instituteB.dispose();
    await selfApplicant.dispose();
  });
});
