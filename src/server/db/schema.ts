/**
 * Drizzle ORM schema — Stage 1 (base infrastructure)
 *
 * This is the MINIMAL schema required for authentication + RBAC.
 * Tables for `courses`, `enrollments`, `instructor_applications`, etc.
 * will be added in later stages — do NOT add them here.
 *
 * Conventions:
 * - UUID primary keys (Postgres native uuid type)
 * - Timestamps stored as `timestamp with time zone` (UTC)
 * - Phone numbers stored as E.164-ish strings (Iranian format: 09xxxxxxxxx)
 */
import {
  pgSchema,
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  pgEnum,
  index,
  text,
  date,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * Custom schema namespace to keep IEC tables isolated from any other
 * tables that might live in the same Postgres database (e.g. on a shared
 * Neon/Liara instance). Public schema works too, but `iec` is cleaner.
 */
export const iecSchema = pgSchema("iec");

/* ------------------------------------------------------------------ */
/* Role enum                                                           */
/* ------------------------------------------------------------------ */

/**
 * Application roles. The order roughly reflects the privilege ladder:
 * `student` < `instructor` ≈ `support` < `admin`.
 *
 * `student`     — default role for any newly-registered phone number.
 * `instructor`  — can manage their own courses / sessions.
 * `support`     — can answer student questions and view enrollments.
 * `admin`       — full access to dashboard, users, courses, billing.
 */
export const roleEnum = iecSchema.enum("role", [
  "student",
  "instructor",
  "support",
  "admin",
]);

export type Role = (typeof roleEnum.enumValues)[number];

/* ------------------------------------------------------------------ */
/* users                                                               */
/* ------------------------------------------------------------------ */

export const users = iecSchema.table(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    /**
     * Email — used for email-based OTP login (free alternative to SMS).
     * Nullable for backward compat with existing users created via
     * phone OTP. Unique when present.
     */
    email: varchar("email", { length: 320 }),
    fullName: varchar("full_name", { length: 200 }),
    role: roleEnum("role").notNull().default("student"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("users_phone_idx").on(table.phone),
    index("users_email_idx").on(table.email),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/* ------------------------------------------------------------------ */
/* otp_codes                                                           */
/* ------------------------------------------------------------------ */

/**
 * One-time-passcode storage.
 *
 * Security notes:
 * - `codeHash` stores a SCRYPT hash of the 6-digit code. The plaintext
 *   code is NEVER persisted. In dev mode (no SMS_API_KEY), the plaintext
 *   is also logged to the server console for manual testing.
 * - `expiresAt` is checked at verify time. Expired codes are rejected
 *   and the row is left in place (cleaned up lazily) to allow rate-limit
 *   counting across the time window.
 * - `attempts` counts failed verification attempts. After 5 failed
 *   attempts the code is invalidated.
 */
export const otpCodes = iecSchema.table(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: varchar("phone", { length: 20 }).notNull(),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("otp_codes_phone_idx").on(table.phone),
    index("otp_codes_expires_at_idx").on(table.expiresAt),
  ],
);

export type OtpCode = typeof otpCodes.$inferSelect;
export type NewOtpCode = typeof otpCodes.$inferInsert;

/* ------------------------------------------------------------------ */
/* email_otp_codes — email-based OTP login (free alternative to SMS)  */
/* ------------------------------------------------------------------ */

/**
 * Email OTP storage — mirrors `otp_codes` but keyed by email instead
 * of phone. Used for the free email-based login flow.
 *
 * Security: same as `otp_codes` — scrypt-hashed codes, 2-min TTL,
 * 5 max attempts, rate-limited per email.
 */
export const emailOtpCodes = iecSchema.table(
  "email_otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("email_otp_codes_email_idx").on(table.email),
    index("email_otp_codes_expires_at_idx").on(table.expiresAt),
  ],
);

export type EmailOtpCode = typeof emailOtpCodes.$inferSelect;
export type NewEmailOtpCode = typeof emailOtpCodes.$inferInsert;

/* ------------------------------------------------------------------ */
/* sessions                                                            */
/* ------------------------------------------------------------------ */

/**
 * Server-side session storage. The browser only holds an opaque token
 * (the SHA-256 hash of which is stored here as `tokenHash`). The token
 * itself is never persisted server-side, so a DB leak cannot directly
 * hijack sessions.
 *
 * - `tokenHash`    — sha256(token), unique. Indexed for fast lookup.
 * - `expiresAt`    — absolute expiry. Refresh on activity is a later
 *                    concern (Stage 2+); for now we use a fixed 7-day
 *                    sliding window starting at issue time.
 * - On logout the row is deleted.
 */
export const sessions = iecSchema.table(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

/* ------------------------------------------------------------------ */
/* instructor_applications (Stage 3)                                   */
/* ------------------------------------------------------------------ */

/**
 * Application status enum.
 *
 * - `pending`   — submitted, awaiting review
 * - `approved`  — reviewer approved; user.role flipped to `instructor`
 *                 in the same DB transaction
 * - `rejected`  — reviewer rejected; `review_note` contains the reason
 *
 * Lifecycle: pending → (approved | rejected). No further transitions
 * once approved/rejected. A user with a rejected application can submit
 * a new one (the old row stays for audit).
 */
export const applicationStatusEnum = iecSchema.enum("application_status", [
  "pending",
  "approved",
  "rejected",
]);

export type ApplicationStatus =
  (typeof applicationStatusEnum.enumValues)[number];

/**
 * Instructor applications — the first real workflow in the system.
 *
 * Business rules enforced at the server-function layer (NOT just DB):
 * 1. A user may not have more than ONE pending application at a time.
 *    (Checked in `submitInstructorApplication` before insert.)
 * 2. On approval, `users.role` for the applicant is set to `instructor`
 *    in the SAME Drizzle transaction as the application status update —
 *    so the two changes are atomic.
 * 3. `reviewed_by` is the support/admin user who acted on the request.
 *    `reviewed_at` is set when the review happens.
 *
 * Schema design notes:
 * - `specialization` is a short string (e.g. "برنامه‌نویسی پایتون") — not
 *   a normalized FK to a categories table. Stage 5 (course creation)
 *   may introduce a proper categories table; for now, free text is fine.
 * - `sample_work_url` is a single URL — file uploads are deferred to a
 *   later stage. NULL is allowed (the field is optional in the form).
 * - `review_note` is required when status = rejected, NULL otherwise.
 *   Enforced in the server function, not via CHECK constraint (Drizzle
 *   doesn't expose table-level CHECKs cleanly, and the rule is more
 *   naturally expressed in code).
 * - Indexes: `user_id` (for "my applications" lookup), `status` (for
 *   the review queue filter), `created_at` desc (for newest-first sort).
 */
export const instructorApplications = iecSchema.table(
  "instructor_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    specialization: varchar("specialization", { length: 200 }).notNull(),
    bio: text("bio").notNull(),
    experienceYears: integer("experience_years"),
    sampleWorkUrl: varchar("sample_work_url", { length: 1000 }),
    status: applicationStatusEnum("status").notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("instructor_applications_user_id_idx").on(table.userId),
    index("instructor_applications_status_idx").on(table.status),
    index("instructor_applications_created_at_idx").on(table.createdAt),
  ],
);

export type InstructorApplication = typeof instructorApplications.$inferSelect;
export type NewInstructorApplication =
  typeof instructorApplications.$inferInsert;

/* ------------------------------------------------------------------ */
/* courses (Stage 4)                                                   */
/* ------------------------------------------------------------------ */

/**
 * Course difficulty level.
 *
 * Named in English (not Persian) because this is an internal enum —
 * the Persian label is applied at display time. Matches the spirit of
 * the existing static `Level` type in `src/types/index.ts` (which uses
 * Persian strings), but kept separate so the DB enum is stable across
 * UI locale changes.
 */
export const courseLevelEnum = iecSchema.enum("course_level", [
  "beginner",
  "intermediate",
  "advanced",
]);

export type CourseLevel = (typeof courseLevelEnum.enumValues)[number];

/**
 * Course review status (the workflow state machine).
 *
 * Lifecycle:
 *   draft → pending_review → published
 *                        ↘ rejected
 *
 * - `draft`          — instructor is still editing (not submitted)
 * - `pending_review` — submitted, awaiting support/admin review
 * - `published`      — approved; visible on the public /courses page
 *                      AND in internal panels.
 * - `rejected`       — reviewer rejected; `review_note` has the reason.
 *                      Instructor can edit and resubmit (creates a new
 *                      `pending_review` row — the rejected row stays
 *                      for audit).
 */
export const courseStatusEnum = iecSchema.enum("course_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
]);

