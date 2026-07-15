/**
 * POST /api/auth/request-email-otp
 *
 * Request body: { "email": "you@example.com" }
 * Response:
 *   200 { "ok": true, "devCode"?: "123456", "demoMode"?: true }
 *   400 { "error": "..." }
 *   429 { "error": "..." }
 *   503 { "error": "..." }
 *
 * Generates a 6-digit OTP, hashes it, persists it with a 2-minute TTL,
 * and either sends it via email (when SMTP is configured) or returns
 * it as devCode (dev mode — for UI display).
 *
 * Rate limited: max 3 requests per email in 10 minutes (per-phone limit
 * is in actions.server.ts; per-IP limit is in rate-limit middleware).
 */
import { createFileRoute } from "@tanstack/react-router";
import { issueOtpForEmail, jsonError } from "@/server/auth/actions.server";

export const Route = createFileRoute("/api/auth/request-email-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError("بدنه‌ی درخواست باید JSON معتبر باشد.", 400);
        }

        const email =
          typeof body === "object" && body !== null && "email" in body
            ? String((body as { email: unknown }).email ?? "")
            : "";

        if (!email) {
          return jsonError("فیلد «email» الزامی است.", 400);
        }

        const result = await issueOtpForEmail(email);
        if (!result.ok) {
          return jsonError(result.message, result.status);
        }
        return Response.json(result);
      },
    },
  },
});
