/**
 * Server functions for the support ticket system (Stage 6).
 *
 * Functions:
 *   1. `getMyTickets` — returns the caller's own tickets.
 *   2. `createTicket` — POST: creates a ticket + first message.
 *   3. `getTicketDetail` — GET: returns a ticket + all its messages.
 *   4. `replyToTicket` — POST: adds a message to a ticket.
 *   5. `listAllTickets` — GET (support/admin): returns all tickets.
 *   6. `assignTicket` — POST (support/admin): assigns to self + sets in_progress.
 *   7. `closeTicket` — POST: closes a ticket.
 *
 * File naming: `.functions.ts` for TanStack import-protection compatibility.
 */
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { assertDb, DbUnavailableError } from "../db/client";
import {
  tickets,
  ticketMessages,
  users,
  type TicketStatus,
} from "../db/schema";
import { requireRole, requireAuthenticated, AuthorizationError } from "./rbac";
import { recordAuditLog } from "../audit/log";

export type { TicketStatus };

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TicketPublic {
  id: string;
  createdBy: string;
  createdByName: string | null;
  createdByPhone: string;
  subject: string;
  status: TicketStatus;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessagePublic {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string | null;
  senderRole: string;
  body: string;
  createdAt: string;
}

export interface TicketDetail {
  ticket: TicketPublic;
  messages: TicketMessagePublic[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function loadTicketPublic(
  db: ReturnType<typeof assertDb>,
  ticket: typeof tickets.$inferSelect,
): Promise<TicketPublic> {
  const [creator] = await db
    .select({ name: users.fullName, phone: users.phone })
    .from(users)
    .where(eq(users.id, ticket.createdBy))
    .limit(1);
  return {
    id: ticket.id,
    createdBy: ticket.createdBy,
    createdByName: creator?.name ?? null,
    createdByPhone: creator?.phone ?? "—",
    subject: ticket.subject,
    status: ticket.status,
    assignedTo: ticket.assignedTo,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* 1. getMyTickets                                                     */
/* ------------------------------------------------------------------ */

export const getMyTickets = createServerFn({ method: "GET" }).handler(
  async (): Promise<TicketPublic[]> => {
    const user = await requireAuthenticated();
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    const rows = await db
      .select()
      .from(tickets)
      .where(eq(tickets.createdBy, user.id))
      .orderBy(desc(tickets.updatedAt));

    const result: TicketPublic[] = [];
    for (const row of rows) {
      result.push(await loadTicketPublic(db, row));
    }
    return result;
  },
);

/* ------------------------------------------------------------------ */
/* 2. createTicket                                                     */
/* ------------------------------------------------------------------ */

export interface CreateTicketInput {
  subject: string;
  message: string;
}

export const createTicket = createServerFn({ method: "POST" })
  .validator((data: unknown): CreateTicketInput => {
    if (typeof data !== "object" || data === null) {
      throw new Error("ورودی نامعتبر است.");
    }
    const d = data as Record<string, unknown>;
    const subject = typeof d.subject === "string" ? d.subject.trim() : "";
    const message = typeof d.message === "string" ? d.message.trim() : "";
    if (subject.length < 3) {
      throw new Error("موضوع باید حداقل ۳ کاراکتر باشد.");
    }
    if (subject.length > 200) {
      throw new Error("موضوع نباید بیشتر از ۲۰۰ کاراکتر باشد.");
    }
    if (message.length < 5) {
      throw new Error("پیام باید حداقل ۵ کاراکتر باشد.");
    }
    if (message.length > 5000) {
      throw new Error("پیام نباید بیشتر از ۵۰۰۰ کاراکتر باشد.");
    }
    return { subject, message };
  })
  .handler(async ({ data }): Promise<TicketPublic> => {
    const user = await requireAuthenticated();
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    // Create ticket + first message in a transaction.
    const [ticket] = await db.transaction(async (tx) => {
      const [newTicket] = await tx
        .insert(tickets)
        .values({
          createdBy: user.id,
          subject: data.subject,
          status: "open",
        })
        .returning();

      if (!newTicket) {
        throw new Error("ساخت تیکت با خطا مواجه شد.");
      }

      await tx.insert(ticketMessages).values({
        ticketId: newTicket.id,
        senderId: user.id,
        body: data.message,
      });

      return [newTicket];
    });

    await recordAuditLog({
      actorId: user.id,
      action: "ticket.created",
      targetType: "ticket",
      targetId: ticket!.id,
      metadata: { subject: data.subject },
    });

    return loadTicketPublic(db, ticket!);
  });

/* ------------------------------------------------------------------ */
/* 3. getTicketDetail                                                  */
/* ------------------------------------------------------------------ */

export const getTicketDetail = createServerFn({ method: "GET" })
  .validator((data: unknown): { ticketId: string } => {
    if (typeof data !== "object" || data === null || !("ticketId" in data)) {
      throw new Error("ticketId الزامی است.");
    }
    const id = (data as { ticketId: unknown }).ticketId;
    if (typeof id !== "string" || !id) {
      throw new Error("ticketId باید یک رشته‌ی غیرخالی باشد.");
    }
    return { ticketId: id };
  })
  .handler(async ({ data }): Promise<TicketDetail | null> => {
    const user = await requireAuthenticated();
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, data.ticketId))
      .limit(1);

    if (!ticket) return null;

    // Authorization: the creator OR support/admin can view.
    const isCreator = ticket.createdBy === user.id;
    const isStaff = user.role === "support" || user.role === "admin";
    if (!isCreator && !isStaff) {
      // Don't reveal existence — return null (404 on the route).
      return null;
    }

    const ticketPublic = await loadTicketPublic(db, ticket);

    // Load messages.
    const msgRows = await db
      .select({
        msg: ticketMessages,
        senderName: users.fullName,
        senderRole: users.role,
      })
      .from(ticketMessages)
      .innerJoin(users, eq(ticketMessages.senderId, users.id))
      .where(eq(ticketMessages.ticketId, data.ticketId))
      .orderBy(ticketMessages.createdAt);

    const messages: TicketMessagePublic[] = msgRows.map((r) => ({
      id: r.msg.id,
      ticketId: r.msg.ticketId,
      senderId: r.msg.senderId,
      senderName: r.senderName,
      senderRole: r.senderRole,
      body: r.msg.body,
      createdAt: r.msg.createdAt.toISOString(),
    }));

    return { ticket: ticketPublic, messages };
  });

/* ------------------------------------------------------------------ */
/* 4. replyToTicket                                                    */
/* ------------------------------------------------------------------ */

export const replyToTicket = createServerFn({ method: "POST" })
  .validator((data: unknown): { ticketId: string; body: string } => {
    if (typeof data !== "object" || data === null) {
      throw new Error("ورودی نامعتبر است.");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.ticketId !== "string" || !d.ticketId) {
      throw new Error("ticketId الزامی است.");
    }
    const body = typeof d.body === "string" ? d.body.trim() : "";
    if (body.length < 1) {
      throw new Error("پیام نمی‌تواند خالی باشد.");
    }
    if (body.length > 5000) {
      throw new Error("پیام نباید بیشتر از ۵۰۰۰ کاراکتر باشد.");
    }
    return { ticketId: d.ticketId, body };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await requireAuthenticated();
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, data.ticketId))
      .limit(1);

    if (!ticket) {
      throw new Error("تیکت یافت نشد.");
    }

    const isCreator = ticket.createdBy === user.id;
    const isStaff = user.role === "support" || user.role === "admin";
    if (!isCreator && !isStaff) {
      throw new AuthorizationError("دسترسی غیرمجاز.", "FORBIDDEN");
    }

    if (ticket.status === "closed") {
      throw new Error("این تیکت بسته شده است و امکان پاسخ ندارد.");
    }

    // Insert message + bump ticket's updatedAt.
    await db.transaction(async (tx) => {
      await tx.insert(ticketMessages).values({
        ticketId: data.ticketId,
        senderId: user.id,
        body: data.body,
      });
      await tx
        .update(tickets)
        .set({ updatedAt: new Date() })
        .where(eq(tickets.id, data.ticketId));
    });

    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* 5. listAllTickets (support/admin)                                   */
/* ------------------------------------------------------------------ */

export const listAllTickets = createServerFn({ method: "GET" })
  .validator((data: unknown): { status?: TicketStatus } => {
    if (data === null || data === undefined) return {};
    if (typeof data !== "object") return {};
    const d = data as Record<string, unknown>;
    if (
      d.status === "open" ||
      d.status === "in_progress" ||
      d.status === "closed"
    ) {
      return { status: d.status };
    }
    return {};
  })
  .handler(async ({ data }): Promise<TicketPublic[]> => {
    await requireRole(["support", "admin"]);
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    const whereClause = data.status
      ? eq(tickets.status, data.status)
      : undefined;

    const rows = await db
      .select()
      .from(tickets)
      .where(whereClause ?? eq(tickets.id, tickets.id))
      .orderBy(desc(tickets.updatedAt));

    const result: TicketPublic[] = [];
    for (const row of rows) {
      result.push(await loadTicketPublic(db, row));
    }
    return result;
  });

/* ------------------------------------------------------------------ */
/* 6. assignTicket (support/admin)                                     */
/* ------------------------------------------------------------------ */

export const assignTicket = createServerFn({ method: "POST" })
  .validator((data: unknown): { ticketId: string } => {
    if (typeof data !== "object" || data === null || !("ticketId" in data)) {
      throw new Error("ticketId الزامی است.");
    }
    const id = (data as { ticketId: unknown }).ticketId;
    if (typeof id !== "string" || !id) {
      throw new Error("ticketId باید یک رشته‌ی غیرخالی باشد.");
    }
    return { ticketId: id };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await requireRole(["support", "admin"]);
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    await db
      .update(tickets)
      .set({
        assignedTo: user.id,
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, data.ticketId));

    await recordAuditLog({
      actorId: user.id,
      action: "ticket.assigned",
      targetType: "ticket",
      targetId: data.ticketId,
      metadata: { assignedTo: user.id },
    });

    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* 7. closeTicket                                                      */
/* ------------------------------------------------------------------ */

export const closeTicket = createServerFn({ method: "POST" })
  .validator((data: unknown): { ticketId: string } => {
    if (typeof data !== "object" || data === null || !("ticketId" in data)) {
      throw new Error("ticketId الزامی است.");
    }
    const id = (data as { ticketId: unknown }).ticketId;
    if (typeof id !== "string" || !id) {
      throw new Error("ticketId باید یک رشته‌ی غیرخالی باشد.");
    }
    return { ticketId: id };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await requireAuthenticated();
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, data.ticketId))
      .limit(1);

    if (!ticket) {
      throw new Error("تیکت یافت نشد.");
    }

    const isCreator = ticket.createdBy === user.id;
    const isStaff = user.role === "support" || user.role === "admin";
    if (!isCreator && !isStaff) {
      throw new AuthorizationError("دسترسی غیرمجاز.", "FORBIDDEN");
    }

    await db
      .update(tickets)
      .set({
        status: "closed",
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, data.ticketId));

    await recordAuditLog({
      actorId: user.id,
      action: "ticket.closed",
      targetType: "ticket",
      targetId: data.ticketId,
    });

    return { ok: true };
  });

// Suppress unused import warning for `and` and `sql` (kept for future use).
void and;
void sql;
