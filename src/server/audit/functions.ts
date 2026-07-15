/**
 * Server function: list audit logs (admin only, Stage 6).
 *
 * Returns paginated audit log entries with optional action filter.
 */
import { createServerFn } from "@tanstack/react-start";
import { desc, eq, ilike, sql } from "drizzle-orm";
import { assertDb, DbUnavailableError } from "../db/client";
import { auditLogs, type AuditLog } from "../db/schema";
import { requireRole, AuthorizationError } from "../auth/rbac";

export interface AuditLogPublic {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null; // JSON string for serialization safety
  createdAt: string;
}

function toPublic(row: AuditLog): AuditLogPublic {
  return {
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata: row.metadata ? JSON.stringify(row.metadata) : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export const listAuditLogs = createServerFn({ method: "GET" })
  .validator(
    (data: unknown): { action?: string; limit?: number; offset?: number } => {
      if (data === null || data === undefined) return { limit: 50 };
      if (typeof data !== "object") return { limit: 50 };
      const d = data as Record<string, unknown>;
      const action =
        typeof d.action === "string" && d.action.trim()
          ? d.action.trim()
          : undefined;
      const limit =
        typeof d.limit === "number" && d.limit > 0 && d.limit <= 200
          ? d.limit
          : 50;
      const offset =
        typeof d.offset === "number" && d.offset >= 0 ? d.offset : 0;
      return { action, limit, offset };
    },
  )
  .handler(async ({ data }): Promise<AuditLogPublic[]> => {
    await requireRole(["admin"]);
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    const whereClause = data.action
      ? ilike(auditLogs.action, `%${data.action}%`)
      : undefined;

    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause ?? sql`true`)
      .orderBy(desc(auditLogs.createdAt))
      .limit(data.limit ?? 50)
      .offset(data.offset ?? 0);

    return rows.map(toPublic);
  });
