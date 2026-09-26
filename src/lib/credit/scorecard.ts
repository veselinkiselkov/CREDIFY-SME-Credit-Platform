import { MODEL_VERSION } from "@/lib/risk-grades";
import type { CriticalFlagId, RatioResult, RatioStatus, ScoredRatioId } from "./types";

/**
 * SCORECARD v1.0 - THE ONLY PLACE WEIGHTS AND THRESHOLDS ARE WRITTEN DOWN.
 *
 * Every number that decides a score lives in this file. Nothing in ratios.ts or engine.ts
 * contains a threshold, so changing the model means editing this table and nothing else,
 * and a reviewer can audit the whole model by reading one screen.
 *
 * The scorecard is versioned with the same MODEL_VERSION the rest of the app displays, so a
 * stored result can always be traced back to the model that produced it.
 *
 * HOW A BAND IS CHOSEN
 * Bands are listed best first. `bound` is INCLUSIVE, and its meaning follows `direction`:
 *
 *   higher-is-better  ->  the first band where  value >= bound  wins
 *   lower-is-better   ->  the first band where  value <= bound  wins
 *
 * The last band is unbounded (-Infinity or Infinity), so a value always lands somewhere.
 * This makes every boundary unambiguous in one direction: for leverage, exactly 2.5x scores
 * 20 (the "1.5-2.5x" band), not 14. Each boundary is pinned by a test.
 *
 * WHY THESE EIGHT FACTORS, AND THESE WEIGHTS
 * The 45 points on leverage and interest coverage are deliberate: whether a business can
 * carry and service its debt is the question a lender is actually asking. Liquidity and
 * profitability (30) describe whether it survives the year and earns anything. The
 * remaining 25 are context - balance-sheet structure, trading history, growth, and how big
 * the request is relative to the business. The weights are a considered starting point for
 * an illustrative model, not a calibrated PD model fitted to default data.
 */

export const SCORECARD_VERSION = MODEL_VERSION;

export type BandDirection = "higher-is-better" | "lower-is-better";

export interface ScoreBand {
  /** Inclusive. A minimum when higher-is-better, a maximum when lower-is-better. */
  bound: number;
  points: number;
  /** How this band is written in the methodology table, e.g. "2.5-3.5x". */
  label: string;
}

export interface FactorConfig {
  id: ScoredRatioId;
  label: string;
  maxPoints: number;
  direction: BandDirection;
  /** Best band first. */
  bands: ScoreBand[];
  /**
   * Points awarded when the ratio has no number, keyed by why.
   * Anything not listed here scores 0. Being explicit means an unscoreable ratio can never
   * silently pick up points, and the two places where it SHOULD (no debt at all, no prior
   * year supplied) are visible right here rather than buried in a branch.
   */
  pointsWhenUnscoreable?: Partial<Record<RatioStatus, number>>;
  /** Label used for the band column when the ratio has no number. */
  unscoreableBandLabel?: Partial<Record<RatioStatus, string>>;
  /** Sentence emitted when this factor scores >= 80% of its maximum. */
  strength: (ratio: RatioResult) => string;
  /** Sentence emitted when this factor scores <= 40% of its maximum. */
  risk: (ratio: RatioResult) => string;
}

/**
 * A factor at or above this share of its maximum is reported to the analyst as a strength;
 * at or below the lower one, as a risk factor. Between them the factor is unremarkable and
 * generates no sentence, which keeps the summary short enough to actually be read.
 */
export const STRENGTH_THRESHOLD = 0.8;
export const RISK_THRESHOLD = 0.4;

