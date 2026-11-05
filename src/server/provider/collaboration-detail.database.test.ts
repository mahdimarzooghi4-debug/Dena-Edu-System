import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { PgDialect } from "drizzle-orm/pg-core";

test("a collaboration detail only returns the active provider's exact request and events", async () => {
  const pg = new PGlite();
  const db = drizzle(pg), dialect = new PgDialect();
  vi.doMock("../../db", () => ({ getDb: () => ({ select: db.select.bind(db),
    execute: async (query: Parameters<PgDialect["sqlToQuery"]>[0]) => {
      const compiled = dialect.sqlToQuery(query);
      return (await pg.query(compiled.sql,compiled.params)).rows;
    },
  }) }));
  try {
    const { getProviderCollaborations } = await import("./collaborations");
    const { getProviderMetrics } = await import("./metrics");
    await pg.exec(`
      CREATE TABLE dena_courses (provider_id uuid,publication_status text);
      CREATE TABLE dena_memberships (user_id uuid,provider_id uuid,institute_id uuid,role text,status text);
      CREATE TABLE dena_verified_entities (id uuid PRIMARY KEY,name text,role text);
      CREATE TABLE dena_provider_institute_collaborations (id uuid PRIMARY KEY,provider_id uuid,institute_id uuid,
        status text,withdrawn_at timestamptz,institute_decision_reason text,dena_decision_reason text,
        created_at timestamptz,updated_at timestamptz);
      CREATE TABLE dena_provider_institute_collaboration_events (id uuid PRIMARY KEY,collaboration_id uuid,
        kind text,reason text,created_at timestamptz);
    `);
    const actor=randomUUID(), provider=randomUUID(), otherProvider=randomUUID(), institute=randomUUID();
    const own=randomUUID(), anotherOwn=randomUUID(), foreign=randomUUID();
    await pg.query("INSERT INTO dena_memberships VALUES ($1,$2,NULL,'provider','active')",[actor,provider]);
    await pg.query("INSERT INTO dena_verified_entities VALUES ($1,'Institute','institute')",[institute]);
    for(const [id,pid] of [[own,provider],[anotherOwn,provider],[foreign,otherProvider]]) {
      await pg.query("INSERT INTO dena_provider_institute_collaborations VALUES ($1,$2,$3,'requested',NULL,NULL,NULL,now(),now())",[id,pid,institute]);
      await pg.query("INSERT INTO dena_provider_institute_collaboration_events VALUES ($1,$2,'requested','Scoped event',now())",[randomUUID(),id]);
    }
    await pg.query("INSERT INTO dena_courses VALUES ($1,'published'),($2,'draft')",[provider,otherProvider]);
    expect(await getProviderMetrics(actor)).toEqual({courses:1,published:1,pending:2,approved:0});
    const found = await getProviderCollaborations(actor,own);
    expect(found.collaborations).toHaveLength(1);
    expect(found.collaborations[0].id).toBe(own);
    expect(found.collaborations[0].events).toHaveLength(1);
    expect((await getProviderCollaborations(actor,foreign)).collaborations).toEqual([]);
    expect((await getProviderCollaborations(actor,randomUUID())).collaborations).toEqual([]);
    await pg.query("UPDATE dena_memberships SET status='suspended'");
    expect((await getProviderCollaborations(actor,own)).collaborations).toEqual([]);
    expect(await getProviderMetrics(actor)).toBeNull();
  } finally { vi.doUnmock("../../db"); await pg.close(); }
},30_000);
