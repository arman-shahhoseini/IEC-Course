/**
 * StatusBadge — generic pill for representing object lifecycle state.
 *
 * Used by:
 *   - CourseCard (current/upcoming/archived — handled internally there)
 *   - Instructor application review queue (Stage 3)
 *   - Course publish state (Stage 5)
 *   - Support ticket status (Stage 6)
 *
 * Visual mapping per `status` prop:
 *   - pending  — amber on amber-bg (in review / awaiting action)
 *   - success  — green on green-bg (approved / completed / paid)
 *   - rejected — red on red-bg    (rejected / failed / cancelled)
 *   - draft    — gray on gray-bg   (not submitted / hidden / archived)
 *
 * The label is auto-derived from `status` (Persian) but can be overridden
 * via the `label` prop for context-specific phrasing (e.g. "پرداخت‌شده"
 * instead of "موفق"). When `label` is provided, `status` only controls
 * the color.
 *
 * Implementation follows the same CVA pattern as `badge.tsx` /
 * `button.tsx` in this directory — `cva` for variants + `cn` for merge.
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export type StatusValue = "pending" | "success" | "rejected" | "draft";

const STATUS_LABELS: Record<StatusValue, string> = {
  pending: "در انتظار",
  success: "موفق",
  rejected: "رد شده",
  draft: "پیش‌نویس",
};

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
  {
    variants: {
      status: {
        pending: "bg-status-pending-bg text-status-pending",
        success: "bg-status-success-bg text-status-success",
        rejected: "bg-status-rejected-bg text-status-rejected",
        draft: "bg-status-draft-bg text-status-draft",
      },
    },
    defaultVariants: {
      status: "draft",
    },
  },
);

export interface StatusBadgeProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof statusBadgeVariants> {
  status: StatusValue;
  /** Override the auto-derived Persian label. */
  label?: string;
  /** Optional leading dot indicator (default: true). */
  withDot?: boolean;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, label, withDot = true, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(statusBadgeVariants({ status }), className)}
        {...props}
      >
        {withDot && (
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-current opacity-80"
          />
        )}
        {label ?? STATUS_LABELS[status]}
        {children}
      </span>
    );
  },
);
StatusBadge.displayName = "StatusBadge";

export { statusBadgeVariants, STATUS_LABELS };
