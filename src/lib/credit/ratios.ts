import type { CreditInput, DisplayRatioId, RatioId, RatioResult, ScoredRatioId } from "./types";

/**
 * RATIO CALCULATION.
 *
 * Every ratio in the model is computed here, and every division goes through `divide()`.
 * Nothing in this file can return NaN or Infinity: a division that cannot be performed
 * comes back as null with a named reason attached, and that reason travels with the result
 * all the way to the screen.
 *
 * This matters more than it looks. In JavaScript, `0/0` is NaN and every comparison against
 * NaN is false - so a NaN reaching the scorer would fail every threshold test and silently
 * drop into the worst band. A company would be marked down because of a missing figure,
 * with nothing in the output to say so. Guarding here makes that impossible.
 */

// =======================================================================================
// Formatting
// =======================================================================================

/** "2.86×". Multiples are shown to the precision the analyst actually reads them at. */
const multiple = (value: number, decimals = 2) => `${value.toFixed(decimals)}×`;

/** "6.2%". */
const percent = (value: number, decimals = 1) => `${(value * 100).toFixed(decimals)}%`;

/** "+7.7%" / "−3.2%". The sign is the whole point of a growth figure, so it is always shown. */
const signedPercent = (value: number, decimals = 1) => {
  const formatted = (Math.abs(value) * 100).toFixed(decimals);
  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `−${formatted}%`;
  return `${formatted}%`;
};

/** "1.56". Used for the current ratio, which is conventionally written without a unit. */
const plain = (value: number, decimals = 2) => value.toFixed(decimals);

/** Shown wherever a ratio exists but carries no meaning. Standard credit-analysis shorthand. */
export const NOT_MEANINGFUL = "n/m";

// =======================================================================================
// Safe arithmetic
// =======================================================================================

/**
 * The only division in the engine.
 *
 * Returns null rather than Infinity or NaN when the denominator is zero, or when either
 * side is not a finite number (which catches a corrupt row from the database as well as a
 * programming mistake here).
 */
function divide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

// =======================================================================================
// Result builders
// =======================================================================================

function ok(id: RatioId, label: string, value: number, display: string): RatioResult {
  return { id, label, value, display, status: "ok" };
}

function notMeaningful(id: RatioId, label: string, note: string): RatioResult {
  return { id, label, value: null, display: NOT_MEANINGFUL, status: "not-meaningful", note };
}

function notProvided(id: RatioId, label: string, note: string): RatioResult {
  return { id, label, value: null, display: "Not provided", status: "not-provided", note };
}

// =======================================================================================
// Equity
// =======================================================================================

/**
 * Shareholders' equity, taken straight from what the applicant reported.
 *
 * There is deliberately no calculation here. An earlier version derived equity as
 * `total assets − interest-bearing debt − current liabilities`, which is wrong in both
 * directions: interest-bearing debt overlaps with current liabilities (the current portion
 * of a term loan sits in both), and current liabilities exclude long-term non-debt items
 * such as provisions, deferred tax and lease obligations. The net effect usually OVERSTATES
 * equity - the dangerous direction, because it makes the negative-equity critical flag fire
 * less often than it should. The form now asks for the figure instead.
 */

// =======================================================================================
// Scored ratios
// =======================================================================================

