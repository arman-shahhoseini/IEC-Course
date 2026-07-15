/**
 * Toast — ephemeral notification system built on @radix-ui/react-toast.
 *
 * Architecture:
 *   - `<ToastProvider>` wraps the app (mounted once in `__root.tsx`).
 *   - `useToast()` returns a `toast()` function any component can call.
 *   - Toasts are stored in a module-level queue (no React context
 *     needed) — keeps the API ergonomic and SSR-friendly.
 *
 * Variants mirror StatusBadge semantics (success / pending / rejected /
 * draft) so visual language is consistent across the dashboard.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success("ثبت‌نام با موفقیت انجام شد");
 *   toast.error("خطا در ارتباط با سرور");
 */
"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

const toastViewportVariants = cva(
  "fixed z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 outline-none",
  {
    variants: {
      position: {
        "top-right": "top-0 right-0 sm:max-w-sm",
        "top-left": "top-0 left-0 sm:max-w-sm",
        "bottom-right": "bottom-0 right-0 sm:max-w-sm",
        "bottom-left": "bottom-0 left-0 sm:max-w-sm",
      },
    },
    defaultVariants: {
      position: "top-right",
    },
  },
);

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-[var(--radius-md)] border p-4 shadow-float transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-top-full data-[state=closed]:fade-out-80 data-[swipe=end]:translate-x-full data-[swipe=end]:animate-out",
  {
    variants: {
      variant: {
        default: "border-border bg-white text-foreground",
        success:
          "border-status-success/20 bg-status-success-bg text-status-success",
        error:
          "border-status-rejected/20 bg-status-rejected-bg text-status-rejected",
        warning:
          "border-status-pending/20 bg-status-pending-bg text-status-pending",
        info: "border-border bg-white text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const toastIconByVariant = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

/* ------------------------------------------------------------------ */
/* Provider + primitives                                               */
/* ------------------------------------------------------------------ */

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport> &
    VariantProps<typeof toastViewportVariants>
>(({ className, position, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(toastViewportVariants({ position }), className)}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

interface ToastItem {
  id: string;
  title?: string;
  description: string;
  variant: VariantProps<typeof toastVariants>["variant"];
  duration: number;
}

interface ToastProps
  extends
    React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>,
    VariantProps<typeof toastVariants> {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ className, variant, item, onDismiss, ...props }, ref) => {
  const Icon = toastIconByVariant[item.variant ?? "default"] ?? Info;
  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        toastVariants({ variant: item.variant ?? variant }),
        className,
      )}
      duration={item.duration}
      onOpenChange={(open) => {
        if (!open) onDismiss(item.id);
      }}
      {...props}
    >
      <div className="flex w-full items-start gap-3">
        <Icon
          className="mt-0.5 size-5 shrink-0"
          strokeWidth={2}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          {item.title && (
            <ToastPrimitive.Title className="text-sm font-bold leading-6">
              {item.title}
            </ToastPrimitive.Title>
          )}
          <ToastPrimitive.Description className="text-sm leading-6 opacity-90">
            {item.description}
          </ToastPrimitive.Description>
        </div>
        <ToastPrimitive.Close
          aria-label="بستن"
          className="shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <X className="size-4" />
        </ToastPrimitive.Close>
      </div>
    </ToastPrimitive.Root>
  );
});
Toast.displayName = ToastPrimitive.Root.displayName;

/* ------------------------------------------------------------------ */
/* Queue + hook                                                        */
/* ------------------------------------------------------------------ */

/** Module-level queue — survives re-renders, no Provider context needed. */
const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];

function emit() {
  for (const l of listeners) l(items);
}

function push(item: Omit<ToastItem, "id">): string {
  const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  items = [...items, { ...item, id }];
  emit();
  return id;
}

function dismiss(id: string) {
  items = items.filter((i) => i.id !== id);
  emit();
}

export interface ToastApi {
  success: (
    description: string,
    opts?: { title?: string; duration?: number },
  ) => string;
  error: (
    description: string,
    opts?: { title?: string; duration?: number },
  ) => string;
  warning: (
    description: string,
    opts?: { title?: string; duration?: number },
  ) => string;
  info: (
    description: string,
    opts?: { title?: string; duration?: number },
  ) => string;
  dismiss: (id: string) => void;
}

/** Subscribe to the queue + return the API. */
export function useToast(): ToastApi {
  return React.useMemo<ToastApi>(
    () => ({
      success: (description, opts) =>
        push({
          description,
          title: opts?.title ?? "موفقیت",
          variant: "success",
          duration: opts?.duration ?? 5000,
        }),
      error: (description, opts) =>
        push({
          description,
          title: opts?.title ?? "خطا",
          variant: "error",
          duration: opts?.duration ?? 8000,
        }),
      warning: (description, opts) =>
        push({
          description,
          title: opts?.title ?? "هشدار",
          variant: "warning",
          duration: opts?.duration ?? 6000,
        }),
      info: (description, opts) =>
        push({
          description,
          title: opts?.title ?? "اطلاع‌رسانی",
          variant: "info",
          duration: opts?.duration ?? 5000,
        }),
      dismiss,
    }),
    [],
  );
}

/* ------------------------------------------------------------------ */
/* Toaster — the actual mounted viewport                               */
/* ------------------------------------------------------------------ */

/**
 * Mount ONCE in the app shell (e.g. `__root.tsx`). Subscribes to the
 * queue and renders all current toasts.
 */
export function Toaster({
  position = "top-right",
}: {
  position?: VariantProps<typeof toastViewportVariants>["position"];
}) {
  const [currentItems, setCurrentItems] = React.useState<ToastItem[]>(items);

  React.useEffect(() => {
    const listener = (next: ToastItem[]) => setCurrentItems(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <ToastProvider swipeDirection="right" duration={5000}>
      {currentItems.map((item) => (
        <Toast key={item.id} item={item} onDismiss={dismiss} />
      ))}
      <ToastViewport position={position} />
    </ToastProvider>
  );
}

export { Toast, ToastViewport, ToastProvider };
