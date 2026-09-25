import { describe, expect, it } from "vitest";
import { NOT_MEANINGFUL } from "@/lib/credit";
import { assessWith, factorFor, findBadNumbers, hasFlag, hasWarning, pointsFor } from "./helpers";

/**
 * EDGE CASES.
 *
 * Every one of these would produce NaN, Infinity or a nonsensical score if the arithmetic
 * were written the obvious way. The engine must instead produce a renderable value, a named
 * reason, and a defensible number of points.
 */

const displayOf = (result: ReturnType<typeof assessWith>, id: string) =>
  result.displayRatios.find((r) => r.id === id);

describe("EBITDA of zero or less", () => {
  it("shows leverage as n/m and scores zero rather than dividing by zero", () => {
    const result = assessWith({ ebitdaEur: 0 });
    const factor = factorFor(result, "proFormaLeverage");
    expect(factor.ratio.display).toBe(NOT_MEANINGFUL);
    expect(factor.ratio.value).toBeNull();
    expect(factor.ratio.status).toBe("not-meaningful");
    expect(factor.points).toBe(0);
  });

  it("scores zero on NEGATIVE EBITDA instead of reading it as excellent leverage", () => {
    // The trap this guards: −1.5M / −100k is a positive 15, but (debt + loan) / negative
    // EBITDA is negative, and a negative number passes every "lower is better" threshold.
    // Without the guard, a loss-making business would score 25/25 on the heaviest factor.
    const result = assessWith({ ebitdaEur: -100_000 });
    expect(pointsFor(result, "proFormaLeverage")).toBe(0);
    expect(factorFor(result, "proFormaLeverage").ratio.display).toBe(NOT_MEANINGFUL);
  });

  it("also shows leverage today as n/m", () => {
    const result = assessWith({ ebitdaEur: -100_000 });
    expect(displayOf(result, "currentLeverage")?.display).toBe(NOT_MEANINGFUL);
  });

  it("explains itself in the factor's band column", () => {
    expect(factorFor(assessWith({ ebitdaEur: 0 }), "proFormaLeverage").band).toBe("EBITDA ≤ 0");
  });
});

describe("zero interest expense", () => {
  it("with no debt, shows 'No debt' and scores full marks", () => {
    const result = assessWith({ interestExpenseEur: 0, existingDebtEur: 0 });
    const factor = factorFor(result, "interestCoverage");
    expect(factor.ratio.display).toBe("No debt");
    expect(factor.ratio.status).toBe("no-debt");
    expect(factor.points).toBe(20);
    expect(factor.band).toBe("No debt");
    expect(hasWarning(result, "debt-without-interest-expense")).toBe(false);
  });

  it("with debt outstanding, scores full marks on the figures as reported", () => {
    // The figures show no interest burden, so the factor scores what the figures say. The
    // doubt about whether they are right is raised separately, as a data-quality warning:
    // docking 20 points would be scoring a suspected typing error as though it were credit
    // risk, which is exactly the mixing of concerns the engine avoids everywhere else.
    const result = assessWith({ interestExpenseEur: 0, existingDebtEur: 500_000 });
    const factor = factorFor(result, "interestCoverage");
    expect(factor.ratio.display).toBe("No reported interest expense");
    expect(factor.ratio.status).toBe("no-interest-reported");
    expect(factor.points).toBe(20);
    expect(factor.band).toBe("No interest reported");
  });

  it("with debt outstanding, raises a warning telling the analyst to verify the figure", () => {
    const result = assessWith({ interestExpenseEur: 0, existingDebtEur: 500_000 });
    expect(hasWarning(result, "debt-without-interest-expense")).toBe(true);
    const warning = result.dataQualityWarnings.find((w) => w.id === "debt-without-interest-expense");
    expect(warning?.detail).toMatch(/confirm/i);
    expect(warning?.detail).toMatch(/interest-free/i);
  });

  it("with debt outstanding, does NOT raise the coverage-below-1 critical flag", () => {
    // There is no coverage figure, so there is nothing to say it is below 1.0x.
    const result = assessWith({ interestExpenseEur: 0, existingDebtEur: 500_000 });
    expect(hasFlag(result, "interest-coverage-below-1")).toBe(false);
    expect(result.gradeCapped).toBe(false);
  });

  it("scores the same either way, because the score follows the reported figures", () => {
    const noDebt = assessWith({ interestExpenseEur: 0, existingDebtEur: 0 });
    const debtNoInterest = assessWith({ interestExpenseEur: 0, existingDebtEur: 500_000 });
    expect(pointsFor(noDebt, "interestCoverage")).toBe(20);
    expect(pointsFor(debtNoInterest, "interestCoverage")).toBe(20);
    // Only the warning distinguishes them.
    expect(hasWarning(noDebt, "debt-without-interest-expense")).toBe(false);
    expect(hasWarning(debtNoInterest, "debt-without-interest-expense")).toBe(true);
  });
});

