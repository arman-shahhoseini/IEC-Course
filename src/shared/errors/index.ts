/**
 * Standardized error hierarchy for the application.
 *
 * All application errors extend `AppError`. Each subclass carries a
 * stable `code` and `statusCode` so API routes and server functions
 * can map them to consistent HTTP responses without try/catching
 * `Error` generically.
 *
 * The existing `AuthorizationError` in `src/server/auth/rbac.ts` is
 * kept as-is for backward compatibility. The new classes here are
 * additive — they don't replace anything.
 *
 * Usage:
 *   import { NotFoundError, BusinessError } from "@/shared/errors";
 *
 *   if (!course) throw new NotFoundError("دوره یافت نشد.");
 *   if (existing) throw new BusinessError("شما قبلاً ثبت‌نام کرده‌اید.");
 */

/* ------------------------------------------------------------------ */
/* Base class                                                          */
/* ------------------------------------------------------------------ */

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    // Maintain proper stack trace in V8
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/* ------------------------------------------------------------------ */
/* Specific error types                                                */
/* ------------------------------------------------------------------ */

/** 400 — input validation failed. */
export class ValidationError extends AppError {
  readonly fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message, 400, "VALIDATION_ERROR");
    this.fields = fields;
  }
}

/** 401 — not authenticated (no session). */
export class UnauthorizedError extends AppError {
  constructor(message = "برای دسترسی به این بخش باید وارد شوید.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/** 403 — authenticated but lacks permission. */
export class ForbiddenError extends AppError {
  constructor(message = "شما دسترسی لازم برای این عملیات را ندارید.") {
    super(message, 403, "FORBIDDEN");
  }
}

/** 404 — resource not found. */
export class NotFoundError extends AppError {
  constructor(message = "منبع مورد نظر یافت نشد.") {
    super(message, 404, "NOT_FOUND");
  }
}

/** 409 — conflict (duplicate, state mismatch). */
export class ConflictError extends AppError {
  constructor(message = "عملیات به‌دلیل تداخل امکان‌پذیر نیست.") {
    super(message, 409, "CONFLICT");
  }
}

/** 422 — business rule violation (not validation, not conflict). */
export class BusinessError extends AppError {
  constructor(message: string) {
    super(message, 422, "BUSINESS_ERROR");
  }
}

/** 503 — service unavailable (DB down, SMS provider down). */
export class ServiceUnavailableError extends AppError {
  constructor(message = "سرویس در حال حاضر در دسترس نیست.") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}

/* ------------------------------------------------------------------ */
/* Error Mapper — converts AppError to a JSON response                 */
/* ------------------------------------------------------------------ */

/**
 * Map an error to a JSON Response object.
 *
 * - AppError subclasses → use their statusCode + code + message.
 * - Unknown errors → 500 with a generic message (details logged server-side).
 *
 * Usage in API routes:
 *   try { ... } catch (err) { return errorToResponse(err); }
 */
export function errorToResponse(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json(
      {
        error: err.message,
        code: err.code,
        ...(err instanceof ValidationError && err.fields
          ? { fields: err.fields }
          : {}),
      },
      { status: err.statusCode },
    );
  }

  // Log unknown errors for debugging.
  console.error("[iec:error] Unhandled error:", err);

  return Response.json(
    { error: "خطای داخلی سرور رخ داده است.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}
