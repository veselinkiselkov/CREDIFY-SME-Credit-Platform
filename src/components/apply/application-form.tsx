"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitApplication } from "@/app/apply/actions";
import { Button } from "@/components/ui/button";
import { SAMPLE_APPLICATION } from "@/lib/applications/sample";
import {
  APPLICATION_STEPS,
  EMPTY_APPLICATION,
  STEP_COUNT,
  validateStep,
  type ApplicationFieldName,
  type ApplicationFormValues,
  type FieldErrors,
} from "@/lib/applications/schema";
import { AccuracyDeclaration, CompanyStep, FinancialsStep, LoanStep } from "./form-steps";
import { ReviewStep } from "./review-step";
import { Stepper } from "./stepper";

/**
 * THE APPLICATION FORM.
 *
 * One client component holds all the state; the step components below it are presentational.
 * That is what makes moving backwards free: nothing is thrown away when a step unmounts,
 * because the values were never stored in the step.
 *
 * Validation runs per step, on "Continue". Validating as the applicant types would flag a
 * half-typed email address as wrong, which reads as nagging. Validating only at the end
 * would send them back through four steps at once. Per step is the middle ground.
 *
 * Nothing is written anywhere until the final submit: no draft rows, no local storage. An
 * abandoned application leaves no trace, which is the right default for financial data and
 * also the simplest thing to build.
 */

/** Which step a given field belongs to, so a server-side error can jump to the right one. */
function stepContaining(field: ApplicationFieldName): number {
  const index = APPLICATION_STEPS.findIndex((step) => (step.fields as readonly string[]).includes(field));
  return index === -1 ? 0 : index;
}