export const SCORECARD: readonly FactorConfig[] = [
  // -------------------------------------------------------------------------------------
  // 1. LEVERAGE - 25 points. The largest single weight in the model.
  //
  // Scored PRO FORMA: (existing debt + requested loan) / EBITDA. The question a lender is
  // answering is not "can this business carry the debt it already has" - it plainly can,
  // or it would not still be trading - but "can it carry the debt it is about to have".
  // Scoring today's leverage would approve the loan on the strength of the balance sheet
  // that exists before the money is lent, which is the wrong balance sheet.
  // -------------------------------------------------------------------------------------
  {
    id: "proFormaLeverage",
    label: "Leverage after the loan",
    maxPoints: 25,
    direction: "lower-is-better",
    bands: [
      { bound: 1.5, points: 25, label: "≤ 1.5×" },
      { bound: 2.5, points: 20, label: "1.5–2.5×" },
      { bound: 3.5, points: 14, label: "2.5–3.5×" },
      { bound: 4.5, points: 8, label: "3.5–4.5×" },
      { bound: 6.0, points: 3, label: "4.5–6.0×" },
      { bound: Infinity, points: 0, label: "> 6.0×" },
    ],
    // EBITDA of zero or less makes the ratio meaningless, and scores zero. It is also a
    // critical flag, so the grade is capped as well.
    unscoreableBandLabel: { "not-meaningful": "EBITDA ≤ 0" },
    strength: (r) => `Debt of ${r.display} EBITDA after the new loan leaves comfortable headroom.`,
    risk: (r) =>
      r.status === "ok"
        ? `Pro-forma Debt/EBITDA of ${r.display} is elevated: the business would owe over ${Math.round(r.value ?? 0)} years of earnings.`
        : `Leverage cannot be measured because EBITDA is zero or negative.`,
  },

  // -------------------------------------------------------------------------------------
  // 2. CURRENT INTEREST COVERAGE - 20 points.
  //
  // EBITDA / current interest expense. Named "Current" with intent: it measures the
  // interest burden the business carries TODAY. It is NOT a debt service coverage ratio -
  // it includes neither the interest nor the principal of the loan being requested, because
  // the MVP does not model a rate or an amortisation schedule. Calling it DSCR would claim
  // a post-financing view the model does not have. A real DSCR is planned, and when it
  // arrives it belongs beside this factor, not disguised as it.
  // -------------------------------------------------------------------------------------
  {
    id: "interestCoverage",
    label: "Current interest coverage",
    maxPoints: 20,
    direction: "higher-is-better",
    bands: [
      { bound: 8, points: 20, label: "≥ 8×" },
      { bound: 5, points: 16, label: "5–8×" },
      { bound: 3, points: 11, label: "3–5×" },
      { bound: 2, points: 6, label: "2–3×" },
      { bound: 1.5, points: 2, label: "1.5–2×" },
      { bound: -Infinity, points: 0, label: "< 1.5×" },
    ],
    // Both zero-interest states score full marks, because on the figures as reported there
    // is no interest burden to cover. The second one is simultaneously flagged by the
    // data-quality checks, which is where doubt about a figure belongs - not in the score.
    pointsWhenUnscoreable: { "no-debt": 20, "no-interest-reported": 20 },
    unscoreableBandLabel: { "no-debt": "No debt", "no-interest-reported": "No interest reported" },
    strength: (r) => {
      if (r.status === "no-debt") return `The business carries no interest-bearing debt today.`;
      if (r.status === "no-interest-reported") {
        return `No interest expense is reported against the outstanding debt, so nothing has to be covered on the figures given.`;
      }
      return `Current Interest Coverage of ${r.display} indicates strong interest-payment capacity.`;
    },
    risk: (r) =>
      r.status === "ok"
        ? `Current Interest Coverage of ${r.display} leaves little room before interest payments are at risk.`
        : `Current Interest Coverage could not be calculated.`,
  },

  // -------------------------------------------------------------------------------------
  // 3. LIQUIDITY - 15 points. Current assets / current liabilities.
  // Can the business pay what falls due within the year without new borrowing.
  // -------------------------------------------------------------------------------------
  {
    id: "currentRatio",
    label: "Liquidity",
    maxPoints: 15,
    direction: "higher-is-better",
    bands: [
      { bound: 2.0, points: 15, label: "≥ 2.0" },
      { bound: 1.5, points: 12, label: "1.5–2.0" },
      { bound: 1.2, points: 8, label: "1.2–1.5" },
      { bound: 1.0, points: 4, label: "1.0–1.2" },
      { bound: -Infinity, points: 0, label: "< 1.0" },
    ],
    // Nothing falling due within the year is the strongest liquidity position there is, not
    // an unmeasurable one. A zero denominator must not be read as the worst case.
    pointsWhenUnscoreable: { "no-current-liabilities": 15 },
    unscoreableBandLabel: { "no-current-liabilities": "No current liabilities" },
    strength: (r) =>
      r.status === "no-current-liabilities"
        ? `Nothing is reported as falling due within twelve months.`
        : `Current Ratio of ${r.display} indicates adequate short-term liquidity.`,
    risk: (r) =>
      r.status === "ok"
        ? `Current Ratio of ${r.display} means short-term liabilities are close to, or above, short-term assets.`
        : `Current Ratio could not be calculated.`,
  },

  // -------------------------------------------------------------------------------------
  // 4. PROFITABILITY - 15 points. Net income / revenue.
  // Margin is used rather than return on assets or equity: see ratios.ts for why those two
  // are shown but not scored.
  // -------------------------------------------------------------------------------------
  {
    id: "netProfitMargin",
    label: "Profitability",
    maxPoints: 15,
    direction: "higher-is-better",
    bands: [
      { bound: 0.1, points: 15, label: "≥ 10%" },
      { bound: 0.05, points: 11, label: "5–10%" },
      { bound: 0.02, points: 7, label: "2–5%" },
      { bound: 0, points: 3, label: "0–2%" },
      { bound: -Infinity, points: 0, label: "< 0%" },
    ],
    unscoreableBandLabel: { "not-meaningful": "No revenue" },
    strength: (r) => `Net margin of ${r.display} is healthy for an SME.`,
    risk: (r) =>
      r.status === "ok"
        ? `Net margin of ${r.display} leaves very little retained profit to absorb a bad year.`
        : `Net margin could not be calculated.`,
  },

  // -------------------------------------------------------------------------------------
  // 5. CAPITAL STRUCTURE - 10 points. Existing debt / total assets.
  // How much of the business is already funded by lenders rather than owners.
  // -------------------------------------------------------------------------------------
  {
    id: "debtToAssets",
    label: "Capital structure",
    maxPoints: 10,
    direction: "lower-is-better",
    bands: [
      { bound: 0.2, points: 10, label: "≤ 20%" },
      { bound: 0.35, points: 8, label: "20–35%" },
      { bound: 0.5, points: 5, label: "35–50%" },
      { bound: 0.65, points: 2, label: "50–65%" },
      { bound: Infinity, points: 0, label: "> 65%" },
    ],
    unscoreableBandLabel: { "not-meaningful": "No assets" },
    strength: (r) => `Debt funds only ${r.display} of total assets, so the owners carry most of the risk.`,
    risk: (r) =>
      r.status === "ok"
        ? `Debt funds ${r.display} of total assets, leaving a thin equity cushion.`
        : `Debt-to-assets could not be calculated.`,
  },

  // -------------------------------------------------------------------------------------
  // 6. TRACK RECORD - 5 points. Years in business.
  // A crude but genuinely predictive proxy: businesses that have survived a decade have
  // already survived at least one downturn.
  // -------------------------------------------------------------------------------------
  {
    id: "yearsInBusiness",
    label: "Track record",
    maxPoints: 5,
    direction: "higher-is-better",
    bands: [
      { bound: 10, points: 5, label: "≥ 10 years" },
      { bound: 5, points: 4, label: "5–10 years" },
      { bound: 3, points: 3, label: "3–5 years" },
      { bound: 1, points: 1, label: "1–3 years" },
      { bound: -Infinity, points: 0, label: "< 1 year" },
    ],
    strength: (r) => `${r.value} years of trading history through at least one downturn.`,
    risk: (r) => `Only ${r.value} year${r.value === 1 ? "" : "s"} of trading history, so there is little evidence to judge by.`,
  },

  // -------------------------------------------------------------------------------------
  // 7. REVENUE TREND - 5 points. Revenue / prior-year revenue - 1.
  //
  // A missing prior year scores 2 of 5 - the same as a mild decline. Scoring it zero would
  // punish an applicant for a question they were not asked; scoring it full marks would
  // reward leaving the field blank. Neutral is the only honest answer.
  // -------------------------------------------------------------------------------------
  {
    id: "revenueGrowth",
    label: "Revenue trend",
    maxPoints: 5,
    direction: "higher-is-better",
    bands: [
      { bound: 0.1, points: 5, label: "≥ +10%" },
      { bound: 0, points: 4, label: "0 to +10%" },
      { bound: -0.05, points: 2, label: "−5% to 0" },
      { bound: -0.15, points: 1, label: "−15% to −5%" },
      { bound: -Infinity, points: 0, label: "< −15%" },
    ],
    pointsWhenUnscoreable: { "not-provided": 2 },
    unscoreableBandLabel: { "not-provided": "Not provided", "not-meaningful": "No prior-year revenue" },
    strength: (r) => `Revenue grew ${r.display} on the previous year.`,
    risk: (r) =>
      r.status === "ok"
        ? `Revenue moved ${r.display} on the previous year.`
        : `No prior-year revenue was provided, so the trend cannot be assessed.`,
  },

  // -------------------------------------------------------------------------------------
  // 8. LOAN SIZE - 5 points. Requested loan / revenue.
  // A small loan against a large turnover is easier to absorb than the reverse, whatever
  // the other ratios say.
  // -------------------------------------------------------------------------------------
  {
    id: "loanToRevenue",
    label: "Loan size",
    maxPoints: 5,
    direction: "lower-is-better",
    bands: [
      { bound: 0.1, points: 5, label: "≤ 10%" },
      { bound: 0.2, points: 4, label: "10–20%" },
      { bound: 0.35, points: 2, label: "20–35%" },
      { bound: 0.5, points: 1, label: "35–50%" },
      { bound: Infinity, points: 0, label: "> 50%" },
    ],
    unscoreableBandLabel: { "not-meaningful": "No revenue" },
    strength: (r) => `The request is ${r.display} of annual revenue, a modest step up.`,
    risk: (r) =>
      r.status === "ok"
        ? `The request is ${r.display} of annual revenue, which is large relative to the size of the business.`
        : `Loan-to-revenue could not be calculated.`,
  },
];

