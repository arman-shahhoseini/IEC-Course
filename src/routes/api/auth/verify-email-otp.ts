/**
 * POST /api/auth/verify-email-otp
 *
 * Request body: { "email": "you@example.com", "code": "123456", "phone"?: "09..." }
 * Response:
 *   200 { "ok": true, "user": { id, phone, email, fullName, role, isActive } }
 *   400 { "error": "..." }
 *   422 { "error": "..." }
 *   503 { "error": "..." }
 *
 * Verifies the 6-digit OTP against the most-recent unused code for the
 * email. On success: finds-or-creates the user (keyed by email),
 * optionally updates their phone, issues a session, sets the cookie.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyOtpForEmail, jsonError } from "@/server/auth/actions.server";

export const Route = createFileRoute("/api/auth/verify-email-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError("بدنه‌ی درخواست باید JSON معتبر باشد.", 400);
        }

        const d = body as Record<string, unknown>;
        const email = typeof d.email === "string" ? d.email : "";
        const code = typeof d.code === "string" ? d.code : "";
        const phone = typeof d.phone === "string" ? d.phone : undefined;

        if (!email || !code) {
          return jsonError("ایمیل و کد الزامی است.", 400);
        }

        const result = await verifyOtpForEmail(email, code, phone);
        if (!result.ok) {
          return jsonError(result.message, result.status);
        }
        return Response.json({ ok: true, user: result.user });
      },
    },
  },
});
