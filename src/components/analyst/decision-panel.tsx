"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitDecision } from "@/app/analyst/applications/[id]/actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { DECISION_META, DECISIONS, isFinalDecision, type DecisionAction } from "@/lib/analyst/decision";
import type { ApplicationStatus } from "@/lib/applications/status";
import { cn } from "@/lib/utils";

/**
 * THE ANALYST'S DECISION PANEL.
 *
 * Three actions, each a two-step commitment: choose the action and write the message, then
 * confirm against the company name. Approving or declining a loan is consequential and
 * irreversible from the applicant's point of view - they are told immediately - so it must
 * not be reachable by one stray click. Two steps is enough friction; a third would be
 * theatre, and this has to stay quick to demonstrate.
 *
 * The panel never reads the score. It cannot: the server action takes an action and a
 * message, and nothing else. The analyst decides.
 */

const ACTION_STYLES: Record<DecisionAction, string> = {
  request_information: "border-risk-elevated",
  approve: "border-risk-low",
  decline: "border-risk-very-high",
};

export function DecisionPanel({
  applicationId,
  companyName,
  currentStatus,
  currentMessage,
}: {
  applicationId: string;
  companyName: string;
  currentStatus: ApplicationStatus;
  currentMessage: string | null;
}) {
  const router = useRouter();
  const [action, setAction] = useState<DecisionAction | null>(null);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<{ action?: string; message?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const meta = action ? DECISION_META[action] : null;
  const decided = isFinalDecision(currentStatus);

  function reset() {
    setAction(null);
    setMessage("");
    setConfirming(false);
    setErrors({});
    setFormError(null);
  }

  function chooseAction(next: DecisionAction) {
    setAction(next);
    setConfirming(false);
    setErrors({});
    setFormError(null);
  }

  /** Step 1 -> step 2. The message is checked here so the confirmation is never wasted. */
  function handleContinue() {
    if (!action || !meta) return;
    if (meta.messageRequired && message.trim().length < 10) {
      setErrors({
        message:
          message.trim().length === 0
            ? `A message is required to ${meta.label.toLowerCase()}. The applicant sees it on their status page.`
            : "Please write at least 10 characters so the applicant knows what to do.",
      });
      return;
    }
    setErrors({});
    setConfirming(true);
  }

  function handleConfirm() {
    if (!action) return;
    startSaving(async () => {
      const result = await submitDecision(applicationId, { action, message });
      if (result.ok) {
        reset();
        // Re-fetches this server-rendered page so the recorded decision, the status badge
        // and the dashboard all reflect the change without a full reload.
        router.refresh();
      } else {
        setConfirming(false);
        if (result.errors) setErrors(result.errors);
        if (result.formError) setFormError(result.formError);
      }
    });
  }

  return (
    <div className="rounded-md border border-border bg-card">
      {/* The recorded outcome, stated before any new action is offered. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <StatusBadge status={currentStatus} />
        <p className="text-[15px] text-muted-foreground">
          {decided
            ? "A decision has been recorded. Recording another replaces it."
            : "No decision recorded yet."}
        </p>
      </div>

      {currentMessage && (
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">Message currently shown to the applicant</p>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{currentMessage}</p>
        </div>
      )}

      <div className="p-4">
        {/* ---------------------------------------------------------- Step 0: choose -- */}
        <fieldset disabled={isSaving}>
          <legend className="text-sm font-medium">
            {decided ? "Change the recorded decision" : "Record a decision"}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {DECISIONS.map((candidate) => (
              <Button
                key={candidate}
                variant={action === candidate ? "primary" : "outline"}
                onClick={() => chooseAction(candidate)}
                aria-pressed={action === candidate}
              >
                {DECISION_META[candidate].label}
              </Button>
            ))}
            {action && (
              <Button variant="ghost" onClick={reset}>
                Cancel
              </Button>
            )}
          </div>
        </fieldset>

        {errors.action && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {errors.action}
          </p>
        )}

        {/* ------------------------------------------------ Step 1: write the message -- */}
        {action && meta && !confirming && (
          <div className={cn("mt-4 rounded-md border-l-2 bg-muted/30 p-4", ACTION_STYLES[action])}>
            <label htmlFor="decision-message" className="text-sm font-medium">
              {meta.messageLabel}
            </label>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{meta.messageHint}</p>
            <textarea
              id="decision-message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setErrors({});
              }}
              rows={4}
              maxLength={1000}
              disabled={isSaving}
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={errors.message ? "decision-message-error" : undefined}
              className={cn(
                "mt-2 w-full resize-y rounded-md border bg-card px-3 py-2 text-[15px] leading-relaxed",
                errors.message ? "border-destructive" : "border-input hover:border-muted-foreground/40",
              )}
            />
            <div className="flex items-baseline justify-between gap-4">
              {errors.message ? (
                <p id="decision-message-error" role="alert" className="text-sm text-destructive">
                  {errors.message}
                </p>
              ) : (
                <span />
              )}
              <p className="text-right text-xs tabular-nums text-muted-foreground">{message.length} / 1000</p>
            </div>

            <Button className="mt-3" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        )}

        {/* --------------------------------------------------- Step 2: confirm it -- */}
        {action && meta && confirming && (
          <div
            // role="alertdialog" tells assistive technology this is a decision point that
            // needs a response, not a passive message.
            role="alertdialog"
            aria-labelledby="decision-confirm-heading"
            className={cn("mt-4 rounded-md border-2 bg-card p-4", ACTION_STYLES[action])}
          >
            <h3 id="decision-confirm-heading" className="font-medium">
              {meta.confirmation(companyName)}
            </h3>
            {message.trim().length > 0 && (
              <div className="mt-3 rounded border border-border bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">They will see</p>
                <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{message.trim()}</p>
              </div>
            )}
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              This is your decision, not the scorecard&rsquo;s. The score and grade are analysis; the call is yours.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleConfirm} disabled={isSaving} aria-busy={isSaving}>
                {isSaving ? "Saving…" : `Yes, ${meta.label.toLowerCase()}`}
              </Button>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={isSaving}>
                Back
              </Button>
            </div>
          </div>
        )}

        {formError && (
          <p role="alert" className="mt-4 rounded-md border border-destructive bg-card p-3 text-[15px] text-destructive">
            {formError}
          </p>
        )}
      </div>
    </div>
  );
}
