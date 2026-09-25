import { describe, expect, it } from "vitest";
import { gradeForScore, RISK_GRADES } from "@/lib/risk-grades";
import { assessWith, hasFlag } from "./helpers";

/**
 * RISK GRADES AND THE CRITICAL-FLAG CAP.
 *
 * The grade thresholds are NOT redefined here. They live in lib/risk-grades.ts, which the
 * landing page has used since Day 1, and the engine reads the same table - so the grade an
 * analyst sees can never disagree with the scale printed next to it.
 */

describe("risk-grade boundaries", () => {
  it.each([
    [100, "low"],
    [80, "low"], // bottom of Low
    [79, "moderate"], // top of Moderate
    [65, "moderate"],
    [64, "elevated"],
    [50, "elevated"],
    [49, "high"],
    [35, "high"],
    [34, "very-high"],
    [0, "very-high"],
  ])("a score of %i is graded %s", (score, expected) => {
    expect(gradeForScore(score).id).toBe(expected);
  });

  it("clamps scores outside 0-100 rather than returning nothing", () => {
    expect(gradeForScore(150).id).toBe("low");
    expect(gradeForScore(-20).id).toBe("very-high");
  });

  it("lists grades from best to worst, which the cap relies on", () => {
    expect(RISK_GRADES.map((g) => g.id)).toEqual(["low", "moderate", "elevated", "high", "very-high"]);
  });
});

/**
 * Each flag is triggered in isolation wherever possible, so a failure names one condition.
 * Negative equity is isolated by supplying `equityEur` directly: deriving it would require
 * loading the balance sheet with debt, which would move three other factors at the same time.
 */
describe("critical flags", () => {
  it("raises a flag when EBITDA is zero", () => {
    expect(hasFlag(assessWith({ ebitdaEur: 0 }), "non-positive-ebitda")).toBe(true);
  });

  it("raises a flag when EBITDA is negative", () => {
    expect(hasFlag(assessWith({ ebitdaEur: -50_000 }), "non-positive-ebitda")).toBe(true);
  });

  it("raises a flag when equity is negative", () => {
    expect(hasFlag(assessWith({ equityEur: -100_000 }), "negative-equity")).toBe(true);
  });

  it("raises a flag when derived equity is negative", () => {
    // 1.0M assets − 0.9M debt − 0.2M current liabilities = −0.1M
    const result = assessWith({ totalAssetsEur: 1_000_000, existingDebtEur: 900_000, currentLiabilitiesEur: 200_000 });
    expect(result.equity.valueEur).toBe(-100_000);
    expect(result.equity.derived).toBe(true);
    expect(hasFlag(result, "negative-equity")).toBe(true);
  });

  it("does not flag equity of exactly zero, which is not negative", () => {
    expect(hasFlag(assessWith({ equityEur: 0 }), "negative-equity")).toBe(false);
  });

  it("raises a flag when interest coverage is below 1.0x", () => {
    // 200k EBITDA against 250k of interest = 0.8x
    expect(hasFlag(assessWith({ interestExpenseEur: 250_000 }), "interest-coverage-below-1")).toBe(true);
  });

  it("does not flag interest coverage of exactly 1.0x", () => {
    expect(hasFlag(assessWith({ interestExpenseEur: 200_000 }), "interest-coverage-below-1")).toBe(false);
  });

  it("raises a flag when the current ratio is below 0.8", () => {
    const result = assessWith({ currentAssetsEur: 100_000, currentLiabilitiesEur: 200_000 });
    expect(hasFlag(result, "current-ratio-below-0-8")).toBe(true);
  });

  it("does not flag a current ratio of exactly 0.8", () => {
    const result = assessWith({ currentAssetsEur: 160_000, currentLiabilitiesEur: 200_000 });
    expect(hasFlag(result, "current-ratio-below-0-8")).toBe(false);
  });

  it("does not raise coverage or liquidity flags from a ratio that could not be calculated", () => {
    // No interest expense and no current liabilities: neither ratio has a value, so neither
    // is evidence of anything. An unmeasurable ratio must not masquerade as a bad one.
    const result = assessWith({ interestExpenseEur: 0, existingDebtEur: 0, currentLiabilitiesEur: 0 });
    expect(hasFlag(result, "interest-coverage-below-1")).toBe(false);
    expect(hasFlag(result, "current-ratio-below-0-8")).toBe(false);
  });

  it("raises no flags for a healthy borrower", () => {
    expect(assessWith({}).criticalFlags).toEqual([]);
  });
});

