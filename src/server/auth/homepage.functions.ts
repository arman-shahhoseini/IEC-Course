/**
 * Server function: lightweight homepage preview for authenticated users.
 *
 * Returns just the counts the homepage's DashboardPreview section needs
 * to show a personalized mini-summary — never full data structures.
 *
 * Behavior:
 *   - Unauthenticated → returns `null` (the homepage shows the generic
 *     marketing preview with 3 role-tabbed cards).
 *   - Authenticated → returns { role, activeCourses, openTickets }
 *     where counts are real, derived from the DB. Zero is a valid count
 *     (the UI shows an empty state, never a fabricated number).
 *
 * Why a dedicated function instead of calling getMyCourses + getMyTickets
 * directly:
 *   1. One RPC round-trip instead of two (homepage is the highest-traffic
 *      page — every byte counts).
 *   2. Returns only counts, not full rows — smaller payload.
 *   3. Single place to handle DB-unavailable degradation.
 *
 * Role-aware counting:
 *   - student     → activeCourses = enrollments with status='confirmed'
 *                   openTickets = tickets created by user with status='open'
 *   - instructor  → activeCourses = courses with status='published' they teach
 *                   openTickets = tickets they created with status='open'
 *   - support     → activeCourses = 0 (support has no courses)
 *                   openTickets = tickets assigned to them with status='open'
 *   - admin       → activeCourses = total courses with status='published'
 *                   openTickets = total tickets with status='open'
 *
 * All counts are real. If the DB is unavailable, returns null (guest
 * preview) — never throws on the homepage.
 */
import { createServerFn } from "@tanstack/react-start";
import { eq, and, count } from "drizzle-orm";
import { getActiveSession } from "./session";
import { assertDb, DbUnavailableError } from "../db/client";
import { courses, enrollments, tickets } from "../db/schema";
import type { Role } from "../db/schema";

export interface HomepagePreview {
  role: Role;
  /** Active course count (role-dependent meaning — see file docstring). */
  activeCourses: number;
  /** Open ticket count (role-dependent meaning — see file docstring). */
  openTickets: number;
}

export const getHomepagePreview = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepagePreview | null> => {
    const session = await getActiveSession();
    if (!session) return null;

    let db;
    try {
      db = assertDb();
    } catch {
      // DB unavailable — degrade to guest preview. Never throw on the
      // homepage (it's the most-visited page and must always render).
      return null;
    }

    const { id: userId, role } = session.user;

    // ----- activeCourses (role-dependent) -----
    let activeCourses = 0;
    if (role === "student") {
      const rows = await db
        .select({ c: count() })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, userId),
            eq(enrollments.status, "confirmed"),
          ),
        );
      activeCourses = Number(rows[0]?.c ?? 0);
    } else if (role === "instructor") {
      const rows = await db
        .select({ c: count() })
        .from(courses)
        .where(
          and(
            eq(courses.instructorId, userId),
            eq(courses.status, "published"),
          ),
        );
      activeCourses = Number(rows[0]?.c ?? 0);
    } else if (role === "admin") {
      const rows = await db
        .select({ c: count() })
        .from(courses)
        .where(eq(courses.status, "published"));
      activeCourses = Number(rows[0]?.c ?? 0);
    }
    // support → 0 (support has no courses)

    // ----- openTickets (role-dependent) -----
    let openTickets = 0;
    if (role === "support") {
      const rows = await db
        .select({ c: count() })
        .from(tickets)
        .where(and(eq(tickets.assignedTo, userId), eq(tickets.status, "open")));
      openTickets = Number(rows[0]?.c ?? 0);
    } else if (role === "admin") {
      const rows = await db
        .select({ c: count() })
        .from(tickets)
        .where(eq(tickets.status, "open"));
      openTickets = Number(rows[0]?.c ?? 0);
    } else {
      // student / instructor → tickets they created
      const rows = await db
        .select({ c: count() })
        .from(tickets)
        .where(and(eq(tickets.createdBy, userId), eq(tickets.status, "open")));
      openTickets = Number(rows[0]?.c ?? 0);
    }

    return { role, activeCourses, openTickets };
  },
);
