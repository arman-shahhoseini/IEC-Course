/**
 * Foundation UI components — base primitives for the design system.
 *
 * These are ADDITIVE — they do NOT replace any existing component in
 * `src/components/ui/`. They exist for future stages to use.
 *
 * Each component is:
 *   - RTL-aware (dir="rtl" on <html>)
 *   - Dark-mode-ready (uses CSS variables, no hardcoded colors)
 *   - Accessible (ARIA attributes, keyboard navigation)
 *   - Styled with the project's design tokens
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Spinner                                                             */
/* ------------------------------------------------------------------ */

export const Spinner = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement> & { size?: number }
>(({ className, size = 24, ...props }, ref) => (
  <Loader2
    ref={ref}
    className={cn("animate-spin", className)}
    style={{ width: size, height: size }}
    {...props}
  />
));
Spinner.displayName = "Spinner";

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

export function Loading({ label = "در حال بارگذاری..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-paragraph">
      <Spinner className="size-5 text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Checkbox                                                            */
/* ------------------------------------------------------------------ */

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      "size-5 shrink-0 cursor-pointer rounded-[var(--radius-sm)] border border-border text-primary focus:ring-2 focus:ring-primary/20",
      className,
    )}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";

/* ------------------------------------------------------------------ */
/* Switch                                                              */
/* ------------------------------------------------------------------ */

export const Switch = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <label className="relative inline-flex cursor-pointer items-center">
    <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
    <div
      className={cn(
        "h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/20",
        className,
      )}
    />
    <div className="absolute start-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[-20px] rtl:peer-checked:translate-x-[20px]" />
  </label>
));
Switch.displayName = "Switch";

/* ------------------------------------------------------------------ */
/* Radio                                                               */
/* ------------------------------------------------------------------ */

export const Radio = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="radio"
    className={cn(
      "size-5 shrink-0 cursor-pointer border border-border text-primary focus:ring-2 focus:ring-primary/20",
      className,
    )}
    {...props}
  />
));
Radio.displayName = "Radio";

/* ------------------------------------------------------------------ */
/* Alert                                                               */
/* ------------------------------------------------------------------ */

const alertVariants = cva(
  "flex items-start gap-3 rounded-[var(--radius-md)] border p-4 text-sm",
  {
    variants: {
      variant: {
        info: "border-border bg-surface/60 text-foreground",
        success:
          "border-status-success/20 bg-status-success-bg text-status-success",
        warning:
          "border-status-pending/20 bg-status-pending-bg text-status-pending",
        error:
          "border-status-rejected/20 bg-status-rejected-bg text-status-rejected",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const alertIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
};

export interface AlertProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
}

export function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  const Icon = alertIcons[variant ?? "info"];
  return (
    <div className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="flex-1">
        {title && <p className="font-bold">{title}</p>}
        <div className={cn(title && "mt-1")}>{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FormField                                                           */
/* ------------------------------------------------------------------ */

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  required,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-primary"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-paragraph">{hint}</p>}
      {error && <p className="text-xs text-status-rejected">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SectionHeader                                                       */
/* ------------------------------------------------------------------ */

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-paragraph">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PageHeader                                                          */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mb-6 flex items-start justify-between gap-4", className)}
    >
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-paragraph">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatisticCard                                                       */
/* ------------------------------------------------------------------ */

export function StatisticCard({
  label,
  value,
  icon,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-paragraph">{label}</p>
        {icon && <div className="text-paragraph">{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-foreground">
        {typeof value === "number" ? value.toLocaleString("fa-IR") : value}
      </p>
      {trend && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            trend.positive ? "text-status-success" : "text-status-rejected",
          )}
        >
          {trend.value}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-50"
        aria-label="قبلی"
      >
        <ChevronRight className="size-4" />
      </button>
      <span className="text-sm text-paragraph">
        صفحه‌ی {(page + 1).toLocaleString("fa-IR")} از{" "}
        {totalPages.toLocaleString("fa-IR")}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-50"
        aria-label="بعدی"
      >
        <ChevronLeft className="size-4" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DataTable Base                                                      */
/* ------------------------------------------------------------------ */

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  empty,
  className,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (data.length === 0 && empty) {
    return <>{empty}</>;
  }
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[var(--radius-card)] border border-border bg-white shadow-card",
        className,
      )}
    >
      <table className="w-full text-sm text-right" dir="rtl">
        <thead className="border-b border-border bg-surface/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "h-12 px-4 text-start align-middle text-xs font-semibold text-paragraph",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "transition-colors hover:bg-surface/60",
                onRowClick && "cursor-pointer",
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "p-4 align-middle text-sm text-foreground",
                    col.className,
                  )}
                >
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "default",
  className,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "default" ? "py-16 px-6" : "py-10 px-4",
        className,
      )}
      role="status"
    >
      {Icon && (
        <div
          className={cn(
            "grid place-items-center rounded-full bg-surface text-paragraph",
            size === "default" ? "size-16" : "size-12",
          )}
        >
          <Icon
            className={size === "default" ? "size-7" : "size-5"}
            strokeWidth={1.8}
          />
        </div>
      )}
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

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const [visible, setVisible] = React.useState(false);
  const positions: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 me-2",
    right: "left-full top-1/2 -translate-y-1/2 ms-2",
  };
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            "absolute z-[200] whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-white shadow-float",
            positions[side],
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Popover                                                             */
/* ------------------------------------------------------------------ */

export function Popover({
  trigger,
  children,
  align = "start",
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const aligns: Record<string, string> = {
    start: "start-0",
    center: "left-1/2 -translate-x-1/2",
    end: "end-0",
  };
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 z-[200] min-w-[12rem] rounded-[var(--radius-md)] border border-border bg-white p-2 shadow-float",
            aligns[align],
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer (side panel)                                                 */
/* ------------------------------------------------------------------ */

export function Drawer({
  open,
  onOpenChange,
  children,
  side = "right",
  width = "400px",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: "left" | "right";
  width?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "absolute inset-y-0 bg-white shadow-float",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
        )}
        style={{ width }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge (re-export-compatible with existing)                          */
/* ------------------------------------------------------------------ */

const foundationBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        secondary: "bg-surface text-foreground",
        outline: "border border-border text-foreground",
        success: "bg-status-success-bg text-status-success",
        warning: "bg-status-pending-bg text-status-pending",
        error: "bg-status-rejected-bg text-status-rejected",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function FoundationBadge({
  className,
  variant,
  children,
}: {
  className?: string;
  variant?: VariantProps<typeof foundationBadgeVariants>["variant"];
  children: React.ReactNode;
}) {
  return (
    <span className={cn(foundationBadgeVariants({ variant }), className)}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar (foundation version)                                         */
/* ------------------------------------------------------------------ */

export function FoundationAvatar({
  name,
  src,
  alt,
  size = "default",
  className,
}: {
  name: string;
  src?: string;
  alt?: string;
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
}) {
  const sizes: Record<string, string> = {
    sm: "size-8 text-xs",
    default: "size-10 text-sm",
    lg: "size-12 text-base",
    xl: "size-16 text-lg",
  };
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("");
  return (
    <span
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-surface text-paragraph",
        sizes[size],
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? name}
          className="aspect-square size-full object-cover"
        />
      ) : (
        <span className="grid size-full place-items-center font-semibold">
          {initials || "؟"}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton (foundation version)                                       */
/* ------------------------------------------------------------------ */

export function FoundationSkeleton({
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
