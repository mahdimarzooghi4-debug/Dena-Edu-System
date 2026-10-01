import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  memberships, session, technicalSupportAttachments, technicalSupportMessages,
  technicalSupportNotifications, technicalSupportTickets, user,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("shared technical support tickets", () => {
  const db = getDb();
  const users = {
    requester: randomUUID(),
    other: randomUUID(),
    suspended: randomUUID(),
    operator: randomUUID(),
    adminWithoutSupport: randomUUID(),
  };
  const tokens = Object.fromEntries(
    Object.keys(users).map((name) => [name, randomUUID()]),
  ) as Record<keyof typeof users, string>;
  const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
  let ticketId = "";

  async function client(as?: keyof typeof users): Promise<APIRequestContext> {
    const cookie = as ? await serializeSignedCookie(
      "better-auth.session_token", tokens[as], process.env.BETTER_AUTH_SECRET!,
    ) : "";
    return request.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: as ? { Cookie: cookie.split(";")[0] } : {},
    });
  }

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id,
      name,
      email: `${id}@example.test`,
    })));
    await db.insert(memberships).values([
      { userId: users.requester, role: "student" },
      { userId: users.other, role: "student" },
      { userId: users.suspended, role: "student", status: "suspended" },
      { userId: users.operator, role: "admin", canHandleTechnicalSupport: true },
      { userId: users.adminWithoutSupport, role: "admin" },
    ]);
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(session).values(Object.entries(tokens).map(([name, token]) => ({
      userId: users[name as keyof typeof users], token, expiresAt,
    })));
  });

  test.afterAll(async () => {
    const tickets = await db.select({ id: technicalSupportTickets.id })
      .from(technicalSupportTickets)
      .where(eq(technicalSupportTickets.requesterUserId, users.requester));
    const ids = tickets.map((ticket) => ticket.id);
    if (ids.length) {
      await db.delete(technicalSupportNotifications)
        .where(inArray(technicalSupportNotifications.ticketId, ids));
      await db.delete(technicalSupportAttachments)
        .where(inArray(technicalSupportAttachments.ticketId, ids));
      await db.delete(technicalSupportMessages)
        .where(inArray(technicalSupportMessages.ticketId, ids));
      await db.delete(technicalSupportTickets)
        .where(inArray(technicalSupportTickets.id, ids));
    }
    await db.delete(memberships).where(inArray(memberships.userId, Object.values(users)));
    await db.delete(session).where(inArray(session.userId, Object.values(users)));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("only the owner and an explicitly enabled operator can read and reply", async () => {
    const anonymous = await client();
    const requester = await client("requester");
      const other = await client("other");
      const suspended = await client("suspended");
    const operator = await client("operator");
    const adminWithoutSupport = await client("adminWithoutSupport");
    try {
      expect((await anonymous.get("/api/support/tickets")).status()).toBe(401);
      expect((await suspended.get("/api/support/tickets")).status()).toBe(403);
      expect((await suspended.get("/api/support/notifications")).status()).toBe(403);

      const deniedOrigin = await requester.post("/api/support/tickets", {
        data: { subject: "مشکل ورود", body: "توضیح کوتاه" },
        headers: { Origin: "https://attacker.invalid" },
      });
      expect(deniedOrigin.status()).toBe(403);

      const created = await requester.post("/api/support/tickets", {
        data: { subject: "مشکل ورود", body: "پس از درخواست کد، صفحه جلو نمی‌رود." },
        headers: { Origin: origin },
      });
      expect(created.status()).toBe(201);
      const createdData = await created.json();
      ticketId = createdData.ticket.id;
      expect(createdData.ticket).not.toHaveProperty("requesterUserId");
      expect(createdData.ticket).not.toHaveProperty("assignedToUserId");
      expect(createdData.ticket.status).toBe("new");
      expect(createdData.ticket.priority).toBe("normal");
      expect(new Date(createdData.ticket.firstResponseDueAt).getTime()).toBeGreaterThan(Date.now());

      expect((await requester.get("/api/support/tickets")).status()).toBe(200);
      expect((await other.get(`/api/support/tickets/${ticketId}`)).status()).toBe(404);
      expect((await other.post(`/api/support/tickets/${ticketId}`, {
        data: { body: "پیام غیرمجاز" }, headers: { Origin: origin },
      })).status()).toBe(404);

      expect((await adminWithoutSupport.get("/api/admin/support/tickets")).status()).toBe(403);
      expect((await adminWithoutSupport.get(`/api/support/tickets/${ticketId}`)).status()).toBe(404);

      const inbox = await operator.get("/api/admin/support/tickets");
      expect(inbox.status()).toBe(200);
      const inboxTicket = (await inbox.json()).tickets.find((ticket: { id: string }) => ticket.id === ticketId);
      expect(inboxTicket).toMatchObject({
        assignedToUserId: users.operator,
        status: "new",
        priority: "normal",
      });
      const operatorNotifications = await operator.get("/api/support/notifications");
      expect((await operatorNotifications.json()).notifications).toEqual(expect.arrayContaining([
        expect.objectContaining({ ticketId, kind: "ticket_created", readAt: null }),
      ]));
      expect((await requester.patch(`/api/admin/support/tickets/${ticketId}`, {
        data: { status: "closed" }, headers: { Origin: origin },
      })).status()).toBe(404);

      const waiting = await operator.patch(`/api/admin/support/tickets/${ticketId}`, {
        data: { status: "waiting_requester", priority: "urgent" },
        headers: { Origin: origin },
      });
      expect(waiting.status()).toBe(200);
      const requesterView = await requester.get(`/api/support/tickets/${ticketId}`);
      expect((await requesterView.json()).ticket).toMatchObject({
        status: "waiting_requester", priority: "urgent",
      });
      expect((await requesterView.json()).ticket).not.toHaveProperty("assignedToUserId");
      const requesterNotifications = await requester.get("/api/support/notifications");
      const statusNotice = (await requesterNotifications.json()).notifications.find(
        (item: { ticketId: string; kind: string }) => item.ticketId === ticketId && item.kind === "ticket_updated",
      );
      expect(statusNotice).toBeTruthy();
      expect((await requester.patch(`/api/support/notifications/${statusNotice.id}`, {
        data: {}, headers: { Origin: origin },
      })).status()).toBe(200);

      const requesterReply = await requester.post(`/api/support/tickets/${ticketId}`, {
        data: { body: "اطلاعات تکمیلی را فرستادم." }, headers: { Origin: origin },
      });
      expect(requesterReply.status()).toBe(201);
      expect((await (await requester.get(`/api/support/tickets/${ticketId}`)).json()).ticket.status)
        .toBe("in_progress");
      expect((await (await operator.get("/api/support/notifications")).json()).notifications)
        .toEqual(expect.arrayContaining([
          expect.objectContaining({ ticketId, kind: "requester_replied" }),
        ]));

      const reply = await operator.post(`/api/support/tickets/${ticketId}`, {
        data: { body: "درخواست شما دریافت شد." }, headers: { Origin: origin },
      });
      expect(reply.status()).toBe(201);
      const thread = await requester.get(`/api/support/tickets/${ticketId}`);
      expect(thread.status()).toBe(200);
      expect((await thread.json()).ticket.messages.map((message: { fromSupport: boolean }) => message.fromSupport))
        .toEqual([false, false, true]);
      expect((await (await requester.get("/api/support/notifications")).json()).notifications)
        .toEqual(expect.arrayContaining([
          expect.objectContaining({ ticketId, kind: "support_replied" }),
        ]));
      expect((await operator.patch(`/api/admin/support/tickets/${ticketId}`, {
        data: { status: "closed" }, headers: { Origin: origin },
      })).status()).toBe(200);
      const reopened = await requester.post(`/api/support/tickets/${ticketId}`, {
        data: { body: "پس از بسته‌شدن، پیگیری دیگری دارم." },
        headers: { Origin: origin },
      });
      expect(reopened.status()).toBe(201);
      const reopenedTicket = await requester.get(`/api/support/tickets/${ticketId}`);
      expect((await reopenedTicket.json()).ticket).toMatchObject({ status: "in_progress", closedAt: null });

      const pageUpdatedAt = new Date(Date.now() + 3_600_000);
      const pageTicketIds = Array.from({ length: 101 }, () => randomUUID());
      await db.insert(technicalSupportTickets).values(pageTicketIds.map((id, index) => ({
        id,
        requesterUserId: users.requester,
        subject: `صفحه‌بندی ${index}`,
        firstResponseDueAt: new Date("2026-10-30T12:00:00.000Z"),
        resolutionDueAt: new Date("2026-11-02T12:00:00.000Z"),
        updatedAt: pageUpdatedAt,
      })));

      const requesterPages: string[] = [];
      let requesterCursor: string | null = null;
      for (let pageNumber = 0; pageNumber < 4; pageNumber += 1) {
        if (pageNumber > 0 && !requesterCursor) break;
        const url: string = requesterCursor
          ? `/api/support/tickets?cursor=${encodeURIComponent(requesterCursor)}`
          : "/api/support/tickets";
        const response: Awaited<ReturnType<APIRequestContext["get"]>> =
          await requester.get(url);
        expect(response.status()).toBe(200);
        const page = await response.json() as {
          tickets: Array<{ id: string }>;
          nextCursor: string | null;
        };
        requesterPages.push(...page.tickets.map((ticket) => ticket.id));
        requesterCursor = page.nextCursor;
      }
      expect(requesterCursor).toBeNull();
      expect(new Set(requesterPages).size).toBe(102);
      expect(new Set(requesterPages)).toEqual(new Set([...pageTicketIds, ticketId]));
      expect((await requester.get("/api/support/tickets?cursor=invalid")).status()).toBe(400);

      const firstInboxPage = await operator.get("/api/admin/support/tickets");
      expect(firstInboxPage.status()).toBe(200);
      const firstInbox = await firstInboxPage.json();
      expect(firstInbox.tickets).toHaveLength(100);
      expect(firstInbox.nextCursor).toEqual(expect.any(String));
      const nextInboxPage = await operator.get(
        `/api/admin/support/tickets?cursor=${encodeURIComponent(firstInbox.nextCursor)}`,
      );
      expect(nextInboxPage.status()).toBe(200);
      const nextInbox = await nextInboxPage.json();
      const adminPagedIds = [
        ...firstInbox.tickets.map((ticket: { id: string }) => ticket.id),
        ...nextInbox.tickets.map((ticket: { id: string }) => ticket.id),
      ].filter((id) => pageTicketIds.includes(id));
      expect(new Set(adminPagedIds).size).toBe(101);
      expect((await operator.get("/api/admin/support/tickets?cursor=invalid")).status())
        .toBe(400);
    } finally {
      await Promise.all([
        anonymous.dispose(), requester.dispose(), other.dispose(),
        operator.dispose(), adminWithoutSupport.dispose(),
      ]);
    }
  });
});
