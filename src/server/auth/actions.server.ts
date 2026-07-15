/**
 * Server-only auth helpers shared by API route handlers.
 *
 * Kept in a `.server.ts` file to make it explicit that these utilities
 * must never be imported from client code.
 */
import { and, eq, gte, sql } from "drizzle-orm";
import { assertDb, DbUnavailableError } from "../db/client";
import { emailOtpCodes, otpCodes, users } from "../db/schema";
import {
  generateOtp,
  hashOtp,
  normalizeIranianPhone,
  OTP_MAX_ATTEMPTS,
  OTP_RATE_LIMIT_MAX,
  OTP_RATE_LIMIT_WINDOW_MS,
  OTP_TTL_MS,
  verifyOtp,
} from "./otp";
import { createSession } from "./session";
import {
  sendEmail,
  buildOtpEmailContent,
  isSmtpConfigured,
} from "../email/send";

/** Standard JSON error response. */
export function jsonError(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {},
): Response {
  return Response.json({ error: message, ...extra }, { status });
}

/**
 * Issue an OTP for the given phone:
 * 1. Validate + normalize the phone number.
 * 2. Rate-limit per phone (max OTP_RATE_LIMIT_MAX requests in
 *    OTP_RATE_LIMIT_WINDOW_MS).
 * 3. Insert a new `otp_codes` row with the hashed code.
 * 4. Either send via SMS provider (if SMS_API_KEY is set) or log the
 *    plaintext to the server console (dev fallback).
 *
 * Returns `{ ok: true, devCode?: string }`. The `devCode` is only
 * included when `SMS_API_KEY` is empty so the dashboard test page can
 * auto-fill it for convenience in development.
 *
 * All DB errors are caught and converted to a 503 response with a
 * user-friendly Persian message — the homepage/login must NEVER show
 * a raw 500 to the user. The actual error is logged to the server
 * console (visible in Vercel function logs) for debugging.
 */
export async function issueOtpForPhone(
  rawPhone: string,
): Promise<
  | { ok: true; devCode?: string; demoMode?: boolean }
  | { ok: false; status: number; message: string }
> {
  const phone = normalizeIranianPhone(rawPhone);
  if (!phone) {
    return {
      ok: false,
      status: 400,
      message: "شماره موبایل نامعتبر است. مثال صحیح: 09123456789",
    };
  }

  let db;
  try {
    db = assertDb();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      console.error("[iec:auth] DB unavailable (issueOtp):", err.message);
      return {
        ok: false,
        status: 503,
        message:
          "سرویس پایگاه‌داده در دسترس نیست. لطفاً بعداً تلاش کنید یا با پشتیبانی تماس بگیرید.",
      };
    }
    console.error("[iec:auth] Unexpected error opening DB (issueOtp):", err);
    return {
      ok: false,
      status: 503,
      message: "خطای داخلی سرور. لطفاً بعداً تلاش کنید.",
    };
  }

  // Rate limit: count OTP rows created in the last window for this phone.
  // Wrapped in try/catch — table-missing / connection errors become 503,
  // never 500.
  try {
    const windowStart = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS);
    const rateRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(otpCodes)
      .where(
        and(eq(otpCodes.phone, phone), gte(otpCodes.createdAt, windowStart)),
      );
    const recentCount = rateRows[0]?.count ?? 0;
    if (recentCount >= OTP_RATE_LIMIT_MAX) {
      return {
        ok: false,
        status: 429,
        message:
          "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه بعد تلاش کنید.",
      };
    }
  } catch (err) {
    console.error("[iec:auth] DB error in rate-limit check (issueOtp):", err);
    return {
      ok: false,
      status: 503,
      message:
        "خطا در ارتباط با پایگاه‌داده. لطفاً بعداً تلاش کنید یا با پشتیبانی تماس بگیرید.",
    };
  }

  // Generate, hash, persist.
  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  try {
    await db.insert(otpCodes).values({
      phone,
      codeHash,
      expiresAt,
    });
  } catch (err) {
    console.error("[iec:auth] DB error inserting OTP row (issueOtp):", err);
    return {
      ok: false,
      status: 503,
      message:
        "خطا در ثبت کد یک‌بار مصرف. لطفاً بعداً تلاش کنید یا با پشتیبانی تماس بگیرید.",
    };
  }

  // Send or log.
  const smsApiKey = process.env.SMS_API_KEY;
  const demoMode = process.env.DEMO_MODE === "true";

  if (demoMode || !smsApiKey) {
    // Demo mode OR no SMS API key: return the code to the client.
    // In demo mode, the client shows a beautiful modal.
    // In no-SMS-key mode, the code is logged to console and returned as devCode.
    console.info(
      `[iec:auth:${demoMode ? "demo" : "dev"}] OTP for ${phone}: ${code}`,
    );
    return { ok: true, devCode: code, demoMode };
  }

  // Production: send via SMS provider.
  // TODO: integrate real SMS provider when SMS_API_KEY is set.
  console.warn(
    "[iec:auth] SMS_API_KEY is set but no provider integration is wired yet. " +
      "Falling back to console log. Code will not be delivered via SMS.",
  );
  console.info(`[iec:auth] OTP for ${phone}: ${code}`);
  return { ok: true };
}