export type CourseStatus = (typeof courseStatusEnum.enumValues)[number];

/**
 * Course source — distinguishes courses migrated from the static
 * `src/data/courses.ts` file from courses created by real instructors
 * via the platform's create-course wizard.
 *
 * - `legacy`   — migrated from the static catalog. `instructorId` is
 *                null; `legacyInstructorName` may carry the original
 *                instructor name if known. These courses have
 *                `status: published` by default (they were already
 *                public on the old site).
 * - `platform` — created via the platform wizard by a real instructor.
 *                `instructorId` points to a `users` row with role
 *                `instructor` (or `admin`).
 */
export const courseSourceEnum = iecSchema.enum("course_source", [
  "legacy",
  "platform",
]);

export type CourseSource = (typeof courseSourceEnum.enumValues)[number];

/**
 * Display category — controls which section of the public /courses page
 * a course appears in. INDEPENDENT of `status` (which tracks the
 * review workflow).
 *
 * - `upcoming`  — future course, shown in «دوره‌های پیش‌رو»
 * - `current`   — active course open for registration, shown in
 *                 «دوره‌های در حال برگزاری»
 * - `archived`  — past course, shown in «دوره‌های برگزار شده»
 *
 * If `displayCategory` is NULL, it's computed at display time from
 * `startDate` + `durationSessions` (past = archived, now = current,
 * future = upcoming). An admin/support can override it manually when
 * the auto-computation doesn't match reality.
 */