export function calculateScoredRatios(input: CreditInput): Record<ScoredRatioId, RatioResult> {
  return {
    /**
     * PRO-FORMA LEVERAGE: (existing debt + requested loan) / EBITDA.
     * Deliberately includes the money being asked for - see scorecard.ts.
     */
    proFormaLeverage: (() => {
      const id = "proFormaLeverage" as const;
      const label = "Leverage after the loan";
      // EBITDA of zero or less is guarded before dividing, not after: at exactly zero the
      // division is undefined, and below zero the ratio would come out NEGATIVE, which sorts
      // as "excellent" against a lower-is-better scale. A loss-making business would score
      // full marks on the model's heaviest factor.
      if (input.ebitdaEur <= 0) {
        return notMeaningful(id, label, "EBITDA is zero or negative, so leverage cannot be measured.");
      }
      const value = divide(input.existingDebtEur + input.loanAmountEur, input.ebitdaEur);
      return value === null
        ? notMeaningful(id, label, "Leverage could not be calculated.")
        : ok(id, label, value, multiple(value));
    })(),

    /** CURRENT INTEREST COVERAGE: EBITDA / current interest expense. Not a DSCR. */
    interestCoverage: (() => {
      const id = "interestCoverage" as const;
      const label = "Current interest coverage";
      if (input.interestExpenseEur === 0) {
        // No debt and no interest is the genuinely best case.
        if (input.existingDebtEur === 0) {
          return {
            id,
            label,
            value: null,
            display: "No debt",
            status: "no-debt",
            note: "No interest-bearing debt and no interest expense.",
          };
        }
        // Debt outstanding but no interest reported.
        //
        // This is scored on the figures AS REPORTED - they show no interest burden, so the
        // factor scores full marks - and a data-quality warning asks the analyst to confirm
        // the debt really is interest-free. Docking 20 points here would be scoring a
        // suspected data-entry error as though it were credit risk, which is precisely the
        // mixing of concerns the engine keeps apart everywhere else. The analyst gets both
        // the score and the doubt, and can act on either.
        return {
          id,
          label,
          value: null,
          display: "No reported interest expense",
          status: "no-interest-reported",
          note:
            "Debt is outstanding but the reported interest expense is zero. Scored on the " +
            "figures as given; the figure needs confirming.",
        };
      }
      const value = divide(input.ebitdaEur, input.interestExpenseEur);
      return value === null
        ? notMeaningful(id, label, "Interest coverage could not be calculated.")
        : ok(id, label, value, multiple(value, 1));
    })(),

    /** LIQUIDITY: current assets / current liabilities. */
    currentRatio: (() => {
      const id = "currentRatio" as const;
      const label = "Liquidity";
      // Nothing due within the year means there is no denominator - and, on the figures as
      // reported, no short-term obligation to be unable to meet. That is the best possible
      // liquidity position, not the worst, so it scores full marks rather than zero. A
      // literal zero is unusual enough to be worth checking, so it also raises a
      // data-quality warning; the doubt belongs there, not in the score.
      if (input.currentLiabilitiesEur === 0) {
        return {
          id,
          label,
          value: null,
          display: "No current liabilities",
          status: "no-current-liabilities",
          note: "Nothing reported as falling due within twelve months.",
        };
      }
      const value = divide(input.currentAssetsEur, input.currentLiabilitiesEur);
      return value === null
        ? notMeaningful(id, label, "The current ratio could not be calculated.")
        : ok(id, label, value, plain(value));
    })(),

    /** PROFITABILITY: net income / revenue. */
    netProfitMargin: (() => {
      const id = "netProfitMargin" as const;
      const label = "Profitability";
      const value = divide(input.netIncomeEur, input.revenueEur);
      return value === null
        ? notMeaningful(id, label, "No revenue reported, so a margin cannot be calculated.")
        : ok(id, label, value, percent(value));
    })(),

    /** CAPITAL STRUCTURE: existing debt / total assets. The loan is not included here. */
    debtToAssets: (() => {
      const id = "debtToAssets" as const;
      const label = "Capital structure";
      const value = divide(input.existingDebtEur, input.totalAssetsEur);
      return value === null
        ? notMeaningful(id, label, "No total assets reported.")
        : ok(id, label, value, percent(value));
    })(),

    /** TRACK RECORD: years in business. Not a ratio, but scored on the same machinery. */
    yearsInBusiness: (() => {
      const id = "yearsInBusiness" as const;
      const label = "Track record";
      const years = input.yearsInBusiness;
      return Number.isFinite(years)
        ? ok(id, label, years, `${Math.round(years)} yrs`)
        : notProvided(id, label, "Years in business was not provided.");
    })(),

    /** REVENUE TREND: revenue / prior-year revenue − 1. */
    revenueGrowth: (() => {
      const id = "revenueGrowth" as const;
      const label = "Revenue trend";
      const prior = input.revenuePriorYearEur;
      if (prior === null || prior === undefined) {
        return notProvided(id, label, "No prior-year revenue was provided.");
      }
      const ratio = divide(input.revenueEur, prior);
      // A prior year of zero would make growth infinite. Any first year of trading is
      // already covered by the track-record factor, so nothing is lost by declining to
      // score it here.
      return ratio === null
        ? notMeaningful(id, label, "Prior-year revenue is zero, so growth cannot be calculated.")
        : ok(id, label, ratio - 1, signedPercent(ratio - 1));
    })(),

    /** LOAN SIZE: requested loan / revenue. */
    loanToRevenue: (() => {
      const id = "loanToRevenue" as const;
      const label = "Loan size";
      const value = divide(input.loanAmountEur, input.revenueEur);
      return value === null
        ? notMeaningful(id, label, "No revenue reported.")
        : ok(id, label, value, percent(value));
    })(),
  };
}

