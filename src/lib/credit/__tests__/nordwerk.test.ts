import { describe, expect, it } from "vitest";
import { assess } from "@/lib/credit";
import { NORDWERK_ASSESSMENT, NORDWERK_INPUT } from "@/lib/sample/nordwerk";
import { NORDWERK_PREVIEW, NORDWERK_SCORE } from "@/lib/sample/nordwerk-preview";
import { SAMPLE_APPLICATION } from "@/lib/applications/sample";
import { parseAmount } from "@/lib/applications/schema";
import { findBadNumbers } from "./helpers";

/**
 * THE REFERENCE CASE.
 *
 * Nordwerk Precision GmbH is the worked example shown on the landing page and filled in by
 * the form's "Fill with sample data" button. It must score exactly 78/100, Moderate, with
 * no critical flag.
 *
 * Every factor is asserted individually, not just the total. A total-only test would pass
 * if two thresholds were changed in opposite directions, which is exactly the kind of
 * mistake this suite exists to catch.
 */
describe("Nordwerk Precision GmbH: the reference case", () => {
  const result = NORDWERK_ASSESSMENT;

  it("scores exactly 78 out of 100", () => {
    expect(result.score).toBe(78);
  });

  it("is graded Moderate", () => {
    expect(result.grade.id).toBe("moderate");
    expect(result.grade.label).toBe("Moderate");
  });

  it("raises no critical flag, so the grade is not capped", () => {
    expect(result.criticalFlags).toEqual([]);
    expect(result.gradeCapped).toBe(false);
    expect(result.uncappedGrade.id).toBe("moderate");
  });

  // Ratio, expected display, expected points, expected maximum.
  const expected = [
    ["proFormaLeverage", "2.86×", 14, 25],
    ["interestCoverage", "9.0×", 20, 20],
    ["currentRatio", "1.56", 12, 15],
    ["netProfitMargin", "6.2%", 11, 15],
    ["debtToAssets", "34.3%", 8, 10],
    ["yearsInBusiness", "12 yrs", 5, 5],
    ["revenueGrowth", "+7.7%", 4, 5],
    ["loanToRevenue", "14.3%", 4, 5],
  ] as const;

  it.each(expected)("%s displays as %s and scores %i of %i", (id, display, points, maxPoints) => {
    const factor = result.factors.find((f) => f.id === id);
    expect(factor, `factor ${id} is missing`).toBeDefined();
    expect(factor!.ratio.display).toBe(display);
    expect(factor!.points).toBe(points);
    expect(factor!.maxPoints).toBe(maxPoints);
  });

  it("the individual factor scores add up to the reported total", () => {
    const summed = result.factors.reduce((total, f) => total + f.points, 0);
    expect(summed).toBe(result.score);
    expect(summed).toBe(expected.reduce((total, [, , points]) => total + points, 0));
  });

  it("derives equity of EUR 1.4M from the reported figures", () => {
    // 3.5M assets − 1.2M debt − 0.9M current liabilities
    expect(result.equity.valueEur).toBe(1_400_000);
    expect(result.equity.derived).toBe(true);
  });

  it("calculates the underlying ratios to the agreed values", () => {
    const value = (id: string) => result.factors.find((f) => f.id === id)?.ratio.value;
    expect(value("proFormaLeverage")).toBeCloseTo(2.857, 3); // (1.2M + 0.6M) / 630k
    expect(value("interestCoverage")).toBeCloseTo(9.0, 6); // 630k / 70k
    expect(value("currentRatio")).toBeCloseTo(1.556, 3); // 1.4M / 0.9M
    expect(value("netProfitMargin")).toBeCloseTo(0.0619, 4); // 260k / 4.2M
    expect(value("debtToAssets")).toBeCloseTo(0.3429, 4); // 1.2M / 3.5M
    expect(value("revenueGrowth")).toBeCloseTo(0.0769, 4); // 4.2M / 3.9M − 1
    expect(value("loanToRevenue")).toBeCloseTo(0.1429, 4); // 600k / 4.2M
  });

  it("shows the four display-only ratios without scoring them", () => {
    const ids = result.displayRatios.map((r) => r.id).sort();
    expect(ids).toEqual(["currentLeverage", "ebitdaMargin", "returnOnAssets", "returnOnEquity"]);
    // None of them appears among the scored factors.
    const scoredIds = result.factors.map((f) => f.id);
    for (const id of ids) expect(scoredIds).not.toContain(id);
  });

  it("produces no NaN or Infinity anywhere in the output", () => {
    expect(findBadNumbers(result)).toEqual([]);
  });

  it("is deterministic: running it again gives an identical result", () => {
    expect(assess(NORDWERK_INPUT)).toEqual(assess(NORDWERK_INPUT));
  });
});

