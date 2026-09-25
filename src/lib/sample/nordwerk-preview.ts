import { NORDWERK_ASSESSMENT, NORDWERK_PROFILE } from "./nordwerk";

/**
 * The landing page's scorecard preview, in the shape the CreditMemoPreview component wants.
 *
 * Every value here is now CALCULATED by the credit engine rather than typed in by hand.
 * Before Day 3 these eight rows were hand-computed constants sitting next to a comment
 * promising they matched the engine that did not exist yet. They now come from the engine
 * itself, so the home page cannot drift away from the model it is advertising: change a
 * threshold in the scorecard and the preview moves with it, or the Nordwerk test fails.
 */

export interface PreviewFactor {
  label: string;
  value: string;
  points: number;
  maxPoints: number;
}

/** One decimal place, as the "point to watch" line reads better with round numbers. */
function multiple1dp(value: number | null): string {
  return value === null ? "n/m" : `${value.toFixed(1)}×`;
}

const factors: PreviewFactor[] = NORDWERK_ASSESSMENT.factors.map((factor) => ({
  label: factor.label,
  value: factor.ratio.display,
  points: factor.points,
  maxPoints: factor.maxPoints,
}));

const currentLeverage = NORDWERK_ASSESSMENT.displayRatios.find((r) => r.id === "currentLeverage");
const proFormaLeverage = NORDWERK_ASSESSMENT.factors.find((f) => f.id === "proFormaLeverage")?.ratio;

export const NORDWERK_PREVIEW = {
  company: NORDWERK_PROFILE.company,
  industry: NORDWERK_PROFILE.industry,
  yearsInBusiness: NORDWERK_PROFILE.yearsInBusiness,
  loanAmountEur: NORDWERK_PROFILE.loanAmountEur,
  loanTermMonths: NORDWERK_PROFILE.loanTermMonths,
  factors,
  /** Debt / EBITDA before and after the requested loan, for the "point to watch" callout. */
  leverageBefore: multiple1dp(currentLeverage?.value ?? null),
  leverageAfter: multiple1dp(proFormaLeverage?.value ?? null),
};

export const NORDWERK_SCORE = NORDWERK_ASSESSMENT.score;
