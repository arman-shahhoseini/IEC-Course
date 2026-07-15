import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { csrfMiddleware } from "./server/middleware/csrf";
import { authRateLimitMiddleware } from "./server/middleware/rate-limit";
import { bodySizeLimitMiddleware } from "./server/middleware/body-size-limit";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [
    // 1. Body size limit — reject oversized requests early (before parsing).
    bodySizeLimitMiddleware,
    // 2. CSRF protection — reject non-GET requests with bad/missing Origin.
    csrfMiddleware,
    // 3. Per-IP rate limit on /api/auth/* (independent of per-phone limit).
    authRateLimitMiddleware,
    // 4. Error boundary — render a friendly Persian error page on 500s.
    errorMiddleware,
  ],
}));