// =======================================================================================
// Display-only ratios
// =======================================================================================

/**
 * Shown to the analyst, deliberately NOT scored.
 *
 * WHY ROA AND ROE ARE NOT SCORED
 * Net profit margin already carries 15 points for profitability. Return on assets and
 * return on equity are built from the same net income figure, just divided by a different
 * denominator, so scoring them would count one year's profit three times and quietly turn a
 * 15-point profitability weight into something closer to 35. A single good or bad year would
 * then swing the grade far more than the model intends.
 *
 * Return on equity is worse still: its denominator is the smallest number on the balance
 * sheet, so it explodes as equity approaches zero, and a nearly insolvent company can post a
 * spectacular ROE. That is the opposite of what a lender wants a score to do. Both remain
 * genuinely useful for an analyst to read, which is why they are calculated and displayed.
 *
 * CURRENT DEBT/EBITDA is shown beside the pro-forma figure so the analyst can see what the
 * requested loan actually changes. Only the pro-forma version is scored.
 */
export function calculateDisplayRatios(input: CreditInput): Record<DisplayRatioId, RatioResult> {
  return {
    currentLeverage: (() => {
      const id = "currentLeverage" as const;
      const label = "Leverage today";
      if (input.ebitdaEur <= 0) {
        return notMeaningful(id, label, "EBITDA is zero or negative.");
      }
      const value = divide(input.existingDebtEur, input.ebitdaEur);
      return value === null ? notMeaningful(id, label, "Not calculable.") : ok(id, label, value, multiple(value));
    })(),

    returnOnAssets: (() => {
      const id = "returnOnAssets" as const;
      const label = "Return on assets";
      const value = divide(input.netIncomeEur, input.totalAssetsEur);
      return value === null ? notMeaningful(id, label, "No total assets reported.") : ok(id, label, value, percent(value));
    })(),

    returnOnEquity: (() => {
      const id = "returnOnEquity" as const;
      const label = "Return on equity";
      // Negative or zero equity makes ROE meaningless: dividing a profit by a negative
      // equity base produces a negative percentage that looks like a loss, and dividing by
      // a near-zero base produces a spectacular number for a nearly insolvent business.
      if (input.equityEur <= 0) {
        return notMeaningful(id, label, "Equity is zero or negative, so return on equity carries no meaning.");
      }
      const value = divide(input.netIncomeEur, input.equityEur);
      return value === null ? notMeaningful(id, label, "Not calculable.") : ok(id, label, value, percent(value));
    })(),

    ebitdaMargin: (() => {
      const id = "ebitdaMargin" as const;
      const label = "EBITDA margin";
      const value = divide(input.ebitdaEur, input.revenueEur);
      return value === null ? notMeaningful(id, label, "No revenue reported.") : ok(id, label, value, percent(value));
    })(),
  };
}
