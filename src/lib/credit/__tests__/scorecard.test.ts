import { describe, expect, it } from "vitest";
import { MAX_SCORE, SCORECARD } from "@/lib/credit";
import { assessWith, pointsFor } from "./helpers";

/**
 * EVERY SCORING BOUNDARY.
 *
 * Each band edge is tested twice: once exactly ON the boundary, and once just past it. The
 * pair is what actually pins the rule down - a test only on the boundary would still pass
 * if the comparison were flipped from >= to >.
 *
 * The convention, set in scorecard.ts, is that bounds are INCLUSIVE in the direction that
 * favours the applicant: for a lower-is-better ratio, exactly 2.5x scores the 1.5-2.5x band.
 */

describe("the scorecard adds up", () => {
  it("has a maximum of exactly 100 points", () => {
    expect(MAX_SCORE).toBe(100);
  });

  it("has eight factors, each with a positive weight", () => {
    expect(SCORECARD).toHaveLength(8);
    for (const factor of SCORECARD) expect(factor.maxPoints).toBeGreaterThan(0);
  });

  it("gives every factor a final band that catches any value", () => {
    for (const factor of SCORECARD) {
      const last = factor.bands[factor.bands.length - 1];
      expect(last.bound).toBe(factor.direction === "higher-is-better" ? -Infinity : Infinity);
    }
  });

  it("orders every factor's bands from most points to fewest", () => {
    for (const factor of SCORECARD) {
      const points = factor.bands.map((b) => b.points);
      expect(points).toEqual([...points].sort((a, b) => b - a));
    }
  });

  it("never awards a band more than the factor's maximum", () => {
    for (const factor of SCORECARD) {
      for (const band of factor.bands) expect(band.points).toBeLessThanOrEqual(factor.maxPoints);
    }
  });
});

// =======================================================================================
// 1. LEVERAGE - pro-forma Debt/EBITDA, 25 points, lower is better.
// Ratio is set by fixing EBITDA at 100k and choosing debt + loan.
// =======================================================================================
describe("leverage bands (25 points)", () => {
  const atLeverage = (target: number) =>
    pointsFor(
      assessWith({ ebitdaEur: 100_000, existingDebtEur: target * 100_000 - 10_000, loanAmountEur: 10_000 }),
      "proFormaLeverage",
    );

  it.each([
    [0.5, 25],
    [1.5, 25], // on the boundary
    [1.5001, 20], // just past it
    [2.5, 20],
    [2.5001, 14],
    [3.5, 14],
    [3.5001, 8],
    [4.5, 8],
    [4.5001, 3],
    [6.0, 3],
    [6.0001, 0],
    [12, 0],
  ])("%sx scores %i", (leverage, points) => {
    expect(atLeverage(leverage)).toBe(points);
  });
});

// =======================================================================================
// 2. CURRENT INTEREST COVERAGE - 20 points, higher is better.
// =======================================================================================
describe("interest coverage bands (20 points)", () => {
  const atCoverage = (target: number) =>
    pointsFor(assessWith({ ebitdaEur: target * 10_000, interestExpenseEur: 10_000 }), "interestCoverage");

  it.each([
    [20, 20],
    [8, 20],
    [7.9999, 16],
    [5, 16],
    [4.9999, 11],
    [3, 11],
    [2.9999, 6],
    [2, 6],
    [1.9999, 2],
    [1.5, 2],
    [1.4999, 0],
    [0.5, 0],
  ])("%sx scores %i", (coverage, points) => {
    expect(atCoverage(coverage)).toBe(points);
  });
});

// =======================================================================================
// 3. LIQUIDITY - current ratio, 15 points, higher is better.
// =======================================================================================
describe("liquidity bands (15 points)", () => {
  const atRatio = (target: number) =>
    pointsFor(assessWith({ currentAssetsEur: target * 100_000, currentLiabilitiesEur: 100_000 }), "currentRatio");

  it.each([
    [3.0, 15],
    [2.0, 15],
    [1.9999, 12],
    [1.5, 12],
    [1.4999, 8],
    [1.2, 8],
    [1.1999, 4],
    [1.0, 4],
    [0.9999, 0],
    [0.5, 0],
  ])("a current ratio of %s scores %i", (ratio, points) => {
    expect(atRatio(ratio)).toBe(points);
  });
});