describe("zero current liabilities", () => {
  it("scores full liquidity marks rather than zero", () => {
    // A zero denominator is not the worst liquidity position: on the figures as reported,
    // nothing falls due within the year, which is the strongest position there is.
    const result = assessWith({ currentLiabilitiesEur: 0 });
    const factor = factorFor(result, "currentRatio");
    expect(factor.ratio.display).toBe("No current liabilities");
    expect(factor.ratio.status).toBe("no-current-liabilities");
    expect(factor.points).toBe(15);
    expect(factor.band).toBe("No current liabilities");
  });

  it("produces no Infinity or NaN", () => {
    const result = assessWith({ currentLiabilitiesEur: 0 });
    expect(factorFor(result, "currentRatio").ratio.value).toBeNull();
    expect(findBadNumbers(result)).toEqual([]);
  });

  it("raises a data-quality warning asking for the figure to be confirmed", () => {
    const result = assessWith({ currentLiabilitiesEur: 0 });
    expect(hasWarning(result, "no-current-liabilities")).toBe(true);
    expect(result.dataQualityWarnings.find((w) => w.id === "no-current-liabilities")?.detail).toMatch(/confirm/i);
  });

  it("does not raise the current-ratio critical flag", () => {
    const result = assessWith({ currentLiabilitiesEur: 0 });
    expect(hasFlag(result, "current-ratio-below-0-8")).toBe(false);
    expect(result.gradeCapped).toBe(false);
  });

  it("describes it as a strength in its own terms", () => {
    const result = assessWith({ currentLiabilitiesEur: 0 });
    expect(result.strengths).toContain("Nothing is reported as falling due within twelve months.");
  });
});

describe("negative equity", () => {
  it("shows return on equity as n/m", () => {
    const result = assessWith({ equityEur: -250_000 });
    const roe = displayOf(result, "returnOnEquity");
    expect(roe?.display).toBe(NOT_MEANINGFUL);
    expect(roe?.value).toBeNull();
    expect(roe?.note).toContain("zero or negative");
  });

  it("shows return on equity as n/m at exactly zero equity too", () => {
    expect(displayOf(assessWith({ equityEur: 0 }), "returnOnEquity")?.display).toBe(NOT_MEANINGFUL);
  });

  it("raises the critical flag and caps the grade", () => {
    const result = assessWith({ equityEur: -250_000 });
    expect(hasFlag(result, "negative-equity")).toBe(true);
    expect(result.gradeCapped).toBe(true);
  });

  it("reports the equity figure the applicant gave, unchanged", () => {
    expect(assessWith({ equityEur: -250_000 }).equityEur).toBe(-250_000);
    expect(assessWith({ equityEur: 12_345 }).equityEur).toBe(12_345);
  });

  it("names the reported figure in the flag's detail", () => {
    const flag = assessWith({ equityEur: -250_000 }).criticalFlags.find((f) => f.id === "negative-equity");
    expect(flag?.detail).toMatch(/250,000/);
    expect(flag?.detail).toMatch(/[Rr]eported/);
  });
});

