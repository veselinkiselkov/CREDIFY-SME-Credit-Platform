import { describe, expect, it } from "vitest";
import { findMissingInputs, scoreApplication, yearsInBusiness } from "../scoring";
import { LEGACY_RECORD, NORDWERK_RECORD, NOW, recordWith } from "./fixtures";

/**
 * THE BRIDGE FROM A STORED ROW TO AN ASSESSMENT.
 *
 * The first block is the demo case: the analyst screens must show exactly what the Day 3
 * engine produces, with no arithmetic of their own. The second is the one that protects the
 * dashboard in production - legacy rows that cannot be scored, which must be refused
 * cleanly rather than scored on invented figures.
 */

describe("Nordwerk through the analyst path", () => {
  const scoring = scoreApplication(NORDWERK_RECORD, NOW);

  it("is scored", () => {
    expect(scoring.status).toBe("scored");
  });

  it("produces exactly 78 of 100, graded Moderate, uncapped", () => {
    if (scoring.status !== "scored") throw new Error("expected a scored result");
    expect(scoring.assessment.score).toBe(78);
    expect(scoring.assessment.grade.id).toBe("moderate");
    expect(scoring.assessment.gradeCapped).toBe(false);
    expect(scoring.assessment.criticalFlags).toEqual([]);
  });

  it("shows the agreed ratio values", () => {
    if (scoring.status !== "scored") throw new Error("expected a scored result");
    const display = Object.fromEntries(scoring.assessment.factors.map((f) => [f.id, f.ratio.display]));
    expect(display.proFormaLeverage).toBe("2.86×");
    expect(display.interestCoverage).toBe("9.0×");
    expect(display.currentRatio).toBe("1.56");
    expect(display.netProfitMargin).toBe("6.2%");
    expect(display.debtToAssets).toBe("34.3%");
    expect(display.revenueGrowth).toBe("+7.7%");
    expect(display.loanToRevenue).toBe("14.3%");
  });

  it("awards the agreed points", () => {
    if (scoring.status !== "scored") throw new Error("expected a scored result");
    const points = Object.fromEntries(scoring.assessment.factors.map((f) => [f.id, f.points]));
    expect(points).toEqual({
      proFormaLeverage: 14,
      interestCoverage: 20,
      currentRatio: 12,
      netProfitMargin: 11,
      debtToAssets: 8,
      yearsInBusiness: 5,
      revenueGrowth: 4,
      loanToRevenue: 4,
    });
  });

  it("passes the reported equity to the engine rather than deriving one", () => {
    if (scoring.status !== "scored") throw new Error("expected a scored result");
    expect(scoring.input.equityEur).toBe(1_400_000);
    expect(scoring.assessment.equityEur).toBe(1_400_000);
  });

  it("converts the founding year into years in business", () => {
    expect(yearsInBusiness(2014, NOW)).toBe(12);
    if (scoring.status !== "scored") throw new Error("expected a scored result");
    expect(scoring.input.yearsInBusiness).toBe(12);
  });

  it("does not pass a cash figure, because the form does not collect one", () => {
    if (scoring.status !== "scored") throw new Error("expected a scored result");
    expect(scoring.input.cashEur).toBeUndefined();
  });
});

describe("legacy rows missing the balance-sheet figures", () => {
  it("are reported incomplete rather than scored", () => {
    const scoring = scoreApplication(LEGACY_RECORD, NOW);
    expect(scoring.status).toBe("incomplete");
  });

  it("name exactly what is missing", () => {
    const scoring = scoreApplication(LEGACY_RECORD, NOW);
    if (scoring.status !== "incomplete") throw new Error("expected an incomplete result");
    expect(scoring.missing.map((m) => m.field).sort()).toEqual(["equityEur", "totalLiabilitiesEur"]);
    for (const item of scoring.missing) expect(item.label.length).toBeGreaterThan(0);
  });

  it("never derive the missing equity from debt and current liabilities", () => {
    // The old derivation would have produced 3.5M − 1.2M − 0.9M = 1.4M and scored 78,
    // silently presenting a guess as a reported figure. Refusing is the whole point.
    const scoring = scoreApplication(LEGACY_RECORD, NOW);
    expect(scoring).not.toHaveProperty("assessment");
    expect(scoring).not.toHaveProperty("input");
  });

  it("do not throw", () => {
    expect(() => scoreApplication(LEGACY_RECORD, NOW)).not.toThrow();
  });
});

