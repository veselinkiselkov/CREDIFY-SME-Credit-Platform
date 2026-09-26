import type { RatioId } from "@/lib/credit";

/**
 * One plain sentence per ratio, written for someone who is not a credit analyst.
 *
 * This is interface copy, not model configuration, which is why it lives here rather than
 * in the engine's scorecard: rewording an explanation must never look like a modelling
 * change in a diff. The numbers come from the engine; only the wording is here.
 */
export const RATIO_MEANINGS: Record<RatioId, string> = {
  proFormaLeverage:
    "How many years of operating earnings the company would owe once this loan is drawn. Lower is safer.",
  interestCoverage:
    "How many times over current earnings cover the current interest bill. It excludes this loan's own interest.",
  currentRatio: "Short-term assets against what falls due within the year. Below 1.0 means a shortfall.",
  netProfitMargin: "What is left as profit out of every euro of revenue, after everything.",
  debtToAssets: "How much of the company is funded by lenders rather than by its owners.",
  yearsInBusiness: "How long the company has been trading. Longer means more evidence to judge by.",
  revenueGrowth: "How revenue moved against the previous year.",
  loanToRevenue: "The size of the request measured against annual turnover.",

  currentLeverage: "Leverage today, before this loan. Shown beside the pro-forma figure to isolate the loan's effect.",
  returnOnAssets: "Profit earned per euro of assets employed. Shown for context, not scored.",
  returnOnEquity:
    "Profit earned per euro the owners have in the business. Shown for context, not scored: it becomes unstable as equity approaches zero.",
  ebitdaMargin: "Operating profitability before interest, tax and depreciation.",
};
