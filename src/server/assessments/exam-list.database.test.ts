import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

test("admin exam list counts all 300 questions before applying the exam limit", async () => {
  const pg = new PGlite();
  const db = drizzle(pg);
  vi.doMock("../../db", () => ({ getDb: () => db }));
  try {
    const { getDenaExams } = await import("./exam-management");
    await pg.exec(`
      CREATE TABLE dena_memberships (id uuid PRIMARY KEY, user_id uuid, role text, status text);
      CREATE TABLE dena_assessment_exams (id uuid PRIMARY KEY, title text, exam_type text, owner_id uuid,
        starts_at timestamptz, ends_at timestamptz, duration_minutes integer, attempt_limit integer, status text);
      CREATE TABLE dena_assessment_exam_questions (id uuid PRIMARY KEY, exam_id uuid);
    `);
    const admin = randomUUID(), first = randomUUID(), second = randomUUID();
    await pg.query("INSERT INTO dena_memberships VALUES ($1,$2,'admin','active')", [randomUUID(), admin]);
    for (const id of [first, second]) await pg.query(`INSERT INTO dena_assessment_exams VALUES
      ($1,'Exam','dena_coordinated','00000000-0000-0000-0000-000000000001',now(),now(),60,1,'draft')`, [id]);
    await pg.query("INSERT INTO dena_assessment_exam_questions SELECT gen_random_uuid(),$1::uuid FROM generate_series(1,300)", [first]);
    const result = await getDenaExams(admin);
    expect(result?.exams).toHaveLength(2);
    expect(result?.exams.find((exam) => exam.id === first)?.questionCount).toBe(300);
    expect(result?.exams.find((exam) => exam.id === second)?.questionCount).toBe(0);
    expect(await getDenaExams(randomUUID())).toBeNull();
  } finally {
    vi.doUnmock("../../db");
    await pg.close();
  }
}, 30_000);
