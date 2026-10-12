import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { user } from "../../db/schema";

export async function getStudentProfile(userId: string) {
  const [profile] = await getDb().select({
    name: user.name,
    phoneNumber: user.phoneNumber,
    phoneNumberVerified: user.phoneNumberVerified,
    createdAt: user.createdAt,
  }).from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return profile ?? null;
}
