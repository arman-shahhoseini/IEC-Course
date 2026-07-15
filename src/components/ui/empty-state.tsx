/**
 * EmptyState — placeholder UI for "no items here yet" / "in development".
 *
 * Used heavily in this stage — every dashboard sub-route that hasn't
 * been implemented yet renders an EmptyState with a "این بخش هنوز در
 * دست ساخت است" message. Also used in later stages when a real list
 * is empty (no enrollments, no applications, etc.).
 *
 * Visual structure:
 *
 *     ┌─────────────────────────┐
 *     │                         │
 *     │       [icon circle]     │
 *     │                         │
 *     │       عنوان             │
 *     │   توضیح کوتاه            │
 *     │                         │
 *     │   [دکمه اختیاری]        │
 *     │                         │
 *     └─────────────────────────┘
 *
 * Props:
 *   - `icon`       — Lucide icon component (default: Inbox)
 *   - `title`      — bold Persian headline
 *   - `description`— supporting text (1-2 lines, paragraph color)
 *   - `action`     — optional ReactNode, usually a Button or Link
 *   - `size`       — `default` (large, for page-level) / `sm` (compact,
 *                    for use inside cards/tabs)
 */
import * as React from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        default: "py-16 px-6",
        sm: "py-10 px-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const emptyStateIconVariants = cva(
  "grid place-items-center rounded-full bg-surface text-paragraph",
  {
    variants: {
      size: {
        default: "size-16",
        sm: "size-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const emptyStateIconInnerVariants = cva("", {
  variants: {
    size: {
      default: "size-7",
      sm: "size-5",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface EmptyStateProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional CTA — pass a `<Button>` or `<Link>`. */
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  size = "default",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(emptyStateVariants({ size }), className)}
      role="status"
      {...props}
    >
      <div className={cn(emptyStateIconVariants({ size }))}>
        <Icon
          className={emptyStateIconInnerVariants({ size })}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </div>
      <h3
        className={cn(
          "mt-4 font-bold text-foreground",
          size === "default" ? "text-lg" : "text-base",
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "mt-2 text-paragraph leading-6",
            size === "default" ? "max-w-sm text-sm" : "max-w-xs text-xs",
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
