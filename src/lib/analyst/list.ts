import { INDUSTRIES, LOAN_PURPOSES } from "@/lib/applications/options";
import type { ApplicationRecord } from "@/lib/applications/repository";
import type { ApplicationStatus } from "@/lib/applications/status";
import { RISK_GRADES, type RiskGradeId } from "@/lib/risk-grades";
import { scoreApplication } from "./scoring";

/**
 * THE DASHBOARD'S DATA SHAPE.
 *
 * An AnalystListItem is everything one table row needs and nothing else. The full
 * application - revenue, EBITDA, the balance sheet, contact details - stays on the server;
 * only these fields are serialised into the page for the table's filtering and sorting to
 * work in the browser.
 *
 * That is a deliberate boundary. The dashboard lists every borrower in the book, so
 * shipping each one's complete financials to the client just to render nine columns would
 * put the whole portfolio's accounts into the page source. The detail page fetches the rest
 * on the server, for one borrower, when the analyst actually opens it.
 *
 * `access_token` is not in this type, is not in the query behind it, and has no route into
 * the analyst UI.
 */
export interface AnalystListItem {
  id: string;
  reference: string;
  companyName: string;
  industry: string;
  industryLabel: string;
  loanAmountEur: number | null;
  loanPurposeLabel: string;
  status: ApplicationStatus;
  submittedAt: string;

  /** false when a required figure is missing, in which case there is no score or grade. */
  scored: boolean;
  score: number | null;
  gradeId: RiskGradeId | null;
  gradeLabel: string | null;
  /** true when a critical flag held the grade below what the score alone would give. */
  gradeCapped: boolean;
  criticalFlagCount: number;
  /** How many required figures are missing. Drives the "Incomplete" badge. */
  missingCount: number;
}

function labelFor(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Projects a stored application into the row the dashboard renders. */
export function toListItem(record: ApplicationRecord, now: Date = new Date()): AnalystListItem {
  const scoring = scoreApplication(record, now);

  const base = {
    id: record.id,
    reference: record.reference,
    companyName: record.companyName,
    industry: record.industry,
    industryLabel: labelFor(INDUSTRIES, record.industry),
    loanAmountEur: record.loanAmountEur,
    loanPurposeLabel: labelFor(LOAN_PURPOSES, record.loanPurpose),
    status: record.status,
    submittedAt: record.submittedAt,
  };

  if (scoring.status === "incomplete") {
    return {
      ...base,
      scored: false,
      score: null,
      gradeId: null,
      gradeLabel: null,
      gradeCapped: false,
      criticalFlagCount: 0,
      missingCount: scoring.missing.length,
    };
  }

  const { assessment } = scoring;
  return {
    ...base,
    scored: true,
    score: assessment.score,
    gradeId: assessment.grade.id,
    gradeLabel: assessment.grade.label,
    gradeCapped: assessment.gradeCapped,
    criticalFlagCount: assessment.criticalFlags.length,
    missingCount: 0,
  };
}

// =======================================================================================
// Portfolio summary
// =======================================================================================

export interface PortfolioSummary {
  total: number;
  awaitingReview: number;
  /** Sum of every requested amount, including applications that cannot be scored. */
  totalRequestedEur: number;
  /**
   * Mean score across SCOREABLE applications only, or null when none can be scored.
   *
   * Unscored applications are excluded rather than counted as zero. Averaging a missing
   * figure in as a zero would drag the portfolio's apparent quality down for a reason that
   * has nothing to do with credit, so the card shows the denominator alongside the number.
   */
  averageScore: number | null;
  scoredCount: number;
  unscoredCount: number;
}

export function summarise(items: AnalystListItem[]): PortfolioSummary {
  const scored = items.filter((item) => item.scored && item.score !== null);
  const scoreTotal = scored.reduce((total, item) => total + (item.score ?? 0), 0);

  return {
    total: items.length,
    awaitingReview: items.filter((item) => item.status === "submitted").length,
    totalRequestedEur: items.reduce((total, item) => total + (item.loanAmountEur ?? 0), 0),
    averageScore: scored.length > 0 ? Math.round(scoreTotal / scored.length) : null,
    scoredCount: scored.length,
    unscoredCount: items.length - scored.length,
  };
}

// =======================================================================================
// Risk distribution
// =======================================================================================

export interface DistributionBar {
  gradeId: RiskGradeId;
  label: string;
  count: number;
  /** CSS colour, read from the same design token the badges and the risk scale use. */
  colorVar: string;
}

/**
 * Counts per risk grade, always returning all five in best-to-worst order.
 *
 * Grades with no applications are kept rather than dropped, so the chart's shape stays
 * comparable as the book fills up and an empty band is visibly empty instead of missing.
 * Applications that cannot be scored are NOT a sixth bar - they have no grade - and are
 * reported separately by `summarise`.
 */
export function riskDistribution(items: AnalystListItem[]): DistributionBar[] {
  return RISK_GRADES.map((grade) => ({
    gradeId: grade.id,
    label: grade.label,
    count: items.filter((item) => item.gradeId === grade.id).length,
    colorVar: `var(--risk-${grade.id})`,
  }));
}
