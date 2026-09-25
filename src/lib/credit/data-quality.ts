import { formatEur } from "@/lib/format";
import type { CreditInput, DataQualityWarning, EquityBasis } from "./types";

/**
 * DATA-QUALITY CHECKS.
 *
 * These ask "do these figures hang together?", not "is this a good credit?". They never
 * touch the score, and that separation is deliberate.
 *
 * Mixing the two would make the model dishonest in both directions. A company whose
 * balance sheet does not balance is not necessarily a bad credit - far more often a figure
 * was typed into the wrong box - so docking points would be punishing a typo as though it
 * were a solvency problem. And silently scoring figures that plainly contradict each other
 * would hand the analyst a confident-looking number built on input nobody trusts.
 *
 * So the engine does the only useful thing: it scores what it was given, and tells the
 * analyst exactly which figures look wrong, so they can go back and ask.
 *
 * Checks that need a field the Day 2 form does not collect simply do not run. They report
 * nothing rather than guessing, and start working the moment the field is supplied.
 */

/** How far assets may drift from liabilities + equity before it is worth mentioning. */
const BALANCE_SHEET_TOLERANCE = 0.02;

export function checkDataQuality(input: CreditInput, equity: EquityBasis): DataQualityWarning[] {
  const warnings: DataQualityWarning[] = [];

  // -------------------------------------------------------------------------------------
  // 1. The balance sheet should balance: assets = liabilities + equity.
  //
  // Only runs when total liabilities were supplied. With equity derived rather than
  // reported, this compares the reported total liabilities against debt plus current
  // liabilities, which usefully catches liabilities the application never asked about.
  // -------------------------------------------------------------------------------------
  const totalLiabilities = input.totalLiabilitiesEur;
  if (typeof totalLiabilities === "number" && Number.isFinite(totalLiabilities) && input.totalAssetsEur > 0) {
    const impliedAssets = totalLiabilities + equity.valueEur;
    const difference = Math.abs(input.totalAssetsEur - impliedAssets);
    const relative = difference / input.totalAssetsEur;
    if (relative > BALANCE_SHEET_TOLERANCE) {
      warnings.push({
        id: "balance-sheet-mismatch",
        label: "Balance sheet does not balance",
        detail:
          `Total assets of ${formatEur(input.totalAssetsEur)} differ by ${(relative * 100).toFixed(1)}% from ` +
          `liabilities plus equity (${formatEur(impliedAssets)}).` +
          (equity.derived ? " Equity here is derived, not reported, so the gap may be liabilities not asked for." : ""),
      });
    }
  }

  // -------------------------------------------------------------------------------------
  // 2. Cash is part of current assets, so it cannot exceed them.
  // -------------------------------------------------------------------------------------
  const cash = input.cashEur;
  if (typeof cash === "number" && Number.isFinite(cash) && cash > input.currentAssetsEur) {
    warnings.push({
      id: "cash-exceeds-current-assets",
      label: "Cash exceeds current assets",
      detail:
        `Cash of ${formatEur(cash)} is greater than total current assets of ` +
        `${formatEur(input.currentAssetsEur)}. Cash is a component of current assets.`,
    });
  }

  // -------------------------------------------------------------------------------------
  // 3. Current assets are part of total assets, so they cannot exceed them.
  // The application form already rejects this, but the engine cannot assume its input
  // arrived through that form - a database row, an import or a later API could all bypass it.
  // -------------------------------------------------------------------------------------
  if (input.currentAssetsEur > input.totalAssetsEur) {
    warnings.push({
      id: "current-assets-exceed-total-assets",
      label: "Current assets exceed total assets",
      detail:
        `Current assets of ${formatEur(input.currentAssetsEur)} are greater than total assets of ` +
        `${formatEur(input.totalAssetsEur)}.`,
    });
  }

  // -------------------------------------------------------------------------------------
  // 4. Net income above EBITDA is unusual: interest, tax and depreciation normally reduce
  // EBITDA on the way down to net income. It is not impossible - a one-off disposal gain or
  // a tax credit will do it - so this is a question for the analyst, not an error.
  // -------------------------------------------------------------------------------------
  if (input.netIncomeEur > input.ebitdaEur) {
    warnings.push({
      id: "net-income-exceeds-ebitda",
      label: "Net income is higher than EBITDA",
      detail:
        `Net income of ${formatEur(input.netIncomeEur)} exceeds EBITDA of ${formatEur(input.ebitdaEur)}. ` +
        "This can happen with a one-off gain, but is worth confirming.",
    });
  }

  // -------------------------------------------------------------------------------------
  // 5. Debt with no interest expense.
  //
  // This is also why interest coverage scores zero in that case (see ratios.ts): the engine
  // will not award its second-heaviest factor full marks on a figure it is simultaneously
  // flagging as doubtful.
  // -------------------------------------------------------------------------------------
  if (input.existingDebtEur > 0 && input.interestExpenseEur === 0) {
    warnings.push({
      id: "debt-without-interest-expense",
      label: "Debt reported with no interest expense",
      detail:
        `${formatEur(input.existingDebtEur)} of interest-bearing debt is reported, but interest expense is zero. ` +
        "Interest coverage cannot be calculated and scores zero until the figure is confirmed.",
    });
  }

  return warnings;
}
