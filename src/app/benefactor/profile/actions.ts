"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "../../../db";
import { memberships } from "../../../db/schema";
import { requireBenefactorAccess } from "../../../server/benefactor/require-access";

const input = z.object({
  benefactorId: z.uuid(), revision: z.coerce.number().int().min(-1),
  phone: z.string().trim().max(40),
  email: z.union([z.email(), z.literal("")]),
  address: z.string().trim().max(1000), description: z.string().trim().max(4000),
});

export async function saveProfile(_: string, form: FormData): Promise<string> {
  const { actor, scopes } = await requireBenefactorAccess();
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return "اطلاعات تماس را بررسی کنید.";
  const data = parsed.data;
  if (!scopes.some(({ id }) => id === data.benefactorId)) return "دسترسی خیر و حامی تغییر کرده است.";
  const saved = await getDb().transaction(async (tx) => {
    const rows = await tx.execute(sql`
      SELECT id FROM ${memberships} WHERE user_id = ${actor.userId}
        AND benefactor_id = ${data.benefactorId} AND role = 'benefactor' AND status = 'active'
      FOR SHARE
    `);
    if (!rows.length) return false;
    const result = await tx.execute(sql`
      INSERT INTO dena_benefactor_contact_profiles
        (benefactor_id, phone, email, address, description, updated_by)
      VALUES (${data.benefactorId}, ${data.phone}, ${data.email}, ${data.address}, ${data.description}, ${actor.userId})
      ON CONFLICT (benefactor_id) DO UPDATE
      SET phone = excluded.phone, email = excluded.email, address = excluded.address,
          description = excluded.description, updated_by = excluded.updated_by,
          updated_at = now(), revision = dena_benefactor_contact_profiles.revision + 1
      WHERE dena_benefactor_contact_profiles.revision = ${data.revision}
      RETURNING benefactor_id
    `);
    return result.length > 0;
  });
  if (!saved) return "اطلاعات هم‌زمان تغییر کرده یا دسترسی تغییر کرده است. صفحه را تازه کنید.";
  revalidatePath("/benefactor/profile");
  return "اطلاعات ذخیره شد.";
}