describe("the grade cap", () => {
  it("holds an otherwise excellent borrower at High", () => {
    // Healthy in every respect except negative equity.
    const result = assessWith({ equityEur: -100_000 });

    expect(result.score).toBe(99); // the score itself is untouched
    expect(result.uncappedGrade.id).toBe("low"); // what 99 points would normally give
    expect(result.grade.id).toBe("high"); // what the analyst is actually shown
    expect(result.gradeCapped).toBe(true);
  });

  it("leaves the score alone, so the analyst can see both numbers", () => {
    const capped = assessWith({ equityEur: -100_000 });
    const clean = assessWith({});
    expect(capped.score).toBe(clean.score);
  });

  it("does not improve a borrower who is already worse than High", () => {
    // Loss-making, illiquid and heavily indebted: several flags, and a very low score.
    const result = assessWith({
      ebitdaEur: -100_000,
      netIncomeEur: -200_000,
      existingDebtEur: 900_000,
      currentAssetsEur: 50_000,
      currentLiabilitiesEur: 400_000,
      yearsInBusiness: 1,
      revenuePriorYearEur: 2_000_000,
      loanAmountEur: 600_000,
    });

    expect(result.criticalFlags.length).toBeGreaterThan(0);
    expect(result.uncappedGrade.id).toBe("very-high");
    expect(result.grade.id).toBe("very-high"); // the cap never makes a grade better
    expect(result.gradeCapped).toBe(false); // and does not claim to have acted
  });

  it("reports no cap when there is no flag", () => {
    const result = assessWith({});
    expect(result.gradeCapped).toBe(false);
    expect(result.grade.id).toBe(result.uncappedGrade.id);
  });

  it("caps at High for every one of the four flags", () => {
    const cases = [
      { ebitdaEur: 0 },
      { equityEur: -1 },
      { interestExpenseEur: 250_000 },
      { currentAssetsEur: 100_000, currentLiabilitiesEur: 200_000 },
    ];
    for (const override of cases) {
      const result = assessWith(override);
      expect(result.criticalFlags.length).toBeGreaterThan(0);
      const gradeIndex = RISK_GRADES.findIndex((g) => g.id === result.grade.id);
      const highIndex = RISK_GRADES.findIndex((g) => g.id === "high");
      // Higher index = worse grade, so the grade must be High or worse.
      expect(gradeIndex).toBeGreaterThanOrEqual(highIndex);
    }
  });
});

/**
 * The single most important behavioural guarantee in the engine: it analyses, it does not
 * decide. A critical flag must never turn into an automatic rejection.
 */
describe("the engine never decides", () => {
  const flagged = assessWith({ ebitdaEur: -100_000 });

  it("returns no approval, rejection or decision field of any kind", () => {
    const forbidden = ["decision", "approved", "rejected", "outcome", "verdict", "recommendation", "autoReject"];
    for (const key of forbidden) expect(flagged).not.toHaveProperty(key);
  });

  it("still produces a full analysis for a flagged borrower rather than stopping", () => {
    expect(flagged.factors).toHaveLength(8);
    expect(flagged.grade).toBeDefined();
    expect(typeof flagged.score).toBe("number");
    expect(flagged.displayRatios.length).toBeGreaterThan(0);
  });

  it("carries the disclaimer that an analyst makes the decision", () => {
    expect(flagged.disclaimer).toContain("a credit analyst reviews every case");
    expect(flagged.disclaimer).toContain("never approves or rejects");
  });

  it("states which model version produced the result", () => {
    expect(flagged.modelVersion).toBe("v1.0");
  });
});
