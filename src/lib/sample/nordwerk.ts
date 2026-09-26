import { assess, type CreditInput } from "@/lib/credit";

/**
 * NORDWERK PRECISION GmbH - the fictional sample borrower, and the model's reference case.
 *
 * These figures appear in four places: the landing page's scorecard preview, the
 * "Fill with sample data" button on the application form, the engine's test suite, and the
 * project README. This file is the one place they are written down, so those four can
 * never disagree.
 *
 * The expected result is 78/100, Moderate, with no critical flag. A test asserts every
 * individual factor score as well as the total, so a change to any threshold in the
 * scorecard fails loudly here rather than quietly re-grading the example on the home page.
 *
 * The company, its accounts and its loan request are entirely invented.
 */

export const NORDWERK_PROFILE = {
  company: "Nordwerk Precision GmbH",
  industry: "Manufacturing",
  yearsInBusiness: 12,
  loanAmountEur: 600_000,
  loanTermMonths: 60,
};

/**
 * Exactly the figures the application form collects - no more.
 *
 * Total liabilities and shareholders' equity are REPORTED here, as the form now asks for
 * them, rather than being worked out from debt and current liabilities. For this company
 * the two happen to agree (1.2M debt + 0.9M current liabilities = 2.1M), but that is a
 * property of Nordwerk's simple balance sheet, not a rule: a business with provisions,
 * deferred tax or lease obligations would have more total liabilities than that sum, and the
 * derived figure would have overstated its equity.
 *
 * The balance sheet balances exactly: 2.1M + 1.4M = 3.5M in total assets.
 */
export const NORDWERK_INPUT: CreditInput = {
  loanAmountEur: 600_000,

  revenueEur: 4_200_000,
  revenuePriorYearEur: 3_900_000,
  ebitdaEur: 630_000,
  netIncomeEur: 260_000,
  interestExpenseEur: 70_000,

  existingDebtEur: 1_200_000,
  totalAssetsEur: 3_500_000,
  currentAssetsEur: 1_400_000,
  // Cash sits INSIDE current assets: 500k of the 1.4M is cash, the rest stock and
  // receivables. It is reported for the data-quality check and is never scored, so adding
  // it leaves the 78/100 result untouched.
  cashEur: 500_000,
  currentLiabilitiesEur: 900_000,
  totalLiabilitiesEur: 2_100_000,
  equityEur: 1_400_000,

  yearsInBusiness: 12,
};

/**
 * The assessment itself, calculated once at module load.
 *
 * The engine is pure, so this is a constant in every sense that matters: it cannot vary
 * between renders, between requests or between the server and the browser.
 */
export const NORDWERK_ASSESSMENT = assess(NORDWERK_INPUT);