export const displayCategoryEnum = iecSchema.enum("display_category", [
  "upcoming",
  "current",
  "archived",
]);

export type DisplayCategory = (typeof displayCategoryEnum.enumValues)[number];

/**
 * Courses — created by instructors OR migrated from the static catalog.
 *
 * Naming alignment with the static `Course` type in `src/types/index.ts`:
 *   - `title`, `slug`, `category`, `level`, `description`, `startDate`
 *     deliberately mirror the static type's field names.
 *   - `level` here is an enum (`beginner/intermediate/advanced`) while
 *     the static type uses Persian strings. A mapping helper
 *     (`levelToPersian`) converts at display time.
 *   - `syllabus` is a single text field (multi-line).
 *
 * Cover image strategy (Stage 5):
 *   The static `Course` type has `cover: { webp, jpg }` (two URLs for
 *   the same image in different formats). The DB stores these as two
 *   separate columns:
 *     - `coverWebpUrl` — WebP variant (preferred for modern browsers)
 *     - `coverJpgUrl`  — JPEG fallback
 *   For `legacy` courses, both are set to `/images/courses/{slug}.webp`
 *   and `.jpg` respectively (self-hosted files that already exist).
 *   For `platform` courses, the instructor provides a single `posterUrl`
 *   in the wizard; that URL is stored in BOTH columns (the browser will
 *   try WebP first; if the URL is actually a JPEG, the `<source>` tag
 *   will gracefully fall through to the `<img>`). A future stage can
 *   add proper image upload + transcoding.
 *
 * Nullable fields note:
 *   - `instructorId` is NULL for `legacy` courses (no real user).
 *   - `description`, `syllabus`, `durationSessions`, `level` are
 *     nullable because legacy courses don't have them (the static
 *     catalog only has title + cover + category). Platform courses
 *     require them (enforced in the server function validator).
 *
 * Business rules (enforced in server functions, not DB):
 *   - Only `instructor`/`admin` can create `platform` courses.
 *   - `slug` is auto-generated from `title` and guaranteed unique.
 *   - Once `published`, a course cannot go back to `draft`.
 */