/**
 * The landing page and the form both advertise this borrower. These tests are what stop
 * either of them drifting away from the engine.
 */
describe("Nordwerk stays consistent across the app", () => {
  it("the landing-page preview shows the engine's score, not a hand-typed one", () => {
    expect(NORDWERK_SCORE).toBe(78);
    expect(NORDWERK_SCORE).toBe(NORDWERK_ASSESSMENT.score);
  });

  it("the landing-page preview rows come from the engine's factors", () => {
    expect(NORDWERK_PREVIEW.factors).toHaveLength(8);
    NORDWERK_PREVIEW.factors.forEach((row, index) => {
      const factor = NORDWERK_ASSESSMENT.factors[index];
      expect(row.label).toBe(factor.label);
      expect(row.value).toBe(factor.ratio.display);
      expect(row.points).toBe(factor.points);
      expect(row.maxPoints).toBe(factor.maxPoints);
    });
  });

  it("the 'point to watch' callout shows leverage rising from 1.9x to 2.9x", () => {
    expect(NORDWERK_PREVIEW.leverageBefore).toBe("1.9×");
    expect(NORDWERK_PREVIEW.leverageAfter).toBe("2.9×");
  });

  it("the form's 'Fill with sample data' figures match the engine's input exactly", () => {
    const n = (raw: string) => parseAmount(raw);
    expect(n(SAMPLE_APPLICATION.revenueEur)).toBe(NORDWERK_INPUT.revenueEur);
    expect(n(SAMPLE_APPLICATION.revenuePriorYearEur)).toBe(NORDWERK_INPUT.revenuePriorYearEur);
    expect(n(SAMPLE_APPLICATION.ebitdaEur)).toBe(NORDWERK_INPUT.ebitdaEur);
    expect(n(SAMPLE_APPLICATION.netIncomeEur)).toBe(NORDWERK_INPUT.netIncomeEur);
    expect(n(SAMPLE_APPLICATION.interestExpenseEur)).toBe(NORDWERK_INPUT.interestExpenseEur);
    expect(n(SAMPLE_APPLICATION.existingDebtEur)).toBe(NORDWERK_INPUT.existingDebtEur);
    expect(n(SAMPLE_APPLICATION.totalAssetsEur)).toBe(NORDWERK_INPUT.totalAssetsEur);
    expect(n(SAMPLE_APPLICATION.currentAssetsEur)).toBe(NORDWERK_INPUT.currentAssetsEur);
    expect(n(SAMPLE_APPLICATION.currentLiabilitiesEur)).toBe(NORDWERK_INPUT.currentLiabilitiesEur);
    expect(n(SAMPLE_APPLICATION.loanAmountEur)).toBe(NORDWERK_INPUT.loanAmountEur);

    // The form asks for the founding year; the engine wants a duration. They must agree.
    const yearFounded = n(SAMPLE_APPLICATION.yearFounded)!;
    const yearsInBusiness = new Date().getUTCFullYear() - yearFounded;
    expect(yearsInBusiness).toBe(NORDWERK_INPUT.yearsInBusiness);
  });
});
