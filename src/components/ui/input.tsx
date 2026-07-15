/**
 * Input — styled text input matching the project's design tokens.
 *
 * Uses the same border + radius pattern as `dashboard.tsx`'s OTP input
 * but as a reusable component. Variants mirror shadcn/ui conventions
 * so they're familiar to anyone who has used shadcn before.
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full bg-white text-foreground outline-none transition-colors placeholder:text-paragraph/60 disabled:cursor-not-allowed disabled:opacity-50",
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

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(inputVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
