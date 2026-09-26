import {
  CRITICAL_FLAG_RULES,
  DATA_QUALITY_CHECKS,
  MAX_SCORE,
  SCORECARD,
  SCORECARD_VERSION,
  type DisplayRatioId,
  type ScoredRatioId,
} from "@/lib/credit";
import { RISK_GRADES } from "@/lib/risk-grades";

/**
 * WHAT THE METHODOLOGY PAGE PUBLISHES.
 *
 * Every threshold, weight, band label, grade range and flag condition on that page is READ
 * FROM THE ENGINE'S CONFIGURATION here. Nothing is retyped. Change a band in
 * lib/credit/scorecard.ts and the published methodology changes with it, or a test fails.
 *
 * That matters more than it sounds. A model whose published explanation has quietly drifted
 * from its implementation is worse than one with no explanation at all, because people have
 * been making decisions against a document that stopped being true.
 *
 * Only the prose - what a factor measures and why a lender cares - is written here. It is
 * editorial copy, not model configuration, and rewording it must never look like a
 * modelling change in a diff.
 */

export { MAX_SCORE, SCORECARD_VERSION };

interface FactorCopy {
  measures: string;
  matters: string;
}

/** One entry per scored factor. A test asserts this covers the scorecard exactly. */
export const FACTOR_COPY: Record<ScoredRatioId, FactorCopy> = {
  proFormaLeverage: {
    measures:
      "Total interest-bearing debt AFTER this loan is drawn, divided by EBITDA. It answers: how many years of operating earnings would the company owe?",
    matters:
      "It is the single best summary of whether a business can carry a given amount of debt, and it is scored pro forma because the question is about the balance sheet the loan creates, not the one that exists before it.",
  },
  interestCoverage: {
    measures:
      "EBITDA divided by the interest expense the company pays today. It excludes the interest on the loan being requested.",
    matters:
      "Leverage says how much is owed; coverage says whether the earnings actually arrive in time to service it. A company can look acceptably leveraged and still be unable to meet its interest bill.",
  },
  currentRatio: {
    measures: "Current assets divided by current liabilities: what can be turned into cash within a year against what falls due within a year.",
    matters:
      "Most small businesses that fail do so because they run out of cash, not because they were unprofitable. Below 1.0 there is a shortfall on paper before anything goes wrong.",
  },
  netProfitMargin: {
    measures: "Net income after tax as a percentage of revenue.",
    matters:
      "Retained profit is the first buffer against a bad year. A thin margin means very little has to go wrong before the business is loss-making.",
  },
  debtToAssets: {
    measures: "Existing interest-bearing debt as a percentage of total assets.",
    matters:
      "It shows how much of the business is already funded by lenders rather than owners. A thin equity cushion means losses reach the lender sooner.",
  },
  yearsInBusiness: {
    measures: "How long the company has been trading.",
    matters:
      "A crude but genuinely predictive proxy: a business that has survived a decade has already survived at least one downturn. Most failures happen in the first few years.",
  },
  revenueGrowth: {
    measures: "Revenue against the previous year.",
    matters:
      "Direction of travel. A shrinking business servicing fixed debt is a different risk from a growing one with identical ratios today.",
  },
  loanToRevenue: {
    measures: "The requested amount as a percentage of annual revenue.",
    matters:
      "A sense of proportion. A small loan against a large turnover is absorbed easily; a request approaching annual revenue is a step change whatever the other ratios say.",
  },
};

/** Why each display-only ratio is shown but never scored. */
export const DISPLAY_RATIO_NOTES: Record<DisplayRatioId, { label: string; reason: string }> = {
  currentLeverage: {
    label: "Current Debt / EBITDA",
    reason:
      "Leverage before the loan. Shown beside the pro-forma figure so an analyst can see exactly what the request changes. Scoring both would count leverage twice.",
  },
  returnOnAssets: {
    label: "Return on Assets",
    reason:
      "Net income over total assets. It is built from the same net income already scored by Net Profit Margin, so scoring it too would count one year's profit twice.",
  },
  returnOnEquity: {
    label: "Return on Equity",
    reason:
      "Same double-counting problem, and worse: its denominator is the smallest number on the balance sheet, so it explodes as equity approaches zero. A nearly insolvent company can post a spectacular return on equity — the opposite of what a risk score should reward.",
  },
  ebitdaMargin: {
    label: "EBITDA Margin",
    reason:
      "Operating profitability before interest, tax and depreciation. Useful context alongside the net margin that is scored, but a third profitability measure would over-weight a single year's trading.",
  },
};