describe("other incomplete shapes are refused too", () => {
  it.each([
    ["revenueEur", { revenueEur: null }],
    ["ebitdaEur", { ebitdaEur: null }],
    ["netIncomeEur", { netIncomeEur: null }],
    ["interestExpenseEur", { interestExpenseEur: null }],
    ["existingDebtEur", { existingDebtEur: null }],
    ["totalAssetsEur", { totalAssetsEur: null }],
    ["currentAssetsEur", { currentAssetsEur: null }],
    ["currentLiabilitiesEur", { currentLiabilitiesEur: null }],
    ["totalLiabilitiesEur", { totalLiabilitiesEur: null }],
    ["equityEur", { equityEur: null }],
    ["loanAmountEur", { loanAmountEur: null }],
  ])("a missing %s makes the row unscoreable", (field, overrides) => {
    const scoring = scoreApplication(recordWith(overrides), NOW);
    expect(scoring.status).toBe("incomplete");
    if (scoring.status !== "incomplete") return;
    expect(scoring.missing.map((m) => m.field)).toContain(field);
  });

  it("an unusable founding year is a gap as well", () => {
    const scoring = scoreApplication(recordWith({ yearFounded: 0 }), NOW);
    expect(scoring.status).toBe("incomplete");
  });

  it("a missing PRIOR-YEAR revenue is not a gap: the engine scores it neutrally", () => {
    const scoring = scoreApplication(recordWith({ revenuePriorYearEur: null }), NOW);
    expect(scoring.status).toBe("scored");
    if (scoring.status !== "scored") return;
    // 78 with +7.7% growth (4/5) becomes 76 with the trend unknown (2/5).
    expect(scoring.assessment.score).toBe(76);
    expect(findMissingInputs(recordWith({ revenuePriorYearEur: null }))).toEqual([]);
  });

  it("reports several missing figures at once", () => {
    const scoring = scoreApplication(recordWith({ revenueEur: null, equityEur: null, ebitdaEur: null }), NOW);
    if (scoring.status !== "incomplete") throw new Error("expected an incomplete result");
    expect(scoring.missing).toHaveLength(3);
  });
});

describe("critical flags and the cap, through the analyst path", () => {
  it("surfaces a capped grade for a borrower with negative equity", () => {
    const scoring = scoreApplication(recordWith({ equityEur: -400_000, totalLiabilitiesEur: 3_900_000 }), NOW);
    if (scoring.status !== "scored") throw new Error("expected a scored result");

    expect(scoring.assessment.criticalFlags.map((f) => f.id)).toContain("negative-equity");
    expect(scoring.assessment.gradeCapped).toBe(true);
    expect(scoring.assessment.grade.id).toBe("high");
    expect(scoring.assessment.uncappedGrade.id).toBe("moderate");
    // The score itself is untouched, so both numbers can be shown.
    expect(scoring.assessment.score).toBe(78);
  });

  it("leaves an unflagged borrower uncapped", () => {
    const scoring = scoreApplication(NORDWERK_RECORD, NOW);
    if (scoring.status !== "scored") throw new Error("expected a scored result");
    expect(scoring.assessment.gradeCapped).toBe(false);
    expect(scoring.assessment.grade.id).toBe(scoring.assessment.uncappedGrade.id);
  });

  it("raises a data-quality warning without capping anything", () => {
    // Debt reported with zero interest: warning, full coverage points, no flag.
    const scoring = scoreApplication(recordWith({ interestExpenseEur: 0 }), NOW);
    if (scoring.status !== "scored") throw new Error("expected a scored result");
    expect(scoring.assessment.dataQualityWarnings.map((w) => w.id)).toContain("debt-without-interest-expense");
    expect(scoring.assessment.criticalFlags).toEqual([]);
    expect(scoring.assessment.gradeCapped).toBe(false);
  });
});