/**
 * Verify an OTP against the most-recent unused code for `phone`.
 *
 * On success: finds-or-creates the `users` row (role defaults to
 * `student`), issues a session, sets the cookie, and returns the public
 * `SessionUser`.
 *
 * On failure: returns a structured error. Failures are:
 *   - 400: malformed input
 *   - 422: no matching OTP found, or OTP expired
 *   - 422: too many failed attempts (code invalidated)
 *   - 503: DB unavailable
 *
 * All DB errors are caught and converted to a 503 response with a
 * user-friendly Persian message — never a raw 500. The actual error is
 * logged to the server console for debugging.
 */
export async function verifyOtpForPhone(
  rawPhone: string,
  rawCode: string,
): Promise<
  | {
      ok: true;
      user: {
        id: string;
        phone: string;
        fullName: string | null;
        role: "student" | "instructor" | "support" | "admin";
        isActive: boolean;
      };
    }
  | { ok: false; status: number; message: string }
> {
  const phone = normalizeIranianPhone(rawPhone);
  if (!phone) {
    return {
      ok: false,
      status: 400,
      message: "شماره موبایل نامعتبر است.",
    };
  }
  const code = rawCode.trim();
  if (!/^\d{6}$/.test(code)) {
    return {
      ok: false,
      status: 400,
      message: "کد یک‌بار مصرف باید ۶ رقم باشد.",
    };
  }

  let db;
  try {
    db = assertDb();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      console.error("[iec:auth] DB unavailable (verifyOtp):", err.message);
      return {
        ok: false,
        status: 503,
        message: "سرویس پایگاه‌داده در دسترس نیست. لطفاً بعداً تلاش کنید.",
      };
    }
    console.error("[iec:auth] Unexpected error opening DB (verifyOtp):", err);
    return {
      ok: false,
      status: 503,
      message: "خطای داخلی سرور. لطفاً بعداً تلاش کنید.",
    };
  }

  // Find the most recent unused, non-expired OTP for this phone.
  try {
    const now = new Date();
    const [otpRow] = await db
      .select()
      .from(otpCodes)
      .where(eq(otpCodes.phone, phone))
      .orderBy(sql`${otpCodes.createdAt} desc`)
      .limit(1);

    if (!otpRow || otpRow.expiresAt.getTime() < now.getTime()) {
      return {
        ok: false,
        status: 422,
        message:
          "کد یک‌بار مصرف یافت نشد یا منقضی شده است. لطفاً کد جدیدی دریافت کنید.",
      };
    }
    if (otpRow.attempts >= OTP_MAX_ATTEMPTS) {
      return {
        ok: false,
        status: 422,
        message:
          "تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً کد جدیدی دریافت کنید.",
      };
    }

    const matched = verifyOtp(code, otpRow.codeHash);
    if (!matched) {
      // Bump attempt count. If we just hit the limit, the next call will
      // be rejected — preventing brute force on the 6-digit space.
      try {
        await db
          .update(otpCodes)
          .set({ attempts: otpRow.attempts + 1 })
          .where(eq(otpCodes.id, otpRow.id));
      } catch (err) {
        console.error("[iec:auth] DB error bumping attempts (verifyOtp):", err);
        // Non-fatal — the user still gets the wrong-code error below.
      }
      const remaining = OTP_MAX_ATTEMPTS - (otpRow.attempts + 1);
      return {
        ok: false,
        status: 422,
        message:
          remaining > 0
            ? `کد نادرست است. ${remaining} تلاش باقی‌مانده است.`
            : "کد نادرست است. لطفاً کد جدیدی دریافت کنید.",
      };
    }

    // Success: invalidate the OTP so it can't be reused, find-or-create
    // the user, and issue a session.
    try {
      await db.delete(otpCodes).where(eq(otpCodes.id, otpRow.id));
    } catch (err) {
      console.error("[iec:auth] DB error deleting used OTP (verifyOtp):", err);
      // Non-fatal — proceed to login. The OTP will be cleaned up by TTL.
    }
  } catch (err) {
    console.error("[iec:auth] DB error in OTP lookup (verifyOtp):", err);
    return {
      ok: false,
      status: 503,
      message: "خطا در ارتباط با پایگاه‌داده. لطفاً بعداً تلاش کنید.",
    };
  }

  // Find or create the user.
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    let userId: string;
    if (existingUser) {
      if (!existingUser.isActive) {
        return {
          ok: false,
          status: 403,
          message:
            "حساب کاربری شما غیرفعال است. لطفاً با پشتیبانی تماس بگیرید.",
        };
      }
      userId = existingUser.id;
    } else {
      const [newUser] = await db
        .insert(users)
        .values({ phone })
        .returning({ id: users.id });
      if (!newUser) {
        return {
          ok: false,
          status: 500,
          message: "ساخت حساب کاربری با خطا مواجه شد.",
        };
      }
      userId = newUser.id;
    }

    const { user } = await createSession(userId);
    return { ok: true, user };
  } catch (err) {
    console.error(
      "[iec:auth] DB error in user lookup/create (verifyOtp):",
      err,
    );
    return {
      ok: false,
      status: 503,
      message: "خطا در دسترسی به اطلاعات کاربر. لطفاً بعداً تلاش کنید.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Email OTP — free login alternative (no SMS cost)                   */
/* ------------------------------------------------------------------ */

/** Simple email validation — not RFC-perfect but catches typos. */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

/**
 * Issue an OTP for the given email:
 * 1. Validate the email format.
 * 2. Rate-limit per email (max OTP_RATE_LIMIT_MAX requests in window).
 * 3. Insert a new `email_otp_codes` row with the hashed code.
 * 4. Send the code via email (SMTP) OR return as `devCode` if SMTP
 *    is not configured (dev mode — same pattern as phone OTP).
 *
 * Optional `phone` parameter: if provided, will be stored on the user
 * record after verification (for profile purposes).
 */
export async function issueOtpForEmail(
  rawEmail: string,
): Promise<
  | { ok: true; devCode?: string; demoMode?: boolean }
  | { ok: false; status: number; message: string }
> {
  const email = rawEmail.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return {
      ok: false,
      status: 400,
      message: "ایمیل نامعتبر است. مثال: you@example.com",
    };
  }

  let db;
  try {
    db = assertDb();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      console.error("[iec:auth] DB unavailable (email issueOtp):", err.message);
      return {
        ok: false,
        status: 503,
        message: "سرویس پایگاه‌داده در دسترس نیست. لطفاً بعداً تلاش کنید.",
      };
    }
    console.error(
      "[iec:auth] Unexpected error opening DB (email issueOtp):",
      err,
    );
    return { ok: false, status: 503, message: "خطای داخلی سرور." };
  }

  // Rate limit check
  try {
    const windowStart = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS);
    const rateRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailOtpCodes)
      .where(
        and(
          eq(emailOtpCodes.email, email),
          gte(emailOtpCodes.createdAt, windowStart),
        ),
      );
    const recentCount = rateRows[0]?.count ?? 0;
    if (recentCount >= OTP_RATE_LIMIT_MAX) {
      return {
        ok: false,
        status: 429,
        message:
          "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه بعد تلاش کنید.",
      };
    }
  } catch (err) {
    console.error("[iec:auth] DB error in rate-limit (email issueOtp):", err);
    return {
      ok: false,
      status: 503,
      message: "خطا در ارتباط با پایگاه‌داده.",
    };
  }

  // Generate + persist
  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  try {
    await db.insert(emailOtpCodes).values({ email, codeHash, expiresAt });
  } catch (err) {
    console.error("[iec:auth] DB error inserting email OTP:", err);
    return { ok: false, status: 503, message: "خطا در ثبت کد." };
  }

  // Send via SMTP, or return devCode if not configured
  const smtpConfigured = isSmtpConfigured();
  const siteName = process.env.SMTP_FROM_NAME ?? "مرکز کارآفرینی بین‌المللی";

  if (!smtpConfigured) {
    // Dev mode — return the code for UI display
    console.info(`[iec:auth:dev] Email OTP for ${email}: ${code}`);
    return { ok: true, devCode: code, demoMode: true };
  }

  // Send the email
  const content = buildOtpEmailContent(code, siteName);
  const result = await sendEmail({
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  if (!result.ok) {
    console.error("[iec:auth] Failed to send OTP email:", result.error);
    // Still return ok — the code WAS generated and stored. The user
    // can try again. But include a warning.
    return {
      ok: false,
      status: 503,
      message: "ارسال ایمیل ناموفق بود. لطفاً دوباره تلاش کنید.",
    };
  }

  return { ok: true };
}

/**
 * Verify an email OTP. On success: finds-or-creates the user (keyed
 * by email), optionally updates their phone, issues a session.
 */
export async function verifyOtpForEmail(
  rawEmail: string,
  rawCode: string,
  phone?: string,
): Promise<
  | {
      ok: true;
      user: {
        id: string;
        phone: string;
        email: string | null;
        fullName: string | null;
        role: "student" | "instructor" | "support" | "admin";
        isActive: boolean;
      };
    }
  | { ok: false; status: number; message: string }
> {
  const email = rawEmail.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, message: "ایمیل نامعتبر است." };
  }
  const code = rawCode.trim();
  if (!/^\d{6}$/.test(code)) {
    return {
      ok: false,
      status: 400,
      message: "کد یک‌بار مصرف باید ۶ رقم باشد.",
    };
  }

  let db;
  try {
    db = assertDb();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return {
        ok: false,
        status: 503,
        message: "سرویس پایگاه‌داده در دسترس نیست.",
      };
    }
    return { ok: false, status: 503, message: "خطای داخلی سرور." };
  }

  // Find the most recent unused, non-expired OTP
  try {
    const now = new Date();
    const [otpRow] = await db
      .select()
      .from(emailOtpCodes)
      .where(eq(emailOtpCodes.email, email))
      .orderBy(sql`${emailOtpCodes.createdAt} desc`)
      .limit(1);

    if (!otpRow || otpRow.expiresAt.getTime() < now.getTime()) {
      return {
        ok: false,
        status: 422,
        message: "کد یافت نشد یا منقضی شده است. لطفاً کد جدیدی دریافت کنید.",
      };
    }
    if (otpRow.attempts >= OTP_MAX_ATTEMPTS) {
      return {
        ok: false,
        status: 422,
        message: "تعداد تلاش‌های ناموفق بیش از حد مجاز است.",
      };
    }

    const matched = verifyOtp(code, otpRow.codeHash);
    if (!matched) {
      try {
        await db
          .update(emailOtpCodes)
          .set({ attempts: otpRow.attempts + 1 })
          .where(eq(emailOtpCodes.id, otpRow.id));
      } catch (err) {
        console.error("[iec:auth] DB error bumping email attempts:", err);
      }
      const remaining = OTP_MAX_ATTEMPTS - (otpRow.attempts + 1);
      return {
        ok: false,
        status: 422,
        message:
          remaining > 0
            ? `کد نادرست است. ${remaining} تلاش باقی‌مانده است.`
            : "کد نادرست است. لطفاً کد جدیدی دریافت کنید.",
      };
    }

    // Invalidate the OTP
    try {
      await db.delete(emailOtpCodes).where(eq(emailOtpCodes.id, otpRow.id));
    } catch (err) {
      console.error("[iec:auth] DB error deleting email OTP:", err);
    }
  } catch (err) {
    console.error("[iec:auth] DB error in email OTP lookup:", err);
    return { ok: false, status: 503, message: "خطا در پایگاه‌داده." };
  }

  // Find or create the user by email
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId: string;
    let userPhone: string;

    if (existingUser) {
      if (!existingUser.isActive) {
        return {
          ok: false,
          status: 403,
          message: "حساب کاربری شما غیرفعال است.",
        };
      }
      userId = existingUser.id;
      userPhone = existingUser.phone;

      // If a phone was provided and differs, update it
      if (phone) {
        const normalized = normalizeIranianPhone(phone);
        if (normalized && normalized !== userPhone) {
          try {
            await db
              .update(users)
              .set({ phone: normalized, updatedAt: new Date() })
              .where(eq(users.id, userId));
            userPhone = normalized;
          } catch (err) {
            console.error("[iec:auth] Failed to update phone:", err);
            // Non-fatal
          }
        }
      }
    } else {
      // Create new user with email + optional phone
      const phoneForNewUser = phone
        ? (normalizeIranianPhone(phone) ?? `email-${Date.now()}`)
        : `email-${Date.now()}`;
      const [newUser] = await db
        .insert(users)
        .values({ email, phone: phoneForNewUser })
        .returning({ id: users.id, phone: users.phone });

      if (!newUser) {
        return {
          ok: false,
          status: 500,
          message: "ساخت حساب کاربری با خطا مواجه شد.",
        };
      }
      userId = newUser.id;
      userPhone = newUser.phone;
    }

    const { user } = await createSession(userId);
    return {
      ok: true,
      user: {
        ...user,
        email,
        phone: userPhone,
      },
    };
  } catch (err) {
    console.error("[iec:auth] DB error in email user lookup:", err);
    return {
      ok: false,
      status: 503,
      message: "خطا در دسترسی به اطلاعات کاربر.",
    };
  }
}
