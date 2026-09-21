/**
 * APPLICATION STATUS: the single source of truth for the lifecycle of an application.
 *
 * The same five codes appear in three places, and all three read this file:
 *   - the CHECK constraint on the `applications` table (supabase/schema.sql)
 *   - the applicant's status page
 *   - the analyst dashboard (Day 4)
 *
 * Stored as short codes rather than sentences so the wording can be changed
 * without a database migration.
 *
 * `applicantText` is deliberately written for a business owner, not an analyst,
 * and never mentions a score, a grade or any financial figure.
 */

export const APPLICATION_STATUSES = [
  "submitted",
  "in_review",
  "information_requested",
  "approved",
  "declined",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const DEFAULT_STATUS: ApplicationStatus = "submitted";

interface StatusMeta {
  label: string;
  applicantText: string;
  /** Tailwind class for the badge dot. Written out in full so Tailwind can detect it. */
  dotClass: string;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  submitted: {
    label: "Submitted",
    applicantText: "We have your application. It is queued for a credit analyst.",
    dotClass: "bg-muted-foreground",
  },
  in_review: {
    label: "In review",
    applicantText: "A credit analyst is working through your application.",
    dotClass: "bg-primary",
  },
  information_requested: {
    label: "Information requested",
    applicantText: "The analyst needs something more from you before they can continue. Their note is below.",
    dotClass: "bg-risk-elevated",
  },
  approved: {
    label: "Approved",
    applicantText: "A credit analyst has approved your application.",
    dotClass: "bg-risk-low",
  },
  declined: {
    label: "Declined",
    applicantText: "A credit analyst has declined your application.",
    dotClass: "bg-risk-very-high",
  },
};

/** Guards data coming back from the database, which TypeScript cannot check for us. */
export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && (APPLICATION_STATUSES as readonly string[]).includes(value);
}
