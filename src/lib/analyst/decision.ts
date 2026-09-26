import { z } from "zod";
import type { ApplicationStatus } from "@/lib/applications/status";

/**
 * THE ANALYST'S DECISION.
 *
 * Validation lives here, as a pure function, so the rules can be tested without a database
 * and so the server action stays a thin wrapper around them.
 *
 * THE POINT THAT MATTERS MOST: nothing in this file reads a score, a grade or a critical
 * flag. The credit engine cannot reach it. A decision is something a person chooses and
 * types a reason for - the scorecard is decision SUPPORT, and support is all it is. That is
 * why `recordDecision` takes an action and a message and nothing else: there is no argument
 * it could be given that would let the model decide.
 */

export const DECISIONS = ["request_information", "approve", "decline"] as const;
export type DecisionAction = (typeof DECISIONS)[number];

/**
 * What each action does, and what it demands of the analyst.
 *
 * Approve is the only one where the message is optional: "yes" needs no explanation, while
 * asking for more information without saying what, or declining without saying why, leaves
 * the applicant with nothing to act on.
 */
export const DECISION_META: Record<
  DecisionAction,
  {
    label: string;
    /** The status the application moves to. */
    status: ApplicationStatus;
    messageRequired: boolean;
    messageLabel: string;
    messageHint: string;
    /** Shown on the confirmation step, with the company name substituted in. */
    confirmation: (company: string) => string;
  }
> = {
  request_information: {
    label: "Request information",
    status: "information_requested",
    messageRequired: true,
    messageLabel: "What do you need from the applicant?",
    messageHint: "Shown on their status page, so write it for the business owner.",
    confirmation: (company) => `Ask ${company} for more information and set their status to Information requested?`,
  },
  approve: {
    label: "Approve",
    status: "approved",
    messageRequired: false,
    messageLabel: "Message to the applicant (optional)",
    messageHint: "Anything they should know. Leave blank to approve without a note.",
    confirmation: (company) => `Record an approval for ${company}? They will see this on their status page.`,
  },
  decline: {
    label: "Decline",
    status: "declined",
    messageRequired: true,
    messageLabel: "Why are you declining?",
    messageHint: "The applicant reads this. Be specific and factual.",
    confirmation: (company) => `Record a decline for ${company}? They will see this and your explanation.`,
  },
};

const MIN_MESSAGE = 10;
const MAX_MESSAGE = 1000;

const messageField = z
  .string()
  .trim()
  .max(MAX_MESSAGE, `The message cannot be longer than ${MAX_MESSAGE} characters.`);

export interface DecisionInput {
  action: string;
  message: string;
}

export interface ValidatedDecision {
  action: DecisionAction;
  status: ApplicationStatus;
  /** null when the analyst approved without a note; never an empty string. */
  analystMessage: string | null;
}

export type DecisionValidation =
  | { ok: true; decision: ValidatedDecision }
  | { ok: false; errors: { action?: string; message?: string } };

/**
 * Checks a decision before anything is written.
 *
 * Runs on the server inside the action, not only in the browser: the action is a public
 * endpoint, so the browser's own check is a convenience for the analyst and nothing more.
 */
export function validateDecision(input: DecisionInput): DecisionValidation {
  const action = DECISIONS.find((candidate) => candidate === input.action);
  if (!action) {
    return { ok: false, errors: { action: "Choose Request information, Approve or Decline." } };
  }

  const meta = DECISION_META[action];
  const parsed = messageField.safeParse(input.message ?? "");
  if (!parsed.success) {
    return { ok: false, errors: { message: parsed.error.issues[0]?.message } };
  }

  const message = parsed.data;

  if (meta.messageRequired && message.length < MIN_MESSAGE) {
    return {
      ok: false,
      errors: {
        message:
          message.length === 0
            ? `A message is required to ${meta.label.toLowerCase()}. The applicant sees it on their status page.`
            : `Please write at least ${MIN_MESSAGE} characters so the applicant knows what to do.`,
      },
    };
  }

  return {
    ok: true,
    decision: {
      action,
      status: meta.status,
      // An empty optional message is stored as null, not "", so the applicant's status page
      // can simply test for a message rather than for a message that is not blank.
      analystMessage: message.length > 0 ? message : null,
    },
  };
}

/** True once a final decision has been recorded, which the UI states prominently. */
export function isFinalDecision(status: ApplicationStatus): boolean {
  return status === "approved" || status === "declined";
}
