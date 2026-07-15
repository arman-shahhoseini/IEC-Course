/**
 * POST /api/auth/verify-otp
 *
 * Request body: { "phone": "09123456789", "code": "123456" }
 * Response:
 *   200 { "ok": true, "user": { "id", "phone", "fullName", "role", "isActive" } }
 *   400 { "error": "..." }    // malformed input
 *   422 { "error": "..." }    // OTP not found / expired / wrong code
 *   503 { "error": "..." }    // DB unavailable
 *
 * On success a session is created and an HttpOnly cookie is set on the
 * response. The user row is auto-created on first verification
 * (role defaults to "student").
 */
import { createFileRoute } from "@tanstack/react-router";
import { jsonError, verifyOtpForPhone } from "@/server/auth/actions.server";

export const Route = createFileRoute("/api/auth/verify-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError("بدنه‌ی درخواست باید JSON معتبر باشد.", 400);
        }

        if (typeof body !== "object" || body === null) {
          return jsonError("بدنه‌ی درخواست نامعتبر است.", 400);
        }
        const { phone, code } = body as { phone?: unknown; code?: unknown };

        if (typeof phone !== "string" || typeof code !== "string") {
          return jsonError("فیلدهای «phone» و «code» الزامی هستند.", 400);
        }

        const result = await verifyOtpForPhone(phone, code);
        if (!result.ok) {
          return jsonError(result.message, result.status);
        }
        return Response.json({ ok: true, user: result.user });
      },
    },
  },
});
