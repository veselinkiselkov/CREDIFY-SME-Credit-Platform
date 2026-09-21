/**
 * Static preview data for the landing page: the worked example from the MVP plan.
 *
 * Nordwerk Precision GmbH is a FICTIONAL manufacturer. Its inputs:
 *   Revenue EUR 4.2M (prior year EUR 3.9M), EBITDA EUR 630k, net income EUR 260k,
 *   interest expense EUR 70k, existing debt EUR 1.2M, total assets EUR 3.5M,
 *   current assets EUR 1.4M, current liabilities EUR 0.9M, 12 years in business,
 *   requesting EUR 600k over 60 months.
 *
 * On Day 3 these figures are calculated by the scoring engine, and a unit test
 * checks that the engine reproduces this exact result (78 / 100, Moderate).
 * Until then the landing page shows the hand-calculated values below.
 */

export interface PreviewFactor {
  label: string;
  value: string;
  points: number;
  maxPoints: number;
}

const factors: PreviewFactor[] = [
  { label: "Leverage after the loan", value: "2.86×", points: 14, maxPoints: 25 }, // (1.2M + 0.6M) / 630k
  { label: "Current interest coverage", value: "9.0×", points: 20, maxPoints: 20 }, // 630k / 70k
  { label: "Liquidity", value: "1.56", points: 12, maxPoints: 15 }, // 1.4M / 0.9M
  { label: "Profitability", value: "6.2%", points: 11, maxPoints: 15 }, // 260k / 4.2M
  { label: "Capital structure", value: "34.3%", points: 8, maxPoints: 10 }, // 1.2M / 3.5M
  { label: "Track record", value: "12 yrs", points: 5, maxPoints: 5 },
  { label: "Revenue trend", value: "+7.7%", points: 4, maxPoints: 5 }, // 4.2M / 3.9M - 1
  { label: "Loan size", value: "14.3%", points: 4, maxPoints: 5 }, // 600k / 4.2M
];

export const NORDWERK_PREVIEW = {
  company: "Nordwerk Precision GmbH",
  industry: "Manufacturing",
  yearsInBusiness: 12,
  loanAmountEur: 600_000,
  loanTermMonths: 60,
  factors,
  /** Debt / EBITDA before (1.2M / 630k) and after (1.8M / 630k) the requested loan. */
  leverageBefore: "1.9×",
  leverageAfter: "2.9×",
};

/** The total is summed from the factors rather than typed in, so it cannot drift. */
export const NORDWERK_SCORE = factors.reduce((sum, f) => sum + f.points, 0);
