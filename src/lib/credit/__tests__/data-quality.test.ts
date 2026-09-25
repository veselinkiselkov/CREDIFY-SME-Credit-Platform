import { describe, expect, it } from "vitest";
import { assessWith, hasWarning } from "./helpers";

/**
 * DATA-QUALITY CHECKS.
 *
 * The point of every test in this file is the same: a warning must appear, and the score
 * must not move. Credit risk and data quality are separate channels, and the tests hold
 * that line.
 */

describe("balance-sheet identity (assets = liabilities + equity)", () => {
  it("passes silently when the balance sheet balances", () => {
    // 1.0M assets = 0.3M liabilities + 0.7M equity
    const result = assessWith({ totalAssetsEur: 1_000_000, totalLiabilitiesEur: 300_000, equityEur: 700_000 });
    expect(hasWarning(result, "balance-sheet-mismatch")).toBe(false);
  });

  it("tolerates a gap of 2% or less, which is rounding rather than error", () => {
    // 1.0M assets against 0.3M + 0.681M = 0.981M, a 1.9% gap.
    const result = assessWith({ totalAssetsEur: 1_000_000, totalLiabilitiesEur: 300_000, equityEur: 681_000 });
    expect(hasWarning(result, "balance-sheet-mismatch")).toBe(false);
  });

  it("warns when the gap exceeds 2%", () => {
    // 1.0M assets against 0.3M + 0.6M = 0.9M, a 10% gap.
    const result = assessWith({ totalAssetsEur: 1_000_000, totalLiabilitiesEur: 300_000, equityEur: 600_000 });
    expect(hasWarning(result, "balance-sheet-mismatch")).toBe(true);
  });

  it("does not run the check at all when total liabilities were not supplied", () => {
    // The Day 2 form does not collect them, so there is nothing to compare against and the
    // engine says nothing rather than inventing a figure.
    expect(hasWarning(assessWith({}), "balance-sheet-mismatch")).toBe(false);
  });

  it("with derived equity, still catches liabilities the application never asked about", () => {
    // Derived equity = 1.0M − 0.1M debt − 0.2M current liabilities = 0.7M.
    // Reported total liabilities of 0.6M implies assets of 1.3M, a 30% gap: there are
    // 0.3M of liabilities the form has no field for.
    const result = assessWith({ totalLiabilitiesEur: 600_000 });
    expect(hasWarning(result, "balance-sheet-mismatch")).toBe(true);
    const warning = result.dataQualityWarnings.find((w) => w.id === "balance-sheet-mismatch");
    expect(warning?.detail).toContain("derived");
  });
});

describe("the other four checks", () => {
  it("warns when cash exceeds current assets", () => {
    expect(hasWarning(assessWith({ cashEur: 500_000, currentAssetsEur: 400_000 }), "cash-exceeds-current-assets")).toBe(true);
  });

  it("does not warn when cash sits inside current assets", () => {
    expect(hasWarning(assessWith({ cashEur: 100_000 }), "cash-exceeds-current-assets")).toBe(false);
  });

  it("does not run the cash check when cash was not supplied", () => {
    expect(hasWarning(assessWith({}), "cash-exceeds-current-assets")).toBe(false);
  });

  it("warns when current assets exceed total assets", () => {
    const result = assessWith({ currentAssetsEur: 1_500_000, totalAssetsEur: 1_000_000 });
    expect(hasWarning(result, "current-assets-exceed-total-assets")).toBe(true);
  });

  it("warns when net income exceeds EBITDA", () => {
    const result = assessWith({ netIncomeEur: 300_000, ebitdaEur: 200_000 });
    expect(hasWarning(result, "net-income-exceeds-ebitda")).toBe(true);
  });

  it("does not warn when net income sits below EBITDA, as it normally does", () => {
    expect(hasWarning(assessWith({}), "net-income-exceeds-ebitda")).toBe(false);
  });

  it("warns when debt is reported with no interest expense", () => {
    const result = assessWith({ existingDebtEur: 400_000, interestExpenseEur: 0 });
    expect(hasWarning(result, "debt-without-interest-expense")).toBe(true);
  });

  it("does not warn when there is neither debt nor interest", () => {
    const result = assessWith({ existingDebtEur: 0, interestExpenseEur: 0 });
    expect(hasWarning(result, "debt-without-interest-expense")).toBe(false);
  });

  it("reports a healthy borrower with no warnings at all", () => {
    expect(assessWith({}).dataQualityWarnings).toEqual([]);
  });
});

describe("data quality is kept out of the score", () => {
  it("a balance-sheet mismatch does not change a single point", () => {
    const clean = assessWith({});
    const mismatched = assessWith({ totalLiabilitiesEur: 10_000, equityEur: 700_000 });

    expect(mismatched.dataQualityWarnings.length).toBeGreaterThan(0);
    expect(mismatched.score).toBe(clean.score);
    expect(mismatched.grade.id).toBe(clean.grade.id);
    expect(mismatched.factors.map((f) => f.points)).toEqual(clean.factors.map((f) => f.points));
  });

  it("net income above EBITDA warns without altering the profitability score", () => {
    const result = assessWith({ netIncomeEur: 300_000 });
    expect(hasWarning(result, "net-income-exceeds-ebitda")).toBe(true);
    // 300k / 1M = 30% margin, which is still the top band on its own merits.
    expect(result.factors.find((f) => f.id === "netProfitMargin")?.points).toBe(15);
  });

  it("a warning never becomes a critical flag", () => {
    const result = assessWith({ netIncomeEur: 300_000, cashEur: 900_000, totalLiabilitiesEur: 5 });
    expect(result.dataQualityWarnings.length).toBeGreaterThan(0);
    expect(result.criticalFlags).toEqual([]);
    expect(result.gradeCapped).toBe(false);
  });

  it("every warning carries a label and a detail an analyst can act on", () => {
    const result = assessWith({
      netIncomeEur: 300_000,
      cashEur: 900_000,
      currentAssetsEur: 400_000,
      existingDebtEur: 400_000,
      interestExpenseEur: 0,
    });
    expect(result.dataQualityWarnings.length).toBeGreaterThanOrEqual(3);
    for (const warning of result.dataQualityWarnings) {
      expect(warning.label.length).toBeGreaterThan(0);
      expect(warning.detail.length).toBeGreaterThan(0);
      expect(warning.detail).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
