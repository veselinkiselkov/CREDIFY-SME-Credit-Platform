"use client";

import { APPLICATION_STEPS } from "@/lib/applications/schema";
import { cn } from "@/lib/utils";

interface StepperProps {
  currentStep: number;
  /** How far the applicant has validated. Steps up to here can be jumped back to. */
  furthestStep: number;
  onStepSelect: (index: number) => void;
}

/**
 * The four-step progress indicator.
 *
 * It borrows the landing page's numbered-sequence language (a rule above each item, a
 * condensed numeral, tabular figures) so the application feels like the same product.
 *
 * Steps already completed are real buttons: going back to correct something should not
 * require clicking "Back" three times. Steps not yet reached are inert, because jumping
 * ahead would skip the validation that makes the review step trustworthy.
 */
export function Stepper({ currentStep, furthestStep, onStepSelect }: StepperProps) {
  return (
    <nav aria-label="Application progress">
      <ol className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {APPLICATION_STEPS.map((step, index) => {
          const isCurrent = index === currentStep;
          const isVisited = index <= furthestStep;
          const isDone = index < currentStep;

          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!isVisited || isCurrent}
                onClick={() => onStepSelect(index)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "w-full border-t-2 pt-3 text-left transition-colors",
                  isCurrent ? "border-primary" : isVisited ? "border-muted-foreground/50" : "border-border",
                  isVisited && !isCurrent && "hover:border-primary",
                  !isVisited && "cursor-default",
                )}
              >
                <span className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-display text-lg font-semibold tabular-nums",
                      isCurrent ? "text-primary" : isVisited ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  {isDone && (
                    <span aria-hidden className="text-primary">
                      ✓
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "mt-1 block text-sm leading-snug",
                    isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
                {/* Announced to screen readers only; sighted users get it from the heading. */}
                <span className="sr-only">
                  {isCurrent ? "Current step" : isDone ? "Completed" : "Not yet reached"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