/** 100 by construction. Asserted by a test so a weight change cannot quietly break the scale. */
export const MAX_SCORE = SCORECARD.reduce((total, factor) => total + factor.maxPoints, 0);

/**
 * Tolerance applied at band boundaries.
 *
 * Ratios are computed in binary floating point, where a figure that is exactly −5% on paper
 * can come out as −0.050000000000000044. Compared strictly, that misses the "−5% to 0" band
 * and drops a company a whole band on nothing but representation error.
 *
 * 1e-9 is about a millionth of a percentage point: far too small to matter to any credit
 * judgement, and far larger than the 1e-16 noise of double arithmetic. It makes the
 * inclusive bounds above behave the way they read.
 */
const BOUNDARY_TOLERANCE = 1e-9;

/**
 * Picks the band a value falls into. Exported so the methodology page (Day 5) and the tests
 * can use exactly the same logic the scorer uses.
 */
export function bandFor(factor: FactorConfig, value: number): ScoreBand {
  const match = factor.bands.find((band) =>
    factor.direction === "higher-is-better"
      ? value >= band.bound - BOUNDARY_TOLERANCE
      : value <= band.bound + BOUNDARY_TOLERANCE,
  );
  // The final band is unbounded, so a match is guaranteed; the fallback satisfies TypeScript.
  return match ?? factor.bands[factor.bands.length - 1];
}