export const courses = iecSchema.table(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable for legacy courses that have no real instructor user.
    instructorId: uuid("instructor_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    category: varchar("category", { length: 200 }).notNull(),
    // Nullable for legacy courses.
    level: courseLevelEnum("level"),
    // Nullable for legacy courses.
    description: text("description"),
    // Nullable for legacy courses.
    syllabus: text("syllabus"),
    // Nullable for legacy courses.
    durationSessions: integer("duration_sessions"),
    capacity: integer("capacity"),
    price: integer("price"),
    prerequisites: text("prerequisites"),
    // Single URL for poster (kept for backward compat with Stage 4).
    posterUrl: varchar("poster_url", { length: 1000 }),
    // Two-column cover (Stage 5) — see "Cover image strategy" above.
    coverWebpUrl: varchar("cover_webp_url", { length: 1000 }),
    coverJpgUrl: varchar("cover_jpg_url", { length: 1000 }),
    startDate: date("start_date"),
    status: courseStatusEnum("status").notNull().default("draft"),
    // Source: legacy (migrated) vs platform (real instructor).
    source: courseSourceEnum("source").notNull().default("platform"),
    // Display category — controls public page section. NULL = auto-compute.
    displayCategory: displayCategoryEnum("display_category"),
    // Legacy instructor info (when instructorId is NULL).
    legacyInstructorName: varchar("legacy_instructor_name", { length: 200 }),
    legacyInstructorAvatarUrl: varchar("legacy_instructor_avatar_url", {
      length: 1000,
    }),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("courses_instructor_id_idx").on(table.instructorId),
    index("courses_status_idx").on(table.status),
    index("courses_slug_idx").on(table.slug),
    index("courses_source_idx").on(table.source),
    index("courses_display_category_idx").on(table.displayCategory),
    index("courses_created_at_idx").on(table.createdAt),
  ],
);

export type CourseRow = typeof courses.$inferSelect;
export type NewCourseRow = typeof courses.$inferInsert;

/* ------------------------------------------------------------------ */
/* enrollments (Stage 5 — payment + wallet)                            */
/* ------------------------------------------------------------------ */

/**
 * Enrollment status (payment review workflow).
 *
 * Lifecycle:
 *   pending_payment_review → confirmed
 *                        ↘ rejected
 *
 * - `pending_payment_review` — student uploaded a receipt; awaiting
 *                              support to verify the payment.
 * - `confirmed`              — support confirmed; wallet credited.
 * - `rejected`               — support rejected; `review_note` has why.
 *
 * Business rule: a student may not have more than ONE
 * `pending_payment_review` enrollment per course at a time. Enforced
 * in the server function.
 */
export const enrollmentStatusEnum = iecSchema.enum("enrollment_status", [
  "pending_payment_review",
  "confirmed",
  "rejected",
]);

export type EnrollmentStatus = (typeof enrollmentStatusEnum.enumValues)[number];

/**
 * Enrollments — a student's registration + payment for a course.
 *
 * Payment flow (manual, no gateway):
 *   1. Student uploads a receipt image → row created with
 *      `pending_payment_review`.
 *   2. Support reviews the receipt in the payment queue.
 *   3. On confirm: `wallets.balance += net` (where
 *      `net = declared_amount - commission`) in a single transaction
 *      with this row's status flip. Commission rate is snapshot at
 *      confirm time into `wallet_transactions.commission_rate_applied`.
 *   4. On reject: `review_note` explains why.
 */
export const enrollments = iecSchema.table(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    declaredAmount: integer("declared_amount").notNull(),
    receiptImagePath: varchar("receipt_image_path", { length: 500 }).notNull(),
    status: enrollmentStatusEnum("status")
      .notNull()
      .default("pending_payment_review"),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("enrollments_student_id_idx").on(table.studentId),
    index("enrollments_course_id_idx").on(table.courseId),
    index("enrollments_status_idx").on(table.status),
    index("enrollments_created_at_idx").on(table.createdAt),
  ],
);

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

/* ------------------------------------------------------------------ */
/* wallets (Stage 5)                                                   */
/* ------------------------------------------------------------------ */

/**
 * Wallets — one per user (instructor). Balance is in Tomans (integer).
 *
 * Created lazily: the first time an enrollment for a course taught by
 * this instructor is confirmed, the wallet row is created (if it
 * doesn't already exist) and the net amount is credited.
 *
 * `balance` is the canonical source of truth for "how much can the
 * instructor withdraw". It's updated atomically with each
 * `wallet_transactions` insert (inside the same DB transaction).
 */
export const wallets = iecSchema.table(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("wallets_user_id_idx").on(table.userId)],
);

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;

/* ------------------------------------------------------------------ */
/* wallet_transactions (Stage 5)                                       */
/* ------------------------------------------------------------------ */

/**
 * Transaction type.
 * - `credit` — money added to the wallet (e.g. enrollment confirmed)
 * - `debit`  — money removed (e.g. withdrawal — not implemented yet)
 */