export interface MethodologyFactor {
  id: ScoredRatioId;
  label: string;
  maxPoints: number;
  /** Share of the 100-point scale, for the weight column. */
  weightPercent: number;
  direction: "higher-is-better" | "lower-is-better";
  measures: string;
  matters: string;
  bands: { label: string; points: number }[];
  /** Points awarded when the ratio has no value, e.g. "No debt" scoring full marks. */
  specialCases: { label: string; points: number }[];
}

/** The eight factors, built from the scorecard configuration. */
export function methodologyFactors(): MethodologyFactor[] {
  return SCORECARD.map((factor) => ({
    id: factor.id,
    label: factor.label,
    maxPoints: factor.maxPoints,
    weightPercent: Math.round((factor.maxPoints / MAX_SCORE) * 100),
    direction: factor.direction,
    measures: FACTOR_COPY[factor.id].measures,
    matters: FACTOR_COPY[factor.id].matters,
    bands: factor.bands.map((band) => ({ label: band.label, points: band.points })),
    specialCases: Object.entries(factor.unscoreableBandLabel ?? {}).map(([status, label]) => ({
      label: label as string,
      points: factor.pointsWhenUnscoreable?.[status as keyof typeof factor.pointsWhenUnscoreable] ?? 0,
    })),
  }));
}

/** The five grades, from the Day 1 source of truth. */
export function methodologyGrades() {
  return RISK_GRADES.map((grade) => ({
    id: grade.id,
    label: grade.label,
    range: `${grade.minScore}–${grade.maxScore}`,
    meaning: grade.meaning,
    swatchClass: grade.swatchClass,
  }));
}

export function methodologyCriticalFlags() {
  return CRITICAL_FLAG_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    condition: rule.condition,
    rationale: rule.rationale,
  }));
}

export function methodologyDataQualityChecks() {
  return DATA_QUALITY_CHECKS.map((check) => ({
    id: check.id,
    label: check.label,
    description: check.description,
  }));
}

/**
 * The model's limitations, stated plainly.
 *
 * Published as part of the methodology rather than buried, because a scorecard that is
 * honest about what it cannot see is more usable than one that implies it sees everything.
 * An analyst who knows the model has no view on collateral will go and look at the security.
 */
export const LIMITATIONS: { title: string; detail: string }[] = [
  {
    title: "One set of thresholds is applied to every industry",
    detail:
      "The largest weakness in v1.0. A 1.2 current ratio is comfortable for a consultancy that carries no stock and is paid in thirty days; it is tight for a manufacturer financing raw materials and work in progress. The model therefore flatters asset-light service businesses and penalises working-capital-intensive ones. The application already collects industry, so the data to correct this is being gathered — industry-specific bands are the intended next version.",
  },
  {
    title: "Thresholds are reasoned, not calibrated on historical defaults",
    detail:
      "The bands and weights are a considered starting point for an illustrative model. A real underwriting scorecard is fitted to an observed default book, tested out of sample, and revalidated on a schedule. None of that has happened here.",
  },
  {
    title: "Current Interest Coverage is not a DSCR",
    detail:
      "It measures the interest burden carried today. It contains neither the interest nor the principal of the loan being requested, because the model has no interest rate and no amortisation schedule. A true debt service coverage ratio needs both, and would sit beside this factor rather than replace it.",
  },
  {
    title: "No external credit bureau data",
    detail:
      "No payment behaviour, no county court judgments, no filed-accounts history, no group structure. A real file would start with a bureau report.",
  },
  {
    title: "No collateral or guarantees",
    detail:
      "Security changes loss given default enormously, and the model has no view of it. This is a large part of why a critical flag caps the grade rather than rejecting the application: the scorecard cannot see the guarantee that might rescue the case.",
  },
  {
    title: "No assessment of management or the business itself",
    detail:
      "Management quality, customer concentration, contract pipeline, key-person risk and sector outlook are all invisible to the model and all matter. They are the analyst's contribution.",
  },
  {
    title: "No macroeconomic input",
    detail:
      "Interest rates, sector cycles and downturn scenarios are not modelled. The score reflects one company's own figures in isolation.",
  },
  {
    title: "One year of self-reported, unaudited figures",
    detail:
      "Everything except the revenue comparison comes from a single financial year, typed in by the applicant and not verified. The data-quality checks catch figures that contradict each other, not figures that are simply wrong.",
  },
  {
    title: "No regulatory capital framework",
    detail:
      "This is not an IFRS 9 expected-credit-loss model and not a Basel IRB rating system. It produces no probability of default, no loss given default and no exposure at default, and must not be used as though it did.",
  },
];
