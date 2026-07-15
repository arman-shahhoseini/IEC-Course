/**
 * POST /api/auth/request-otp
 *
 * Request body: { "phone": "09123456789" }
 * Response:
 *   200 { "ok": true, "devCode"?: "123456" }   // devCode only when SMS_API_KEY is unset
 *   400 { "error": "..." }
 *   429 { "error": "..." }
 *   503 { "error": "..." }
 *
 * Generates a 6-digit OTP, hashes it, persists it with a 2-minute TTL,
 * and either sends it via SMS (when SMS_API_KEY is set) or logs it to
 * the server console (dev fallback).
 *
 * Rate limited: max 3 requests per phone in 10 minutes.
 */
import { createFileRoute } from "@tanstack/react-router";
import { issueOtpForPhone, jsonError } from "@/server/auth/actions.server";

export const Route = createFileRoute("/api/auth/request-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError("بدنه‌ی درخواست باید JSON معتبر باشد.", 400);
        }

        const phone =
          typeof body === "object" && body !== null && "phone" in body
            ? String((body as { phone: unknown }).phone ?? "")
            : "";

        if (!phone) {
          return jsonError("فیلد «phone» الزامی است.", 400);
        }

        const result = await issueOtpForPhone(phone);
        if (!result.ok) {
          return jsonError(result.message, result.status);
        }
        return Response.json(result);
      },
    },
  },
});
