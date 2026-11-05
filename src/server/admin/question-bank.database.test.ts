import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { DENA_ASSESSMENT_BANK_ID, DENA_ASSESSMENT_OWNER_ID } from "../../db/schema";

test("bank search and pages isolate ownership and treat wildcard characters literally", async () => {
  const pg = new PGlite();
  vi.doMock("../../db", () => ({ getDb: () => drizzle(pg) }));
  try {
    const { getDenaQuestionBank } = await import("./question-bank");
    await pg.exec(`
      CREATE TABLE dena_memberships (id uuid PRIMARY KEY, user_id uuid, role text, status text);
      CREATE TABLE dena_assessment_question_banks (id uuid PRIMARY KEY, owner_type text, owner_id uuid);
      CREATE TABLE dena_assessment_question_bank_questions (id uuid PRIMARY KEY, bank_id uuid, owner_type text,
        owner_id uuid, prompt text, option_0 text, option_1 text, option_2 text, option_3 text,
        correct_option int, created_at timestamptz);
    `);
    const admin = randomUUID();
    await pg.query("INSERT INTO dena_memberships VALUES ($1,$2,'admin','active')", [randomUUID(), admin]);
    await pg.query("INSERT INTO dena_assessment_question_banks VALUES ($1,'dena',$2)", [DENA_ASSESSMENT_BANK_ID, DENA_ASSESSMENT_OWNER_ID]);
    await pg.query(`INSERT INTO dena_assessment_question_bank_questions
      SELECT gen_random_uuid(),$1::uuid,'dena',$2::uuid,'Question ' || n,'A','B','C','D',0,now()
      FROM generate_series(1,101) n`, [DENA_ASSESSMENT_BANK_ID, DENA_ASSESSMENT_OWNER_ID]);
    await pg.query(`INSERT INTO dena_assessment_question_bank_questions VALUES
      ($1,$2,'institute',$3,'Private question','A','B','C','D',0,now()),
      ($4,$2,'dena',$5,'Literal %_ question','A','B','C','D',0,now())`,
    [randomUUID(), DENA_ASSESSMENT_BANK_ID, randomUUID(), randomUUID(), DENA_ASSESSMENT_OWNER_ID]);
    const first = await getDenaQuestionBank(admin);
    const second = await getDenaQuestionBank(admin, { page: 2 });
    expect(first).toMatchObject({ total: 102, page: 1, pageCount: 2 });
    expect(first?.questions).toHaveLength(100);
    expect(second?.questions).toHaveLength(2);
    expect(new Set([...first!.questions, ...second!.questions].map((question) => question.id)).size).toBe(102);
    const literal = await getDenaQuestionBank(admin, { query: "%_" });
    expect(literal?.questions.map((question) => question.prompt)).toEqual(["Literal %_ question"]);
    expect((await getDenaQuestionBank(admin, { query: "Private" }))?.total).toBe(0);
    expect((await getDenaQuestionBank(admin, { page: 999 }))?.page).toBe(2);
    expect((await getDenaQuestionBank(admin, { page: -1 }))?.page).toBe(1);
    await pg.query("UPDATE dena_memberships SET status='suspended'");
    expect(await getDenaQuestionBank(admin)).toBeNull();
  } finally {
    vi.doUnmock("../../db");
    await pg.close();
  }
}, 30_000);
