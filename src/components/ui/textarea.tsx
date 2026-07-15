/**
 * Textarea — multi-line text input matching the Input component's style.
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
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
        default: "rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm min-h-24",
        sm: "rounded-[var(--radius-sm)] px-3 py-2 text-sm min-h-20",
        lg: "rounded-[var(--radius-md)] px-4 py-3 text-base min-h-32",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface TextareaProps
  extends
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(textareaVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