export const walletTransactionTypeEnum = iecSchema.enum(
  "wallet_transaction_type",
  ["credit", "debit"],
);

export type WalletTransactionType =
  (typeof walletTransactionTypeEnum.enumValues)[number];

/**
 * Wallet transactions — immutable audit log of every balance change.
 *
 * - `commissionRateApplied` — the commission rate (percent) at the time
 *   of confirmation. Snapshot here so future rate changes don't affect
 *   historical transactions. NULL for non-enrollment credits (e.g.
 *   manual adjustments — not implemented yet).
 * - `relatedEnrollmentId` — the enrollment that triggered this credit.
 *   NULL for non-enrollment transactions.
 *
 * Every row in this table MUST be accompanied by an atomic
 * `wallets.balance` update in the same transaction. Reading the sum
 * of `amount` (filtered by type) should always equal `wallets.balance`.
 */
export const walletTransactions = iecSchema.table(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    type: walletTransactionTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    commissionRateApplied: integer("commission_rate_applied"),
    relatedEnrollmentId: uuid("related_enrollment_id").references(
      () => enrollments.id,
      { onDelete: "set null" },
    ),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("wallet_transactions_wallet_id_idx").on(table.walletId),
    index("wallet_transactions_created_at_idx").on(table.createdAt),
  ],
);

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type NewWalletTransaction = typeof walletTransactions.$inferInsert;

/* ------------------------------------------------------------------ */
/* audit_logs (Stage 6)                                                */
/* ------------------------------------------------------------------ */

/**
 * Audit logs — immutable record of every significant action in the system.
 *
 * Purpose: security forensics + transparency. If something goes wrong
 * (e.g. a payment is confirmed by mistake, a role is changed unexpectedly),
 * the audit log shows WHO did WHAT, WHEN, and with what metadata.
 *
 * `actorId` is nullable for system-initiated actions (e.g. cron jobs).
 * `action` is a dotted string like `"instructor_application.approved"`
 * so it's easy to grep/filter.
 * `metadata` is JSONB — stores arbitrary details (amount, reason, etc.)
 * without needing schema changes for each new action type.
 *
 * This table is WRITE-ONLY from the application — no UPDATE or DELETE
 * is ever issued. Rows are kept indefinitely (or archived to cold
 * storage by an admin script).
 */
export const auditLogs = iecSchema.table(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 100 }).notNull(),
    targetType: varchar("target_type", { length: 50 }),
    targetId: uuid("target_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_actor_id_idx").on(table.actorId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_target_type_target_id_idx").on(
      table.targetType,
      table.targetId,
    ),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

/* ------------------------------------------------------------------ */
/* tickets (Stage 6)                                                   */
/* ------------------------------------------------------------------ */

/**
 * Ticket status lifecycle:
 *   open → in_progress → closed
 *
 * - `open`        — created by user, not yet picked up by support
 * - `in_progress` — a support agent has assigned it to themselves
 * - `closed`      — resolved (by support or user)
 */
export const ticketStatusEnum = iecSchema.enum("ticket_status", [
  "open",
  "in_progress",
  "closed",
]);

export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];

/**
 * Support tickets — users can ask questions / report issues; support
 * staff respond and close.
 *
 * `assignedTo` is the support/admin user who picked up the ticket.
 * `createdBy` is the user who opened it (any role).
 */
export const tickets = iecSchema.table(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: varchar("subject", { length: 200 }).notNull(),
    status: ticketStatusEnum("status").notNull().default("open"),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("tickets_created_by_idx").on(table.createdBy),
    index("tickets_status_idx").on(table.status),
    index("tickets_assigned_to_idx").on(table.assignedTo),
    index("tickets_created_at_idx").on(table.createdAt),
  ],
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;

/* ------------------------------------------------------------------ */
/* ticket_messages (Stage 6)                                           */
/* ------------------------------------------------------------------ */

/**
 * Messages within a ticket — the conversation thread.
 *
 * `senderId` is the user who sent the message (either the ticket creator
 * or a support/admin). Messages are immutable once sent — no editing
 * or deletion (for audit integrity).
 */
export const ticketMessages = iecSchema.table(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ticket_messages_ticket_id_idx").on(table.ticketId),
    index("ticket_messages_created_at_idx").on(table.createdAt),
  ],
);

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type NewTicketMessage = typeof ticketMessages.$inferInsert;
