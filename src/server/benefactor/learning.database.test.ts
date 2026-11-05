import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { PGlite } from "@electric-sql/pglite";

test("real SQL isolates funded enrollments, revocation and suspension without exposing identity", async () => {
  const pg = new PGlite();
  const dialect = new PgDialect();
  vi.doMock("../../db", () => ({
    getDb: () => ({ execute: async (query: Parameters<PgDialect["sqlToQuery"]>[0]) => {
      const compiled = dialect.sqlToQuery(query);
      const result = await pg.query(compiled.sql, compiled.params);
      return result.rows;
    } }),
  }));
  const { getBenefactorLearning, getBenefactorAssessments, getBenefactorVideoActivity } = await import("./learning");
  await pg.exec(`
    CREATE TABLE "user" (id uuid PRIMARY KEY);
    CREATE TABLE dena_verified_entities (id uuid PRIMARY KEY);
    CREATE TABLE dena_student_enrollments (id uuid PRIMARY KEY, student_user_id uuid, course_id uuid, status text);
    CREATE TABLE dena_memberships (user_id uuid, benefactor_id uuid, role text, status text);
    CREATE TABLE dena_courses (id uuid PRIMARY KEY, title text, publication_status text);
    CREATE TABLE dena_private_media_assets (id uuid PRIMARY KEY, course_id uuid, status text);
    CREATE TABLE dena_student_video_completions (id uuid PRIMARY KEY, asset_id uuid, student_user_id uuid, completed_at timestamptz);
    CREATE TABLE dena_course_learning_assessments (id uuid PRIMARY KEY, course_id uuid, title text, question_count int, review_status text);
    CREATE TABLE dena_student_learning_assessment_attempts (id uuid PRIMARY KEY, assessment_id uuid, course_id uuid,
      student_user_id uuid, status text, outcome text, correct_count int, submitted_at timestamptz);
  `);
  for (const file of [
    "0058_organization_contact_profiles.sql",
    "0059_benefactor_contact_profiles.sql",
    "0060_benefactor_learning_grants.sql",
  ]) await pg.exec(readFileSync("drizzle/" + file, "utf8"));
  const [actor, otherActor, student, admin, benefactor, otherBenefactor, course, privateCourse,
    enrollment, privateEnrollment, recipient, grant, video, privateVideo, assessment, privateAssessment] =
    Array.from({ length: 16 }, () => randomUUID());
  for (const id of [actor, otherActor, student, admin]) await pg.query('INSERT INTO "user" VALUES ($1)', [id]);
  for (const id of [benefactor, otherBenefactor]) await pg.query("INSERT INTO dena_verified_entities VALUES ($1)", [id]);
  for (const [id, title] of [[course, "funded"], [privateCourse, "private"]]) {
    await pg.query("INSERT INTO dena_courses VALUES ($1,$2,'published')", [id, title]);
  }
  for (const [id, cid] of [[enrollment, course], [privateEnrollment, privateCourse]]) {
    await pg.query("INSERT INTO dena_student_enrollments VALUES ($1,$2,$3,'active')", [id, student, cid]);
  }
  for (const [uid, bid] of [[actor, benefactor], [otherActor, otherBenefactor]]) {
    await pg.query("INSERT INTO dena_memberships VALUES ($1,$2,'benefactor','active')", [uid, bid]);
  }
  await pg.query("INSERT INTO dena_benefactor_recipients VALUES ($1,$2,$3)", [recipient, benefactor, student]);
  await pg.query("INSERT INTO dena_benefactor_learning_grants (id, recipient_id, enrollment_id, payment_reference, confirmed_by) VALUES ($1,$2,$3,'verified-reference',$4)",
    [grant, recipient, enrollment, admin]);
  for (const [vid, cid, aid] of [[video, course, assessment], [privateVideo, privateCourse, privateAssessment]]) {
    await pg.query("INSERT INTO dena_private_media_assets VALUES ($1,$2,'ready')", [vid, cid]);
    await pg.query("INSERT INTO dena_student_video_completions VALUES ($1,$2,$3,now())", [randomUUID(), vid, student]);
    await pg.query("INSERT INTO dena_course_learning_assessments VALUES ($1,$2,'assessment',10,'approved')", [aid, cid]);
    await pg.query("INSERT INTO dena_student_learning_assessment_attempts VALUES ($1,$2,$3,$4,'submitted','completed',8,now())", [randomUUID(), aid, cid, student]);
  }
  const read = (uid: string) => Promise.all([
    getBenefactorLearning(uid, recipient),
    getBenefactorAssessments(uid, recipient),
    getBenefactorVideoActivity(uid, recipient),
  ]);
  const allowed = await read(actor);
  expect(allowed.map((rows) => rows.length)).toEqual([1, 1, 1]);
  expect(allowed[0][0]).toMatchObject({ course_title: "funded", total_videos: 1, completed_videos: 1 });
  expect(allowed[1][0]).toMatchObject({ correct_count: 8, question_count: 10 });
  expect(JSON.stringify(allowed)).not.toContain(student);
  expect(JSON.stringify(allowed)).not.toContain(privateCourse);
  expect((await read(otherActor)).map((rows) => rows.length)).toEqual([0, 0, 0]);

  await pg.query("UPDATE dena_benefactor_learning_grants SET revoked_at=now(), revoked_by=$1 WHERE id=$2", [admin, grant]);
  expect((await read(actor)).map((rows) => rows.length)).toEqual([0, 0, 0]);
  await pg.query("UPDATE dena_benefactor_learning_grants SET revoked_at=NULL, revoked_by=NULL WHERE id=$1", [grant]);
  await pg.query("UPDATE dena_memberships SET status='suspended' WHERE user_id=$1", [actor]);
  expect((await read(actor)).map((rows) => rows.length)).toEqual([0, 0, 0]);
  await pg.query("UPDATE dena_memberships SET status='active' WHERE user_id=$1", [actor]);
  await pg.query("UPDATE dena_student_enrollments SET status='cancelled' WHERE id=$1", [enrollment]);
  expect((await read(actor)).map((rows) => rows.length)).toEqual([0, 0, 0]);
  await pg.close();
});
