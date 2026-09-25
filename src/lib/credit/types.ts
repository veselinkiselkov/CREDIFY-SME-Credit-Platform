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
 * The figures an assessment is calculated from.
 *
 * The required fields are exactly what the Day 2 application form collects. The optional
 * ones are richer balance-sheet detail the form does not ask for yet; when they are absent
 * the engine still produces a full score and simply skips the checks that need them. That
 * way the engine is ready for a fuller form without changing shape, and nothing has to be
 * invented to fill a gap.
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

  // --- Company -------------------------------------------------------------------------
  yearsInBusiness: number;

  // --- Optional detail -----------------------------------------------------------------
  /**
   * When given, equity is taken from the accounts. When absent, the engine derives it as
   * total assets - existing debt - current liabilities, and says so (see EquityBasis).
   */
  equityEur?: number | null;
  /** Enables the balance-sheet identity check (assets = liabilities + equity). */
  totalLiabilitiesEur?: number | null;
  /** Enables the "cash exceeds current assets" check. */
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
  /** A specific, favourable state: no debt and no interest expense. */
  | "no-debt"
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
  | "debt-without-interest-expense";

export interface DataQualityWarning {
  id: DataQualityWarningId;
  label: string;
  detail: string;
}

/** Whether equity came from the accounts or was derived, which the analyst should know. */
export interface EquityBasis {
  valueEur: number;
  /** true when derived as total assets - existing debt - current liabilities. */
  derived: boolean;
  explanation: string;
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

  equity: EquityBasis;

  /**
   * Repeated on every assessment so a result cannot be copied somewhere else and lose it.
   * The engine never approves or rejects: it produces analysis, and an analyst decides.
   */
  disclaimer: string;
}
