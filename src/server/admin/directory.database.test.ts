import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";

test("admin directories execute with masked identities, stable pages and denied suspended access", async () => {
  const pg = new PGlite(), dialect = new PgDialect();
  vi.doMock("../../db", () => ({ getDb: () => ({ execute: async (query: Parameters<PgDialect["sqlToQuery"]>[0]) => {
    const compiled = dialect.sqlToQuery(query);
    return (await pg.query(compiled.sql, compiled.params)).rows;
  } }) }));
  try {
    const { adminDirectories, getAdminDirectory } = await import("./directory");
    await pg.exec(`
      CREATE TABLE "user" (id uuid PRIMARY KEY,name text,"createdAt" timestamptz);
      CREATE TABLE dena_memberships (id uuid PRIMARY KEY,user_id uuid,role text,status text,institute_id uuid,provider_id uuid,organization_id uuid,benefactor_id uuid);
      CREATE TABLE dena_verified_entities (id uuid PRIMARY KEY,name text,role text,verified_at timestamptz);
      CREATE TABLE dena_courses (id uuid PRIMARY KEY,title text,publication_status text,responsible_institute_id uuid,published_at timestamptz);
      CREATE TABLE dena_supervision_grants (course_id uuid,institute_id uuid,status text,requested_at timestamptz);
      CREATE TABLE dena_course_practice_questions (course_id uuid,review_status text,created_at timestamptz);
      CREATE TABLE dena_course_learning_assessments (id uuid,course_id uuid,title text,review_status text,question_count int,created_at timestamptz);
      CREATE TABLE dena_organization_students (id uuid,organization_id uuid,guardian_consent_confirmed_at timestamptz,created_at timestamptz);
      CREATE TABLE dena_audit_logs (id uuid,action text,entity_type text,actor_role text,created_at timestamptz);
    `);
    const admin = randomUUID(), institute = randomUUID(), course = randomUUID();
    await pg.query("INSERT INTO dena_memberships(id,user_id,role,status) VALUES ($1,$2,'admin','active')", [randomUUID(), admin]);
    await pg.exec(`INSERT INTO "user" SELECT gen_random_uuid(),'Sensitive Name',now() FROM generate_series(1,51)`);
    for (const role of ["institute","provider","organization","benefactor"]) await pg.query("INSERT INTO dena_verified_entities VALUES ($1,$2,$2,now())", [role === "institute" ? institute : randomUUID(), role]);
    await pg.query("INSERT INTO dena_courses VALUES ($1,'Course','draft',$2,now())", [course,institute]);
    await pg.query("INSERT INTO dena_supervision_grants VALUES ($1,$2,'requested',now())", [course,institute]);
    await pg.query("INSERT INTO dena_course_practice_questions VALUES ($1,'pending',now())", [course]);
    await pg.query("INSERT INTO dena_course_learning_assessments VALUES ($1,$2,'Assessment','approved',5,now())", [randomUUID(),course]);
    await pg.query("INSERT INTO dena_audit_logs VALUES ($1,'organization.student.created','ORGANIZATION_STUDENT','organization',now())", [randomUUID()]);
    for (const section of Object.keys(adminDirectories) as (keyof typeof adminDirectories)[]) {
      const result = await getAdminDirectory(admin, section);
      expect(result, section).not.toBeNull();
      expect(result!.rows.length, section).toBeGreaterThan(0);
    }
    const first = await getAdminDirectory(admin,"accounts"), second = await getAdminDirectory(admin,"accounts",{page:2});
    expect(first?.rows).toHaveLength(50); expect(second?.rows).toHaveLength(1);
    expect(new Set([...first!.rows,...second!.rows].map((row) => row.id)).size).toBe(51);
    expect(JSON.stringify(first)).not.toContain("Sensitive Name");
    expect((await getAdminDirectory(admin,"accounts",{query:"' OR 1=1 --"}))?.total).toBe(0);
    expect((await getAdminDirectory(admin,"courses",{query:"%"}))?.total).toBe(0);
    await pg.query("UPDATE dena_memberships SET status='suspended'");
    expect(await getAdminDirectory(admin,"accounts")).toBeNull();
  } finally { vi.doUnmock("../../db"); await pg.close(); }
},30_000);
