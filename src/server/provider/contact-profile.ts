import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { providerContactInput, type ProviderContact } from "../../lib/provider-profile";
export async function getProviderContact(userId: string, providerId: string) {
  const rows = await getDb().execute(sql`
    SELECT e.id AS provider_id,e.name,u.name AS account_name,
      COALESCE(p.brand_name,'') AS brand_name,COALESCE(p.phone,'') AS phone,
      COALESCE(p.email,'') AS email,COALESCE(p.city,'') AS city,
      COALESCE(p.categories,'{}'::text[]) AS categories,COALESCE(p.revision,-1) AS revision
    FROM dena_verified_entities e JOIN "user" u ON u.id=${userId}::uuid
    LEFT JOIN dena_provider_contact_profiles p ON p.provider_id=e.id
    WHERE e.id=${providerId}::uuid AND e.role='provider' AND EXISTS (
      SELECT 1 FROM dena_memberships m WHERE m.user_id=u.id AND m.provider_id=e.id
      AND m.role='provider' AND m.status='active')
  `);
  return (rows[0] as ProviderContact | undefined) ?? null;
}
export async function saveProviderContact(userId: string, raw: unknown) {
  const parsed = providerContactInput.safeParse(raw);
  if (!parsed.success) return "invalid" as const;
  const data = parsed.data;
  return getDb().transaction(async (tx) => {
    const scopes = await tx.execute(sql`SELECT m.id FROM dena_memberships m
      JOIN dena_verified_entities e ON e.id=m.provider_id AND e.role='provider'
      WHERE m.user_id=${userId}::uuid AND m.provider_id=${data.providerId}::uuid
      AND m.role='provider' AND m.status='active' FOR SHARE OF m`);
    if (!scopes.length) return "forbidden" as const;
    const categories = sql`ARRAY[${sql.join(data.categories.map((value) => sql`${value}`), sql`, `)}]::text[]`;
    const result = await tx.execute(sql`INSERT INTO dena_provider_contact_profiles
      (provider_id,brand_name,phone,email,city,categories,updated_by)
      SELECT ${data.providerId}::uuid,${data.brandName},${data.phone},${data.email},${data.city},${categories},${userId}::uuid
      WHERE ${data.revision}=-1 OR EXISTS (SELECT 1 FROM dena_provider_contact_profiles WHERE provider_id=${data.providerId}::uuid)
      ON CONFLICT (provider_id) DO UPDATE SET brand_name=excluded.brand_name,phone=excluded.phone,
        email=excluded.email,city=excluded.city,categories=excluded.categories,updated_by=excluded.updated_by,
        updated_at=now(),revision=dena_provider_contact_profiles.revision+1
      WHERE dena_provider_contact_profiles.revision=${data.revision}
      RETURNING provider_id`);
    return result.length ? "saved" as const : "conflict" as const;
  });
}