export function ApplicationForm() {
  const [values, setValues] = useState<ApplicationFormValues>(EMPTY_APPLICATION);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [stepIndex, setStepIndex] = useState(0);
  // The furthest step reached with everything before it valid. The stepper uses it to
  // decide which steps can be jumped to.
  const [furthestStep, setFurthestStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [sampleNotice, setSampleNotice] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasMounted = useRef(false);
  /** Set just before a re-render when an input should receive focus afterwards. */
  const focusAfterRender = useRef<string | null>(null);

  // Moving to a new step should feel like a new page: the heading takes focus, so screen
  // readers announce it and the keyboard tab order restarts at the top of the step.
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [stepIndex]);

  // Sends focus to the first field that failed, so the applicant lands on the problem
  // rather than having to hunt for the red text.
  useEffect(() => {
    if (focusAfterRender.current) {
      document.getElementById(focusAfterRender.current)?.focus();
      focusAfterRender.current = null;
    }
  });

  const step = APPLICATION_STEPS[stepIndex];
  const isReviewStep = step.id === "review";

  function handleValueChange(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    // Clear this field's error as soon as it is touched. Leaving a stale message under an
    // input the applicant is actively fixing is the most common form-design annoyance.
    setErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name as ApplicationFieldName];
      return next;
    });
    setFormError(null);
  }

  function showErrors(found: FieldErrors): boolean {
    const firstField = Object.keys(found)[0];
    if (!firstField) return false;
    setErrors(found);
    focusAfterRender.current = firstField;
    return true;
  }

  function goToStep(index: number) {
    setStepIndex(Math.min(Math.max(index, 0), STEP_COUNT - 1));
    setErrors({});
    setFormError(null);
    setSampleNotice(false);
  }

  function handleContinue() {
    if (showErrors(validateStep(stepIndex, values))) return;
    const next = stepIndex + 1;
    setFurthestStep((current) => Math.max(current, next));
    goToStep(next);
  }

  function handleFillWithSample() {
    setValues(SAMPLE_APPLICATION);
    setErrors({});
    setFormError(null);
    // Every step's answers now exist, so all four become reachable from the stepper.
    setFurthestStep(STEP_COUNT - 1);
    setSampleNotice(true);
  }

  function handleSubmit() {
    // Re-check every step, not just this one. The applicant may have jumped back, blanked a
    // field and come straight to Review using the stepper.
    for (let index = 0; index < STEP_COUNT; index += 1) {
      const stepErrors = validateStep(index, values);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        if (index !== stepIndex) setStepIndex(index);
        focusAfterRender.current = Object.keys(stepErrors)[0];
        return;
      }
    }

    startSubmit(async () => {
      const result = await submitApplication(values);
      // On success the action redirects and this line is never reached.
      if (result?.fieldErrors) {
        const firstField = Object.keys(result.fieldErrors)[0] as ApplicationFieldName | undefined;
        if (firstField) setStepIndex(stepContaining(firstField));
        showErrors(result.fieldErrors);
      } else if (result?.formError) {
        setFormError(result.formError);
      }
    });
  }

  const stepProps = { values, errors, onValueChange: handleValueChange };

  return (
    <div className="flex flex-col gap-10">
      <Stepper currentStep={stepIndex} furthestStep={furthestStep} onStepSelect={goToStep} />

      {/*
        DEMO AFFORDANCE. Credify is a portfolio project, and a reviewer should not have to
        invent nine plausible financial figures to see the product work. The button fills in
        Nordwerk Precision GmbH, the same fictional company as the landing page, so the
        numbers stay consistent across the whole demo. It is labelled as sample data rather
        than disguised as a real feature.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-secondary/60 px-4 py-3">
        <p className="text-sm text-secondary-foreground">
          <strong className="font-medium">Demonstration.</strong> Fill every step with a fictional example company.
        </p>
        <Button variant="outline" size="sm" onClick={handleFillWithSample}>
          Fill with sample data
        </Button>
      </div>

      {sampleNotice && (
        <p role="status" className="-mt-6 text-sm text-muted-foreground">
          Sample data filled in for Nordwerk Precision GmbH.{" "}
          <button
            type="button"
            onClick={() => goToStep(STEP_COUNT - 1)}
            className="font-medium text-primary underline underline-offset-4 hover:text-brand-strong"
          >
            Go straight to review
          </button>
          , or look through each step first.
        </p>
      )}

      {/*
        A real <form> element, so Enter submits and browsers treat it as a form. onSubmit is
        intercepted because navigation between steps is handled in React, not by the browser.
      */}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (isReviewStep) handleSubmit();
          else handleContinue();
        }}
        className="flex flex-col gap-8"
      >
        <header>
          <p className="text-sm text-muted-foreground">
            Step {stepIndex + 1} of {STEP_COUNT}
          </p>
          {/* tabIndex -1 lets the heading receive focus on a step change without adding it
              to the normal tab order. */}
          {/* scroll-mt-28 clears the sticky site header: without it, focusing the heading
              scrolls it to the very top of the viewport, where the header covers it. */}
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 scroll-mt-28 font-display text-3xl font-semibold tracking-tight"
          >
            {step.title}
          </h2>
          <p className="mt-2 text-muted-foreground">{step.summary}</p>
        </header>

        {step.id === "company" && <CompanyStep {...stepProps} />}
        {step.id === "loan" && <LoanStep {...stepProps} />}
        {step.id === "financials" && <FinancialsStep {...stepProps} />}
        {isReviewStep && (
          <div className="flex flex-col gap-8">
            <ReviewStep values={values} onEditStep={goToStep} />
            <AccuracyDeclaration {...stepProps} />
          </div>
        )}

        {formError && (
          <p role="alert" className="rounded-md border border-destructive bg-card p-4 text-[15px] text-destructive">
            {formError}
          </p>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
          {stepIndex > 0 ? (
            <Button variant="ghost" onClick={() => goToStep(stepIndex - 1)} disabled={isSubmitting}>
              Back
            </Button>
          ) : (
            <span />
          )}

          <button type="submit" hidden aria-hidden tabIndex={-1} />

          {isReviewStep ? (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
              // aria-busy tells assistive technology the button is working, which a
              // changed label alone does not.
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Submitting…" : "Submit application"}
            </Button>
          ) : (
            <Button size="lg" onClick={handleContinue}>
              Continue
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