// =======================================================================================
// CRITICAL FLAGS
// =======================================================================================

/**
 * The four conditions that cap the risk grade, and the thresholds they fire at.
 *
 * Declared here rather than inline in engine.ts so there is ONE place the numbers live.
 * The engine reads them to decide, and the methodology page reads them to explain - so the
 * published explanation of the model cannot drift away from the model.
 *
 * Each one says the same thing a different way: this business may not be able to pay,
 * whatever the other seven factors add up to.
 */
export interface CriticalFlagRule {
  id: CriticalFlagId;
  label: string;
  /** The number the rule fires at, where it has one. Null for the sign tests. */
  threshold: number | null;
  /** How the rule is written in the methodology table. */
  condition: string;
  /** Why a lender cares, in one sentence. */
  rationale: string;
}

export const CRITICAL_FLAG_RULES: readonly CriticalFlagRule[] = [
  {
    id: "non-positive-ebitda",
    label: "EBITDA is zero or negative",
    threshold: 0,
    condition: "EBITDA ≤ 0",
    rationale:
      "There are no operating earnings to service debt from, so every leverage and coverage measure loses its meaning.",
  },
  {
    id: "negative-equity",
    label: "Negative shareholders' equity",
    threshold: 0,
    condition: "Reported equity < 0",
    rationale:
      "Liabilities exceed assets: the owners' stake has been exhausted and lenders are funding the losses.",
  },
  {
    id: "interest-coverage-below-1",
    label: "Interest coverage below 1.0×",
    threshold: 1.0,
    condition: "EBITDA / interest expense < 1.0×",
    rationale: "Operating earnings do not cover the interest already owed, before any new borrowing.",
  },
  {
    id: "current-ratio-below-0-8",
    label: "Current ratio below 0.8",
    threshold: 0.8,
    condition: "Current assets / current liabilities < 0.8",
    rationale: "Short-term obligations substantially exceed short-term assets, so a cash squeeze is imminent.",
  },
];

/** Looks a rule up by id, so the engine and the page cannot disagree about its threshold. */
export function criticalFlagRule(id: CriticalFlagId): CriticalFlagRule {
  const rule = CRITICAL_FLAG_RULES.find((r) => r.id === id);
  if (!rule) throw new Error(`Unknown critical flag rule: ${id}`);
  return rule;
}
