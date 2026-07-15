/**
 * Select — native <select> styled to match Input.
 *
 * Why native <select> and not Radix Select?
 *   - The project's existing components use native HTML elements where
 *     they suffice (the marketing Navbar uses plain <button> + motion).
 *     Radix Select is heavier (portal, virtualization) and only worth
 *     it for searchable / combobox use cases. For now, native select
 *     with chevron icon matches the project's minimal-dependency style.
 *     A future stage can swap to Radix Select for searchable dropdowns.
 *
 * RTL: the chevron is placed on the left (end side in RTL) which is the
 * conventional position for a dropdown indicator in Persian UIs.
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const selectVariants = cva(
  "flex w-full appearance-none bg-white text-foreground outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 pe-10",
  {
    variants: {
      variant: {
        default:
          "border border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
        error:
          "border border-status-rejected focus:ring-2 focus:ring-status-rejected/20",
      },
      size: {
        default: "h-11 rounded-[var(--radius-md)] px-3.5 text-sm",
        sm: "h-9 rounded-[var(--radius-sm)] px-3 text-sm",
        lg: "h-12 rounded-[var(--radius-md)] px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface SelectProps
  extends
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(selectVariants({ variant, size }), className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-paragraph"
          strokeWidth={2}
        />
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select, selectVariants };
