import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { getDb } from "../../db";
import { memberships, providerInstituteCollaborations as collaborations, providerInstituteCollaborationEvents as events, verifiedEntities } from "../../db/schema";
import { decodeCollaborationCursor, encodeCollaborationCursor } from "./collaboration-cursor";
export async function getProviderCollaborationEvents(userId: string, cursorToken?: string) {
  const cursor = cursorToken ? decodeCollaborationCursor(cursorToken) : null;
  if (cursorToken && !cursor) return { events: [],nextCursor:null,invalidCursor:true };
  const db = getDb();
  const scopes = await db.select({id:memberships.providerId}).from(memberships).where(and(
    eq(memberships.userId,userId),eq(memberships.role,"provider"),eq(memberships.status,"active"),
  ));
  const ids = [...new Set(scopes.flatMap((scope) => scope.id ? [scope.id] : []))];
  if (!ids.length) return {events:[],nextCursor:null,invalidCursor:false};
  const rows = await db.select({id:events.id,kind:events.kind,createdAt:events.createdAt,
    collaborationId:collaborations.id,instituteName:verifiedEntities.name,
  }).from(events).innerJoin(collaborations,eq(collaborations.id,events.collaborationId))
    .innerJoin(verifiedEntities,and(eq(verifiedEntities.id,collaborations.instituteId),eq(verifiedEntities.role,"institute")))
    .where(and(inArray(collaborations.providerId,ids),cursor ? or(
      lt(events.createdAt,cursor.createdAt),and(eq(events.createdAt,cursor.createdAt),lt(events.id,cursor.id)),
    ) : undefined)).orderBy(desc(events.createdAt),desc(events.id)).limit(51);
  const page = rows.slice(0,50);
  return {events:page,nextCursor:rows.length>50 ? encodeCollaborationCursor(page[page.length-1]) : null,invalidCursor:false};
}
