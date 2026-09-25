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
 * Exactly the figures the Day 2 application form collects - no more.
 *
 * The optional balance-sheet fields (equity, total liabilities, cash) are deliberately left
 * out, because the form does not ask for them. Equity is therefore derived by the engine as
 * 3.5M − 1.2M − 0.9M = 1.4M, which is the figure the real accounts would show. A test in
 * the suite supplies the full balance sheet separately to exercise the checks that need it.
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
  currentLiabilitiesEur: 900_000,

  yearsInBusiness: 12,
};

/**
 * The assessment itself, calculated once at module load.
 *
 * The engine is pure, so this is a constant in every sense that matters: it cannot vary
 * between renders, between requests or between the server and the browser.
 */
export const NORDWERK_ASSESSMENT = assess(NORDWERK_INPUT);
