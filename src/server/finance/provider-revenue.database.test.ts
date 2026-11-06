import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { expect,test,vi } from "vitest";

test("verified provider capture posts balanced immutable scoped revenue exactly once",async()=>{
  const pg=new PGlite();
  const db=drizzle(pg);
  type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
  const wrap=(tx:Tx)=>new Proxy(tx,{get(target,key){
    if(key==="execute") return async(query:Parameters<Tx["execute"]>[0])=>(await target.execute(query)).rows;
    const value=Reflect.get(target,key);return typeof value==="function"?value.bind(target):value;
  }});
  vi.doMock("../../db",()=>({getDb:()=>({execute:async(query:Parameters<typeof db.execute>[0])=>(await db.execute(query)).rows,
    transaction:(fn:(tx:Tx)=>Promise<unknown>)=>db.transaction(tx=>fn(wrap(tx)))})}));
  try {
    await pg.exec(`CREATE TABLE "user" (id uuid PRIMARY KEY);
      CREATE TABLE dena_institute_services(id uuid,institute_id uuid);
      CREATE TABLE dena_verified_entities(id uuid PRIMARY KEY,name text,role text);
      CREATE TABLE dena_memberships(id uuid PRIMARY KEY,user_id uuid,institute_id uuid,provider_id uuid,role text,status text);
      CREATE TABLE dena_provider_institute_collaborations(id uuid PRIMARY KEY,provider_id uuid,institute_id uuid,status text,withdrawn_at timestamptz);`);
    for(const file of["0029_dena_financial_ledger","0062_provider_compensation_drafts","0063_provider_compensation_decisions","0064_provider_compensation_activation"]) await pg.exec(readFileSync(`drizzle/${file}.sql`,"utf8"));
    await pg.exec(readFileSync("drizzle/0065_provider_revenue_allocations.sql","utf8"));
    const {recordVerifiedProviderRevenue}=await import("./provider-revenue");
    const {getProviderRevenue}=await import("../provider/revenue");
    const user=randomUUID(),outsider=randomUUID(),provider=randomUUID(),institute=randomUUID(),collaboration=randomUUID(),contract=randomUUID();
    await pg.query('INSERT INTO "user" VALUES ($1),($2)',[user,outsider]);
    await pg.query("INSERT INTO dena_verified_entities VALUES ($1,'Institute','institute'),($2,'Provider','provider')",[institute,provider]);
    await pg.query("INSERT INTO dena_memberships VALUES ($1,$2,NULL,$3,'provider','active')",[randomUUID(),user,provider]);
    await pg.query("INSERT INTO dena_provider_institute_collaborations VALUES ($1,$2,$3,'approved',NULL)",[collaboration,provider,institute]);
    await pg.query(`INSERT INTO dena_provider_compensation_drafts
      (id,collaboration_id,client_request_id,reference,share_basis,share_basis_points,proposed_start,proposed_end,settlement_terms,created_by,status,decided_by,decided_at,activated_by,activated_at)
      VALUES ($1,$2,$3,'Revenue contract','institute_after_fee',5000,'2020-01-01','2099-01-01','Settlement terms for test',$4,'active',$4,'2020-01-01',$4,'2020-01-01')`,[contract,collaboration,randomUUID(),user]);
    const event={eventKey:"test-capture:001",sourceId:randomUUID(),contractId:contract,capturedAt:"2026-01-01T00:00:00Z",grossRials:10000,gatewayFeeRials:100};
    const first=await recordVerifiedProviderRevenue(event);
    expect(first.duplicate).toBe(false);
    expect(await recordVerifiedProviderRevenue(event)).toEqual({...first,duplicate:true});
    await expect(recordVerifiedProviderRevenue({...event,grossRials:20000})).rejects.toThrow("replay_conflict");
    await expect(recordVerifiedProviderRevenue({...event,eventKey:"other-event:001"})).rejects.toThrow("replay_conflict");
    const report=await getProviderRevenue(user);
    expect(report.totals).toEqual({count:"1",provider_total:"4450"});
    expect(report.rows[0]).toMatchObject({gross_rials:"10000",dena_share_rials:"1000",gateway_fee_rials:"100",provider_share_rials:"4450",institute_net_rials:"4450"});
    expect((await getProviderRevenue(outsider)).rows).toEqual([]);
    const balances=await pg.query<{total:string}>("SELECT sum(debit_rials-credit_rials)::text AS total FROM dena_financial_entries GROUP BY journal_id");
    expect(balances.rows).toEqual([{total:"0"},{total:"0"}]);
    await expect(pg.exec("UPDATE dena_provider_revenue_allocations SET provider_share_rials=1")).rejects.toThrow("immutable");
    await expect(recordVerifiedProviderRevenue({...event,eventKey:"before-activation:001",sourceId:randomUUID(),capturedAt:"2019-01-01T00:00:00Z"})).rejects.toThrow("contract_unavailable");
    await expect(recordVerifiedProviderRevenue({...event,eventKey:"future-capture:001",sourceId:randomUUID(),capturedAt:"2098-01-01T00:00:00Z"})).rejects.toThrow("contract_unavailable");
    await expect(recordVerifiedProviderRevenue({...event,eventKey:"bad-fee:001",sourceId:randomUUID(),gatewayFeeRials:9999})).rejects.toThrow();
    expect((await pg.query<{count:number}>("SELECT count(*)::int FROM dena_financial_journals")).rows[0].count).toBe(2);
    await pg.exec(`CREATE FUNCTION reject_test_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'allocation unavailable'; END; $$;
      CREATE TRIGGER reject_test_allocation BEFORE INSERT ON dena_provider_revenue_allocations FOR EACH ROW EXECUTE FUNCTION reject_test_allocation();`);
    await expect(recordVerifiedProviderRevenue({...event,eventKey:"rollback-capture:001",sourceId:randomUUID()})).rejects.toThrow();
    expect((await pg.query<{count:number}>("SELECT count(*)::int FROM dena_financial_journals")).rows[0].count).toBe(2);
    await pg.exec("DROP TRIGGER reject_test_allocation ON dena_provider_revenue_allocations");
    await expect(pg.query("UPDATE dena_provider_compensation_drafts SET share_basis_points=0 WHERE id=$1",[contract])).rejects.toThrow("immutable");
    await recordVerifiedProviderRevenue({...event,eventKey:"zero-fee-capture:001",sourceId:randomUUID(),gatewayFeeRials:0});
    expect((await getProviderRevenue(user)).totals).toEqual({count:"2",provider_total:"8950"});
    const zeroFee=(await getProviderRevenue(user)).rows.find(row=>row.gateway_fee_rials==="0")!;
    expect(zeroFee).toMatchObject({provider_share_rials:"4500",institute_net_rials:"4500"});
    await pg.query("UPDATE dena_memberships SET status='suspended'");
    expect((await getProviderRevenue(user)).rows).toEqual([]);
    await pg.query("UPDATE dena_provider_institute_collaborations SET status='terminated'");
    expect((await recordVerifiedProviderRevenue(event)).duplicate).toBe(true);
    await expect(recordVerifiedProviderRevenue({...event,eventKey:"terminated-capture:001",sourceId:randomUUID()})).rejects.toThrow("contract_unavailable");
  } finally {vi.doUnmock("../../db");await pg.close();}
},30_000);
