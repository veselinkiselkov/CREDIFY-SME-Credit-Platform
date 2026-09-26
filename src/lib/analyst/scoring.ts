import { assess, type CreditAssessment, type CreditInput } from "@/lib/credit";
import type { ApplicationRecord } from "@/lib/applications/repository";

/**
 * TURNING A STORED APPLICATION INTO AN ASSESSMENT.
 *
 * This is the only bridge between the database and the credit engine, and it is a pure
 * function: a row in, an assessment out. The analyst screens never calculate a ratio, a
 * score or a grade themselves - they render what the Day 3 engine returns. That is what
 * keeps one model behind the landing page, the analyst dashboard and the test suite.
 *
 * Its other job is to refuse. A row that is missing a figure the engine needs is NOT
 * scored: it comes back marked incomplete, naming what is missing. Nothing is derived,
 * defaulted to zero or guessed at, because a plausible-looking score built on absent data
 * is far more dangerous to an analyst than an obvious gap.
 */

export interface MissingInput {
  /** The application-form field, so the analyst can ask for exactly the right thing. */
  field: string;
  label: string;
}

export type ApplicationScoring =
  | { status: "scored"; input: CreditInput; assessment: CreditAssessment }
  | { status: "incomplete"; missing: MissingInput[] };

/**
 * The figures the engine cannot do without.
 *
 * `revenuePriorYearEur` is absent from this list on purpose: the engine has a defined
 * answer for a missing prior year (the revenue-trend factor scores a neutral 2 of 5), so a
 * row without it is still perfectly scoreable.
 *
 * `totalLiabilitiesEur` and `equityEur` are the two that make legacy rows incomplete. They
 * were added after the table already held applications, so older rows have NULL. Deriving
 * equity from the other columns is exactly what the Day 3 correction removed, and doing it
 * here to paper over a gap would reintroduce the same overstatement.
 */
const REQUIRED_FIGURES: { key: keyof ApplicationRecord; field: string; label: string }[] = [
  { key: "loanAmountEur", field: "loanAmountEur", label: "Requested loan amount" },
  { key: "revenueEur", field: "revenueEur", label: "Revenue" },
  { key: "ebitdaEur", field: "ebitdaEur", label: "EBITDA" },
  { key: "netIncomeEur", field: "netIncomeEur", label: "Net income" },
  { key: "interestExpenseEur", field: "interestExpenseEur", label: "Interest expense" },
  { key: "existingDebtEur", field: "existingDebtEur", label: "Existing debt" },
  { key: "totalAssetsEur", field: "totalAssetsEur", label: "Total assets" },
  { key: "currentAssetsEur", field: "currentAssetsEur", label: "Current assets" },
  { key: "currentLiabilitiesEur", field: "currentLiabilitiesEur", label: "Current liabilities" },
  { key: "totalLiabilitiesEur", field: "totalLiabilitiesEur", label: "Total liabilities" },
  { key: "equityEur", field: "equityEur", label: "Shareholders' equity" },
];

/** Which required figures a row is missing. Empty means the row can be scored. */
export function findMissingInputs(record: ApplicationRecord): MissingInput[] {
  const missing = REQUIRED_FIGURES.filter(({ key }) => typeof record[key] !== "number").map(
    ({ field, label }) => ({ field, label }),
  );

  // Trading history drives a scored factor, so an unusable founding year is a gap too.
  if (!Number.isFinite(record.yearFounded) || record.yearFounded <= 0) {
    missing.push({ field: "yearFounded", label: "Year founded" });
  }

  return missing;
}

/**
 * Years in business, as the scorecard's track-record factor measures it.
 *
 * Derived from the founding year at the moment the assessment runs, which is the one place
 * the engine's determinism is bounded: the same application scores one point differently
 * once a company crosses a band boundary. That is correct behaviour - the company really
 * has been trading longer - but it is worth knowing that this single input moves with the
 * calendar, which is why it is computed here rather than inside the engine.
 */
export function yearsInBusiness(yearFounded: number, now: Date = new Date()): number {
  return Math.max(0, now.getUTCFullYear() - yearFounded);
}

/** Builds the engine's input from a stored row, or reports what is missing. */
export function scoreApplication(record: ApplicationRecord, now: Date = new Date()): ApplicationScoring {
  const missing = findMissingInputs(record);
  if (missing.length > 0) return { status: "incomplete", missing };

  const input: CreditInput = {
    loanAmountEur: record.loanAmountEur as number,
    revenueEur: record.revenueEur as number,
    revenuePriorYearEur: record.revenuePriorYearEur,
    ebitdaEur: record.ebitdaEur as number,
    netIncomeEur: record.netIncomeEur as number,
    interestExpenseEur: record.interestExpenseEur as number,
    existingDebtEur: record.existingDebtEur as number,
    totalAssetsEur: record.totalAssetsEur as number,
    currentAssetsEur: record.currentAssetsEur as number,
    currentLiabilitiesEur: record.currentLiabilitiesEur as number,
    totalLiabilitiesEur: record.totalLiabilitiesEur as number,
    equityEur: record.equityEur as number,
    yearsInBusiness: yearsInBusiness(record.yearFounded, now),
    // Cash is not collected by the application form, so it is not passed. The engine's
    // "cash exceeds current assets" check simply does not run, which is the honest outcome:
    // a figure that was never asked for must not be invented to satisfy a check.
  };

  return { status: "scored", input, assessment: assess(input) };
}
