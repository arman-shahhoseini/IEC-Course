/**
 * Stepper — multi-step progress indicator.
 *
 * Designed for the multi-step forms that will land in later stages:
 *   - Stage 3: instructor application (4 steps: info → resume →
 *     course-proposal → submit)
 *   - Stage 5: course creation (3 steps: details → curriculum → publish)
 *
 * Visual structure:
 *   [●─────●─────○─────○]
 *    Step 1  Step 2  Step 3  Step 4
 *    عنوان   عنوان   عنوان   عنوان
 *
 * - Completed steps: solid primary circle + checkmark
 * - Current step: outlined primary circle + step number
 * - Future steps: gray circle + step number
 *
 * Horizontal on `sm+`, vertical on mobile for readability.
 */
import * as React from "react";
import { Check } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export interface StepperStep {
  /** 1-indexed step number — used for display. */
  number: number;
  /** Short Persian label shown under the circle. */
  label: string;
  /** Optional longer description (shown as a tooltip / subtitle). */
  description?: string;
}

export interface StepperProps
  extends
    React.HTMLAttributes<HTMLOListElement>,
    VariantProps<typeof stepperVariants> {
  steps: StepperStep[];
  /** 1-indexed current step. Steps before this are "complete". */
  current: number;
}

const stepCircleVariants = cva(
  "grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition-all",
  {
    variants: {
      state: {
        complete: "border-primary bg-primary text-white shadow-red",
        current: "border-primary bg-white text-primary ring-4 ring-primary/10",
        upcoming: "border-border bg-white text-paragraph",
      },
    },
    defaultVariants: {
      state: "upcoming",
    },
  },
);

const stepperVariants = cva("flex gap-2", {
  variants: {
    orientation: {
      horizontal: "flex-row items-start overflow-x-auto pb-2",
      vertical: "flex-col gap-4",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

export function Stepper({
  steps,
  current,
  orientation = "horizontal",
  className,
  ...props
}: StepperProps) {
  return (
    <ol
      className={cn(stepperVariants({ orientation }), className)}
      aria-label="مراحل"
      {...props}
    >
      {steps.map((step, idx) => {
        const state: "complete" | "current" | "upcoming" =
          step.number < current
            ? "complete"
            : step.number === current
              ? "current"
              : "upcoming";

        const isLast = idx === steps.length - 1;

        return (
          <li
            key={step.number}
            className={cn(
              "flex gap-3",
              orientation === "horizontal"
                ? "flex-1 flex-col items-center text-center"
                : "flex-row items-center",
              !isLast &&
                orientation === "horizontal" &&
                "after:absolute after:mt-[18px] after:h-0.5 after:flex-1",
            )}
            aria-current={state === "current" ? "step" : undefined}
          >
            <div className="flex items-center gap-3">
              <span className={stepCircleVariants({ state })}>
                {state === "complete" ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  step.number
                )}
              </span>
              {orientation === "vertical" && !isLast && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 start-[18px] top-9 w-0.5 -translate-x-1/2 bg-border ltr:translate-x-1/2"
                  style={{
                    height: "calc(100% - 2.5rem)",
                  }}
                />
              )}
            </div>
            <div
              className={cn(
                orientation === "horizontal" ? "mt-2" : "flex-1 pb-4",
              )}
            >
              <p
                className={cn(
                  "text-sm font-semibold",
                  state === "upcoming" ? "text-paragraph" : "text-foreground",
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="mt-0.5 text-xs leading-5 text-paragraph">
                  {step.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
