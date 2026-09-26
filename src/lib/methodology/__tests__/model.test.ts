import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CRITICAL_FLAG_RULES,
  DATA_QUALITY_CHECKS,
  MAX_SCORE,
  SCORECARD,
  bandFor,
  criticalFlagRule,
  assess,
} from "@/lib/credit";
import { RISK_GRADES } from "@/lib/risk-grades";
import {
  FACTOR_COPY,
  DISPLAY_RATIO_NOTES,
  LIMITATIONS,
  methodologyCriticalFlags,
  methodologyDataQualityChecks,
  methodologyFactors,
  methodologyGrades,
} from "../model";

/**
 * THE PUBLISHED METHODOLOGY CANNOT DRIFT FROM THE MODEL.
 *
 * A model whose documentation has quietly stopped matching its implementation is worse than
 * one with no documentation, because people keep deciding against a document that is no
 * longer true. These tests assert that every published number is READ from the engine's
 * configuration rather than retyped beside it.
 */

describe("the factor table is generated from the scorecard", () => {
  it("publishes exactly the factors the engine scores, in the same order", () => {
    expect(methodologyFactors().map((f) => f.id)).toEqual(SCORECARD.map((f) => f.id));
  });

  it("publishes each factor's real weight", () => {
    for (const published of methodologyFactors()) {
      const configured = SCORECARD.find((f) => f.id === published.id);
      expect(published.maxPoints).toBe(configured?.maxPoints);
      expect(published.label).toBe(configured?.label);
      expect(published.direction).toBe(configured?.direction);
    }
  });

  it("publishes each factor's real bands, labels and points", () => {
    for (const published of methodologyFactors()) {
      const configured = SCORECARD.find((f) => f.id === published.id);
      expect(published.bands).toEqual(configured?.bands.map((b) => ({ label: b.label, points: b.points })));
    }
  });

  it("publishes the special cases that score without a band, such as 'No debt'", () => {
    const coverage = methodologyFactors().find((f) => f.id === "interestCoverage");
    expect(coverage?.specialCases).toContainEqual({ label: "No debt", points: 20 });
    const liquidity = methodologyFactors().find((f) => f.id === "currentRatio");
    expect(liquidity?.specialCases).toContainEqual({ label: "No current liabilities", points: 15 });
  });

  it("weights add to 100, and the published percentages to 100", () => {
    const factors = methodologyFactors();
    expect(factors.reduce((t, f) => t + f.maxPoints, 0)).toBe(MAX_SCORE);
    expect(factors.reduce((t, f) => t + f.weightPercent, 0)).toBe(100);
  });

  it("has prose for every scored factor, so adding one forces an explanation", () => {
    for (const factor of SCORECARD) {
      expect(FACTOR_COPY[factor.id], `no copy for ${factor.id}`).toBeDefined();
      expect(FACTOR_COPY[factor.id].measures.length).toBeGreaterThan(30);
      expect(FACTOR_COPY[factor.id].matters.length).toBeGreaterThan(30);
    }
    expect(Object.keys(FACTOR_COPY).sort()).toEqual(SCORECARD.map((f) => f.id).sort());
  });

  it("a published band really is the band the scorer would choose", () => {
    // Spot-check the boundary the reference case lands on: Nordwerk's 2.86x leverage.
    const leverage = SCORECARD.find((f) => f.id === "proFormaLeverage");
    if (!leverage) throw new Error("missing factor");
    const band = bandFor(leverage, 2.857);
    const published = methodologyFactors().find((f) => f.id === "proFormaLeverage");
    expect(published?.bands).toContainEqual({ label: band.label, points: band.points });
    expect(band.points).toBe(14);
  });
});

describe("the grade table is the Day 1 source of truth", () => {
  it("publishes all five grades with their real ranges", () => {
    const published = methodologyGrades();
    expect(published).toHaveLength(RISK_GRADES.length);
    published.forEach((grade, index) => {
      const source = RISK_GRADES[index];
      expect(grade.id).toBe(source.id);
      expect(grade.label).toBe(source.label);
      expect(grade.range).toBe(`${source.minScore}–${source.maxScore}`);
      expect(grade.meaning).toBe(source.meaning);
    });
  });
});

