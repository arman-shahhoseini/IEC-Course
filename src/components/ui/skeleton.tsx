/**
 * Skeleton — shimmering placeholder for loading states.
 *
 * Uses Tailwind's `animate-pulse` utility — light, dependency-free.
 * The pulse color is `bg-surface` (very light gray) which is the
 * project's existing muted background — no new colors introduced.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-surface",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Skeleton variant presets for common dashboard shapes. */

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card",
        className,
      )}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-5/6" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-20 rounded-[var(--radius-md)]" />
        <Skeleton className="h-8 w-20 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}