describe("missing prior-year revenue", () => {
  it("is scored neutrally at 2 of 5, not as zero growth and not as a penalty", () => {
    const result = assessWith({ revenuePriorYearEur: null });
    const factor = factorFor(result, "revenueGrowth");
    expect(factor.ratio.status).toBe("not-provided");
    expect(factor.ratio.display).toBe("Not provided");
    expect(factor.points).toBe(2);
    expect(factor.band).toBe("Not provided");
  });

  it("costs exactly two points against the healthy borrower", () => {
    // 99 with flat revenue (4/5) becomes 97 with the trend unknown (2/5).
    expect(assessWith({ revenuePriorYearEur: null }).score).toBe(97);
  });

  it("shows n/m when the prior year is zero rather than reporting infinite growth", () => {
    const factor = factorFor(assessWith({ revenuePriorYearEur: 0 }), "revenueGrowth");
    expect(factor.ratio.display).toBe(NOT_MEANINGFUL);
    expect(factor.points).toBe(0);
  });
});

describe("division by zero never escapes", () => {
  const pathological = [
    { name: "no revenue", overrides: { revenueEur: 0 } },
    { name: "no assets", overrides: { totalAssetsEur: 0 } },
    { name: "no current liabilities", overrides: { currentLiabilitiesEur: 0 } },
    { name: "no interest expense", overrides: { interestExpenseEur: 0 } },
    { name: "zero EBITDA", overrides: { ebitdaEur: 0 } },
    { name: "zero prior-year revenue", overrides: { revenuePriorYearEur: 0 } },
    { name: "no total liabilities and no equity", overrides: { totalLiabilitiesEur: 0, equityEur: 0 } },
    { name: "every figure zero", overrides: {
        loanAmountEur: 0, revenueEur: 0, revenuePriorYearEur: 0, ebitdaEur: 0, netIncomeEur: 0,
        interestExpenseEur: 0, existingDebtEur: 0, totalAssetsEur: 0, currentAssetsEur: 0,
        currentLiabilitiesEur: 0, totalLiabilitiesEur: 0, equityEur: 0, yearsInBusiness: 0,
      } },
    { name: "negative everything", overrides: {
        ebitdaEur: -500_000, netIncomeEur: -900_000, revenueEur: 1, revenuePriorYearEur: 10_000_000,
        totalAssetsEur: 1, currentAssetsEur: 0, currentLiabilitiesEur: 5_000_000,
        totalLiabilitiesEur: 8_000_000, equityEur: -7_999_999,
      } },
  ];

  it.each(pathological)("$name produces no NaN or Infinity anywhere", ({ overrides }) => {
    const result = assessWith(overrides);
    expect(findBadNumbers(result)).toEqual([]);
  });

  it.each(pathological)("$name still produces a score between 0 and 100", ({ overrides }) => {
    const result = assessWith(overrides);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Number.isInteger(result.score)).toBe(true);
  });

  it.each(pathological)("$name still produces all eight factors and a grade", ({ overrides }) => {
    const result = assessWith(overrides);
    expect(result.factors).toHaveLength(8);
    expect(result.grade).toBeDefined();
    // Every factor must render, whether or not its ratio has a value.
    for (const factor of result.factors) {
      expect(factor.ratio.display.length).toBeGreaterThan(0);
      expect(factor.band.length).toBeGreaterThan(0);
    }
  });

  it("never lets a null-valued ratio be treated as a number", () => {
    const result = assessWith({ revenueEur: 0, ebitdaEur: 0, currentLiabilitiesEur: 0 });
    for (const factor of result.factors) {
      if (factor.ratio.status !== "ok") {
        expect(factor.ratio.value).toBeNull();
        expect(factor.ratio.note).toBeDefined();
      }
    }
  });
});
