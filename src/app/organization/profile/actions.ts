"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "../../../db";
import { memberships } from "../../../db/schema";
import { requireOrganizationAccess } from "../../../server/organization/require-access";

const input = z.object({
  organizationId: z.uuid(), revision: z.coerce.number().int().min(-1),
  phone: z.string().trim().max(40),
  email: z.union([z.email(), z.literal("")]),
  address: z.string().trim().max(1000), description: z.string().trim().max(4000),
});

export async function saveProfile(_: string, form: FormData): Promise<string> {
  const { actor, scopes } = await requireOrganizationAccess();
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return "اطلاعات تماس را بررسی کنید.";
  const data = parsed.data;
  if (!scopes.some(({ id }) => id === data.organizationId)) return "دسترسی سازمان تغییر کرده است.";
  const saved = await getDb().transaction(async (tx) => {
    const rows = await tx.execute(sql`
      SELECT id FROM ${memberships} WHERE user_id = ${actor.userId}
        AND organization_id = ${data.organizationId} AND role = 'organization' AND status = 'active'
      FOR SHARE
    `);
    if (!rows.length) return false;
    const result = await tx.execute(sql`
      INSERT INTO dena_organization_contact_profiles
        (organization_id, phone, email, address, description, updated_by)
      VALUES (${data.organizationId}, ${data.phone}, ${data.email}, ${data.address}, ${data.description}, ${actor.userId})
      ON CONFLICT (organization_id) DO UPDATE
      SET phone = excluded.phone, email = excluded.email, address = excluded.address,
          description = excluded.description, updated_by = excluded.updated_by,
          updated_at = now(), revision = dena_organization_contact_profiles.revision + 1
      WHERE dena_organization_contact_profiles.revision = ${data.revision}
      RETURNING organization_id
    `);
    return result.length > 0;
  });
  if (!saved) return "اطلاعات هم‌زمان تغییر کرده یا دسترسی تغییر کرده است. صفحه را تازه کنید.";
  revalidatePath("/organization/profile");
  return "اطلاعات ذخیره شد.";
}