describe("the critical-flag table is the engine's own rule set", () => {
  it("publishes exactly the four rules the engine uses", () => {
    expect(methodologyCriticalFlags().map((f) => f.id)).toEqual(CRITICAL_FLAG_RULES.map((r) => r.id));
    expect(methodologyCriticalFlags()).toHaveLength(4);
  });

  it("publishes conditions that match the thresholds the engine fires at", () => {
    expect(criticalFlagRule("interest-coverage-below-1").threshold).toBe(1.0);
    expect(criticalFlagRule("current-ratio-below-0-8").threshold).toBe(0.8);
    // The published condition strings quote those same numbers.
    const published = methodologyCriticalFlags();
    expect(published.find((f) => f.id === "interest-coverage-below-1")?.condition).toContain("1.0");
    expect(published.find((f) => f.id === "current-ratio-below-0-8")?.condition).toContain("0.8");
  });

  it("the engine really does fire at the published thresholds", () => {
    const base = {
      loanAmountEur: 50_000, revenueEur: 1_000_000, revenuePriorYearEur: 1_000_000, ebitdaEur: 200_000,
      netIncomeEur: 100_000, interestExpenseEur: 20_000, existingDebtEur: 100_000, totalAssetsEur: 1_000_000,
      currentAssetsEur: 400_000, currentLiabilitiesEur: 200_000, totalLiabilitiesEur: 300_000,
      equityEur: 700_000, yearsInBusiness: 12,
    };
    // Just below 1.0x coverage fires; exactly 1.0x does not.
    expect(assess({ ...base, interestExpenseEur: 200_001 }).criticalFlags.map((f) => f.id)).toContain(
      "interest-coverage-below-1",
    );
    expect(assess({ ...base, interestExpenseEur: 200_000 }).criticalFlags.map((f) => f.id)).not.toContain(
      "interest-coverage-below-1",
    );
    // Just below 0.8 current ratio fires; exactly 0.8 does not.
    expect(assess({ ...base, currentAssetsEur: 159_000 }).criticalFlags.map((f) => f.id)).toContain(
      "current-ratio-below-0-8",
    );
    expect(assess({ ...base, currentAssetsEur: 160_000 }).criticalFlags.map((f) => f.id)).not.toContain(
      "current-ratio-below-0-8",
    );
  });
});

describe("the data-quality table matches the checks that exist", () => {
  it("publishes every check the engine can raise", () => {
    expect(methodologyDataQualityChecks().map((c) => c.id).sort()).toEqual(
      DATA_QUALITY_CHECKS.map((c) => c.id).sort(),
    );
  });

  it("covers every warning id the engine's type declares", () => {
    // Read the union from source: a new warning id must be published, not silently added.
    const types = readFileSync("src/lib/credit/types.ts", "utf8");
    const union = types.slice(
      types.indexOf("export type DataQualityWarningId"),
      types.indexOf("export interface DataQualityWarning"),
    );
    for (const check of DATA_QUALITY_CHECKS) {
      expect(union, `${check.id} missing from the type`).toContain(check.id);
    }
    const declared = [...union.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
    for (const id of declared) {
      expect(DATA_QUALITY_CHECKS.map((c) => c.id), `${id} is not published`).toContain(id);
    }
  });
});

describe("the rest of the page", () => {
  it("explains all four display-only ratios", () => {
    expect(Object.keys(DISPLAY_RATIO_NOTES).sort()).toEqual(
      ["currentLeverage", "ebitdaMargin", "returnOnAssets", "returnOnEquity"].sort(),
    );
  });

  it("says why ROA and ROE would double-count profitability", () => {
    expect(DISPLAY_RATIO_NOTES.returnOnAssets.reason).toMatch(/twice|double/i);
    expect(DISPLAY_RATIO_NOTES.returnOnEquity.reason).toMatch(/double-counting|twice/i);
  });

  it("publishes a substantial limitations section", () => {
    expect(LIMITATIONS.length).toBeGreaterThanOrEqual(8);
    for (const limitation of LIMITATIONS) {
      expect(limitation.title.length).toBeGreaterThan(10);
      expect(limitation.detail.length).toBeGreaterThan(60);
    }
  });

  it("names the limitations an interviewer will probe", () => {
    const text = LIMITATIONS.map((l) => `${l.title} ${l.detail}`).join(" ").toLowerCase();
    expect(text).toContain("industry");
    expect(text).toContain("dscr");
    expect(text).toContain("collateral");
    expect(text).toContain("bureau");
    expect(text).toContain("ifrs 9");
    expect(text).toContain("basel");
  });
});
