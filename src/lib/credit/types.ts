import type { RiskGrade } from "@/lib/risk-grades";

/**
 * THE CREDIT ENGINE'S CONTRACT.
 *
 * Everything the engine needs comes in through CreditInput, and everything it has to say
 * comes out through CreditAssessment. It reads no database, calls no network and touches no
 * React. That is what makes it testable: a test is a plain object in and a plain object out.
 *
 * It is also what makes it DETERMINISTIC. The same input always produces the same score,
 * because nothing else can influence it - no clock, no random number, no language model.
 * An analyst can therefore be shown exactly why a number came out the way it did, and the
 * same case re-run next year gives the same answer.
 */

// =======================================================================================
// INPUT
// =======================================================================================

/**
 * The figures an assessment is calculated from. These are exactly what the application form
 * collects, with `cashEur` the one optional extra.
 */
export interface CreditInput {
  // --- The request ---------------------------------------------------------------------
  loanAmountEur: number;

  // --- Profit and loss, most recent full financial year --------------------------------
  revenueEur: number;
  /** null when the applicant did not provide a prior year. Scored as neutral, not as zero. */
  revenuePriorYearEur: number | null;
  ebitdaEur: number;
  netIncomeEur: number;
  interestExpenseEur: number;

  // --- Balance sheet at year end -------------------------------------------------------
  /** Interest-bearing debt only; excludes trade payables. */
  existingDebtEur: number;
  totalAssetsEur: number;
  currentAssetsEur: number;
  currentLiabilitiesEur: number;
  /** Everything owed, short and long term. Reported, never derived. */
  totalLiabilitiesEur: number;
  /**
   * Shareholders' equity AS REPORTED. May be negative.
   *
   * This figure is asked for rather than calculated. The engine used to derive it as
   * `total assets − interest-bearing debt − current liabilities`, which is unreliable in
   * both directions: interest-bearing debt can overlap with current liabilities (the current
   * portion of a term loan sits in both), while current liabilities miss long-term non-debt
   * items such as provisions, deferred tax and lease obligations. The net error typically
   * OVERSTATES equity, which is the dangerous direction - it makes the negative-equity
   * critical flag fire less often than it should.
   */
  equityEur: number;

  // --- Company -------------------------------------------------------------------------
  yearsInBusiness: number;

  // --- Optional detail -----------------------------------------------------------------
  /** Enables the "cash exceeds current assets" check. The form does not collect it yet. */
  cashEur?: number | null;
}

// =======================================================================================
// RATIOS
// =======================================================================================

export type ScoredRatioId =
  | "proFormaLeverage"
  | "interestCoverage"
  | "currentRatio"
  | "netProfitMargin"
  | "debtToAssets"
  | "yearsInBusiness"
  | "revenueGrowth"
  | "loanToRevenue";

export type DisplayRatioId = "currentLeverage" | "returnOnAssets" | "returnOnEquity" | "ebitdaMargin";

export type RatioId = ScoredRatioId | DisplayRatioId;

/**
 * Why a ratio has no number.
 *
 * Keeping these as named states, rather than letting a NaN or an Infinity travel through
 * the system, is the single most important defensive decision in the engine. A NaN that
 * reaches the interface renders as "NaN"; worse, NaN comparisons are all false, so a
 * threshold check would silently fall through to the bottom band and quietly mis-score a
 * company. Every division here is guarded, and the reason is carried forward.
 */
export type RatioStatus =
  /** A real number was calculated. */
  | "ok"
  /** Mathematically undefined or economically meaningless, e.g. leverage on negative EBITDA. */
  | "not-meaningful"
  /** No interest-bearing debt and no interest expense. The best possible state. */
  | "no-debt"
  /**
   * Debt is outstanding but the reported interest expense is zero.
   *
   * Scored on the figures as reported - there is no interest burden in them - with a
   * data-quality warning asking the analyst to confirm the debt really is interest-free.
   * Judging the credit and questioning the data are two different jobs.
   */
  | "no-interest-reported"
  /** Nothing falls due within the year, so the current ratio has no denominator. */
  | "no-current-liabilities"
  /** An input needed for this ratio was not supplied. */
  | "not-provided";

export interface RatioResult {
  id: RatioId;
  label: string;
  /** null whenever status is not "ok". Never NaN, never Infinity. */
  value: number | null;
  /** Always safe to render: "2.86×", "6.2%", "n/m", "No debt", "Not provided". */
  display: string;
  status: RatioStatus;
  /** Plain-language reason shown to the analyst when status is not "ok". */
  note?: string;
}

// =======================================================================================
// SCORING
// =======================================================================================

export interface FactorResult {
  id: ScoredRatioId;
  label: string;
  points: number;
  maxPoints: number;
  /** The scoring band the value fell into, e.g. "2.5–3.5×". */
  band: string;
  /** The ratio this factor scored, including its display string. */
  ratio: RatioResult;
  /** points / maxPoints, 0 to 1. Drives the strength and risk thresholds. */
  share: number;
}

// =======================================================================================
// FLAGS, NARRATIVE, DATA QUALITY
// =======================================================================================

export type CriticalFlagId = "non-positive-ebitda" | "negative-equity" | "interest-coverage-below-1" | "current-ratio-below-0-8";

export interface CriticalFlag {
  id: CriticalFlagId;
  label: string;
  /** What was found, in the applicant's own numbers. */
  detail: string;
}

export type DataQualityWarningId =
  | "balance-sheet-mismatch"
  | "cash-exceeds-current-assets"
  | "current-assets-exceed-total-assets"
  | "net-income-exceeds-ebitda"
  | "current-liabilities-exceed-total-liabilities"
  | "debt-without-interest-expense"
  | "no-current-liabilities";

export interface DataQualityWarning {
  id: DataQualityWarningId;
  label: string;
  detail: string;
}

// =======================================================================================
// OUTPUT
// =======================================================================================

export interface CreditAssessment {
  /** The scorecard version these numbers were produced by, e.g. "v1.0". */
  modelVersion: string;

  /** 0-100. The sum of the eight factor scores; never adjusted by the cap. */
  score: number;
  /** The grade actually to be shown, after any critical-flag cap. */
  grade: RiskGrade;
  /** The grade the score alone would give. Equal to `grade` when nothing is capped. */
  uncappedGrade: RiskGrade;
  /** true when a critical flag held the grade below what the score alone would give. */
  gradeCapped: boolean;

  factors: FactorResult[];
  /** The four ratios shown to the analyst but deliberately not scored. */
  displayRatios: RatioResult[];

  criticalFlags: CriticalFlag[];
  /** Deterministic sentences built from the calculated values. Never AI-generated. */
  strengths: string[];
  risks: string[];
  /** Concerns about the INPUT data. Never affects the score. */
  dataQualityWarnings: DataQualityWarning[];

  /** Shareholders' equity as reported by the applicant. Echoed back for the analyst. */
  equityEur: number;

  /**
   * Repeated on every assessment so a result cannot be copied somewhere else and lose it.
   * The engine never approves or rejects: it produces analysis, and an analyst decides.
   */
  disclaimer: string;
}
