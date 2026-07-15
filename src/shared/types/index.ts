/**
 * Shared types — cross-feature types that don't belong to any single
 * feature module.
 */

/** Standard API response shape for success. */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** Standard API response shape for error. */
export interface ApiError {
  error: string;
  code?: string;
  fields?: Record<string, string>;
}

/** Pagination metadata. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** A paginated list response. */
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Common status enum shape (used by StatusBadge). */
export type StatusValue = "pending" | "success" | "rejected" | "draft";

/** Role labels (Persian) — mirrors `ROLE_LABELS` from dashboard-nav. */
export const ROLE_LABELS_FA = {
  student: "دانشجو",
  instructor: "مدرس",
  support: "پشتیبان",
  admin: "مدیر",
} as const;
