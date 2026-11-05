import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";

test("provider profile saves only within active scope and rejects stale revisions", async () => {
  const pg = new PGlite(), dialect = new PgDialect();
  const execute = (db: Pick<PGlite,"query">) => async (query: Parameters<PgDialect["sqlToQuery"]>[0]) => {
    const compiled = dialect.sqlToQuery(query);
    return (await db.query(compiled.sql, compiled.params)).rows;
  };
  vi.doMock("../../db", () => ({ getDb: () => ({ execute: execute(pg), transaction: (fn: (tx: { execute: ReturnType<typeof execute> }) => Promise<unknown>) => pg.transaction((tx) => fn({ execute: execute(tx) })) }) }));
  try {
    const { getProviderContact, saveProviderContact } = await import("./contact-profile");
    await pg.exec(`CREATE TABLE "user" (id uuid PRIMARY KEY,name text);
      CREATE TABLE dena_verified_entities (id uuid PRIMARY KEY,role text,name text);
      CREATE TABLE dena_memberships (id uuid PRIMARY KEY,user_id uuid,provider_id uuid,role text,status text);`);
    await pg.exec(readFileSync("drizzle/0061_provider_contact_profiles.sql","utf8"));
    const actor = randomUUID(), other = randomUUID(), provider = randomUUID(), privateProvider = randomUUID();
    for (const id of [actor,other]) await pg.query("INSERT INTO \"user\" VALUES ($1,'Account')",[id]);
    for (const id of [provider,privateProvider]) await pg.query("INSERT INTO dena_verified_entities VALUES ($1,'provider','Verified Name')",[id]);
    await pg.query("INSERT INTO dena_memberships VALUES ($1,$2,$3,'provider','active')",[randomUUID(),actor,provider]);
    const input = {providerId:provider,revision:-1,brandName:"Brand",phone:"09120000000",email:"",city:"تهران",categories:["content"]};
    expect((await getProviderContact(actor,provider))?.revision).toBe(-1);
    expect(await saveProviderContact(actor,input)).toBe("saved");
    expect(await saveProviderContact(actor,input)).toBe("conflict");
    expect(await saveProviderContact(other,{...input,revision:0})).toBe("forbidden");
    expect(await saveProviderContact(actor,{...input,providerId:privateProvider})).toBe("forbidden");
    expect(await getProviderContact(actor,privateProvider)).toBeNull();
    expect(await saveProviderContact(actor,{...input,revision:0,categories:[]})).toBe("saved");
    expect(await getProviderContact(actor,provider)).toMatchObject({name:"Verified Name",brand_name:"Brand",revision:1,categories:[]});
    expect(await saveProviderContact(actor,{...input,categories:["admin"]})).toBe("invalid");
    await pg.query("UPDATE dena_memberships SET status='suspended'");
    expect(await getProviderContact(actor,provider)).toBeNull();
    expect(await saveProviderContact(actor,{...input,revision:1})).toBe("forbidden");
  } finally { vi.doUnmock("../../db"); await pg.close(); }
},30_000);
