import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

test("course search stays scoped and preserves stable pages with literal wildcard input", async () => {
  const pg = new PGlite();
  vi.doMock("../../db", () => ({ getDb: () => drizzle(pg) }));
  try {
    const {getProviderDashboardCourses} = await import("./dashboard");
    await pg.exec(`
      CREATE TABLE dena_courses (id uuid PRIMARY KEY,title text,provider_id uuid,responsible_institute_id uuid,publication_status text);
      CREATE TABLE dena_supervision_grants (course_id uuid,provider_id uuid,institute_id uuid,status text,requested_at timestamptz);
      CREATE TABLE dena_verified_entities (id uuid PRIMARY KEY,name text,role text);
      CREATE TABLE dena_provider_institute_collaborations (provider_id uuid,institute_id uuid,status text);
      CREATE TABLE dena_private_media_assets (id uuid,course_id uuid,status text);
      CREATE TABLE dena_course_practice_questions (course_id uuid,review_status text);
      CREATE TABLE dena_course_learning_assessments (course_id uuid,review_status text);
      CREATE TABLE dena_student_enrollments (id uuid,course_id uuid,status text);
    `);
    const provider=randomUUID(), other=randomUUID(), institute=randomUUID();
    await pg.query("INSERT INTO dena_verified_entities VALUES ($1,'Institute','institute')",[institute]);
    for(let index=0;index<26;index++) {
      const id=randomUUID(), owner=index===25?other:provider;
      await pg.query("INSERT INTO dena_courses VALUES ($1,$2,$3,$4,'draft')",[id,index===24?"Literal 100%":"Math course",owner,institute]);
      await pg.query("INSERT INTO dena_supervision_grants VALUES ($1,$2,$3,'requested','2020-01-01')",[id,owner,institute]);
    }
    const first=await getProviderDashboardCourses([provider],undefined,"Math");
    const second=await getProviderDashboardCourses([provider],first.nextCursor!,"Math");
    expect([first.courses.length,second.courses.length]).toEqual([20,4]);
    expect(new Set([...first.courses,...second.courses].map((course)=>course.courseId)).size).toBe(24);
    expect(second.nextCursor).toBeNull();
    expect((await getProviderDashboardCourses([provider],undefined,"%")).courses.map((course)=>course.title)).toEqual(["Literal 100%"]);
    expect((await getProviderDashboardCourses([provider],undefined,"' OR 1=1 --")).courses).toEqual([]);
  } finally { vi.doUnmock("../../db"); await pg.close(); }
},30_000);
