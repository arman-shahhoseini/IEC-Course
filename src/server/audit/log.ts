/**
 * Audit log helper — single entry point for recording significant actions.
 *
 * Usage:
 *   import { recordAuditLog } from "@/server/audit/log";
 *
 *   // Inside a server function (no transaction):
 *   await recordAuditLog({ actorId: user.id, action: "course.published", targetType: "course", targetId: course.id, metadata: { title: course.title } });
 *
 *   // Inside a Drizzle transaction (so the audit log is atomic with
 *   // the action it records):
 *   await db.transaction(async (tx) => {
 *     await tx.update(...);
 *     await recordAuditLog({ ..., tx });
 *   });
 *
 * The helper NEVER throws — if the audit log insert fails (e.g. DB error),
 * it logs a warning but does not break the calling operation. This is a
 * deliberate trade-off: we'd rather have the action succeed without an
 * audit trail than have the action fail because the audit log was down.
 * (If full atomicity is required, pass `tx` and the insert will be part
 * of the caller's transaction — a failure there rolls back everything.)
 */
import { auditLogs } from "../db/schema";

/** Shape of the `metadata` JSONB column — arbitrary key-value pairs. */
export type AuditMetadata = Record<string, unknown>;

/** Parameters for `recordAuditLog`. */
export interface RecordAuditLogParams {
  /** The user who performed the action. NULL for system actions. */
  actorId: string | null;
  /** Dotted action name, e.g. `"instructor_application.approved"`. */
  action: string;
  /** Target type, e.g. `"course"`, `"enrollment"`, `"ticket"`. */
  targetType?: string;
  /** Target ID (UUID). */
  targetId?: string;
  /** Arbitrary metadata (amount, reason, etc.). */
  metadata?: AuditMetadata;
  /**
   * Optional Drizzle transaction client. If provided, the audit log
   * insert runs inside the caller's transaction (atomic with the action).
   * If omitted, uses the default db client.
   */
  tx?: {
    insert: (typeof import("../db/client"))["assertDb"] extends () => infer T
      ? T extends { insert: infer I }
        ? I
        : never
      : never;
  };
}

/**
 * Record an audit log entry. Never throws — failures are logged to
 * the server console but do not break the calling operation.
 */
export async function recordAuditLog(
  params: RecordAuditLogParams,
): Promise<void> {
  try {
    // Use the transaction client if provided, otherwise the default db.
    // We import assertDb lazily to avoid circular deps in some edge cases.
    const { assertDb } = await import("../db/client");
    const client = params.tx ?? assertDb();
    await client.insert(auditLogs).values({
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    // Audit log failure should NOT break the calling operation.
    // Log the error so it's visible, but continue.
    console.error("[iec:audit] Failed to record audit log:", err);
    console.error("[iec:audit] Action was:", params.action);
  }
}