// =======================================================================================
// 4. PROFITABILITY - net margin, 15 points, higher is better.
// =======================================================================================
describe("profitability bands (15 points)", () => {
  const atMargin = (target: number) =>
    pointsFor(assessWith({ netIncomeEur: target * 1_000_000, revenueEur: 1_000_000 }), "netProfitMargin");

  it.each([
    [0.25, 15],
    [0.1, 15],
    [0.0999, 11],
    [0.05, 11],
    [0.0499, 7],
    [0.02, 7],
    [0.0199, 3],
    [0, 3], // breaking even still earns the bottom positive band
    [-0.0001, 0],
    [-0.2, 0],
  ])("a net margin of %s scores %i", (margin, points) => {
    expect(atMargin(margin)).toBe(points);
  });
});

// =======================================================================================
// 5. CAPITAL STRUCTURE - debt / total assets, 10 points, lower is better.
// =======================================================================================
describe("capital structure bands (10 points)", () => {
  const atDebtRatio = (target: number) =>
    pointsFor(assessWith({ existingDebtEur: target * 1_000_000, totalAssetsEur: 1_000_000 }), "debtToAssets");

  it.each([
    [0.05, 10],
    [0.2, 10],
    [0.2001, 8],
    [0.35, 8],
    [0.3501, 5],
    [0.5, 5],
    [0.5001, 2],
    [0.65, 2],
    [0.6501, 0],
    [1.2, 0],
  ])("debt at %s of assets scores %i", (ratio, points) => {
    expect(atDebtRatio(ratio)).toBe(points);
  });
});

// =======================================================================================
// 6. TRACK RECORD - years in business, 5 points, higher is better.
// =======================================================================================
describe("track record bands (5 points)", () => {
  const atYears = (years: number) => pointsFor(assessWith({ yearsInBusiness: years }), "yearsInBusiness");

  it.each([
    [40, 5],
    [10, 5],
    [9, 4],
    [5, 4],
    [4, 3],
    [3, 3],
    [2, 1],
    [1, 1],
    [0, 0],
  ])("%s years scores %i", (years, points) => {
    expect(atYears(years)).toBe(points);
  });
});

// =======================================================================================
// 7. REVENUE TREND - growth, 5 points, higher is better.
// =======================================================================================
describe("revenue trend bands (5 points)", () => {
  const atGrowth = (target: number) =>
    pointsFor(
      assessWith({ revenueEur: 1_000_000 * (1 + target), revenuePriorYearEur: 1_000_000 }),
      "revenueGrowth",
    );

  it.each([
    [0.5, 5],
    [0.1, 5],
    [0.0999, 4],
    [0, 4],
    [-0.0001, 2],
    [-0.05, 2], // exactly −5%: only lands here because of the boundary tolerance
    [-0.0501, 1],
    [-0.15, 1],
    [-0.1501, 0],
    [-0.5, 0],
  ])("growth of %s scores %i", (growth, points) => {
    expect(atGrowth(growth)).toBe(points);
  });
});

// =======================================================================================
// 8. LOAN SIZE - loan / revenue, 5 points, lower is better.
// =======================================================================================
describe("loan size bands (5 points)", () => {
  const atLoanRatio = (target: number) =>
    pointsFor(assessWith({ loanAmountEur: target * 1_000_000, revenueEur: 1_000_000 }), "loanToRevenue");

  it.each([
    [0.02, 5],
    [0.1, 5],
    [0.1001, 4],
    [0.2, 4],
    [0.2001, 2],
    [0.35, 2],
    [0.3501, 1],
    [0.5, 1],
    [0.5001, 0],
    [2, 0],
  ])("a loan at %s of revenue scores %i", (ratio, points) => {
    expect(atLoanRatio(ratio)).toBe(points);
  });
});

describe("the healthy reference borrower", () => {
  it("scores 99 of 100 and is graded Low", () => {
    const result = assessWith({});
    expect(result.score).toBe(99); // only revenue trend is short, at 4/5 for flat revenue
    expect(result.grade.id).toBe("low");
    expect(result.criticalFlags).toEqual([]);
  });
});
