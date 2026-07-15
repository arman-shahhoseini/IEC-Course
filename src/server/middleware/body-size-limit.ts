/**
 * Body size limit middleware — rejects requests with a `Content-Length`
 * header exceeding the configured maximum.
 *
 * Default limit: 10 MB (covers receipt image uploads which are base64-
 * encoded — a 5 MB image becomes ~6.7 MB in base64, plus JSON overhead).
 *
 * This runs BEFORE any handler, so a malicious 100 MB upload is rejected
 * without consuming server memory/CPU to parse it.
 *
 * Configurable via `MAX_BODY_SIZE_MB` env var (default: 10).
 */
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** Default max body size in bytes (10 MB). */
const DEFAULT_MAX_BODY_SIZE = 10 * 1024 * 1024;

function getMaxBodySize(): number {
  const mb = parseInt(process.env.MAX_BODY_SIZE_MB ?? "10", 10);
  if (!Number.isFinite(mb) || mb < 1) return DEFAULT_MAX_BODY_SIZE;
  return mb * 1024 * 1024;
}

export const bodySizeLimitMiddleware = createMiddleware().server(
  async ({ next }) => {
    const request = getRequest();
    const contentLength = request.headers.get("content-length");

    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (Number.isFinite(size) && size > getMaxBodySize()) {
        return new Response(
          JSON.stringify({
            error: "حجم درخواست بیش از حد مجاز است.",
            code: "BODY_TOO_LARGE",
            maxBytes: getMaxBodySize(),
          }),
          {
            status: 413,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }
    }

    return next();
  },
);
