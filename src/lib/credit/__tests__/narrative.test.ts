import { describe, expect, it } from "vitest";
import { RISK_THRESHOLD, STRENGTH_THRESHOLD } from "@/lib/credit";
import { NORDWERK_ASSESSMENT } from "@/lib/sample/nordwerk";
import { assessWith } from "./helpers";

/**
 * DETERMINISTIC EXPLANATIONS.
 *
 * The sentences an analyst reads are templates from scorecard.ts filled with the values the
 * engine just calculated. No language model is involved anywhere, which is why the same
 * case always produces the same words and every sentence can be checked against the number
 * printed beside it.
 */

describe("the strength and risk rules", () => {
  it("emits a strength for every factor at or above 80% of its maximum", () => {
    const result = assessWith({});
    const strong = result.factors.filter((f) => f.share >= STRENGTH_THRESHOLD);
    expect(strong.length).toBeGreaterThan(0);
    expect(result.strengths).toHaveLength(strong.length);
  });

  it("emits a risk for every factor at or below 40% of its maximum", () => {
    // Loss-making and illiquid: several factors bottom out.
    const result = assessWith({
      ebitdaEur: -50_000,
      netIncomeEur: -100_000,
      currentAssetsEur: 50_000,
      currentLiabilitiesEur: 400_000,
      yearsInBusiness: 0,
    });
    const weak = result.factors.filter((f) => f.share <= RISK_THRESHOLD);
    expect(weak.length).toBeGreaterThan(0);
    expect(result.risks).toHaveLength(weak.length);
  });

  it("says nothing at all about a merely average factor", () => {
    // 2.86x leverage is 14/25 = 56%: between the two thresholds, so no sentence.
    const leverage = NORDWERK_ASSESSMENT.factors.find((f) => f.id === "proFormaLeverage")!;
    expect(leverage.share).toBeGreaterThan(RISK_THRESHOLD);
    expect(leverage.share).toBeLessThan(STRENGTH_THRESHOLD);
    const mentioned = [...NORDWERK_ASSESSMENT.strengths, ...NORDWERK_ASSESSMENT.risks];
    expect(mentioned.some((s) => s.includes("2.86×"))).toBe(false);
  });

  it("never reports the same factor as both a strength and a risk", () => {
    const result = assessWith({});
    for (const strength of result.strengths) expect(result.risks).not.toContain(strength);
  });
});

describe("Nordwerk's explanation", () => {
  it("lists exactly the six factors scoring 80% or more as strengths", () => {
    expect(NORDWERK_ASSESSMENT.strengths).toHaveLength(6);
    expect(NORDWERK_ASSESSMENT.risks).toHaveLength(0);
  });

  it("quotes the real calculated values back to the analyst", () => {
    const all = NORDWERK_ASSESSMENT.strengths.join(" ");
    expect(all).toContain("9.0×"); // interest coverage
    expect(all).toContain("1.56"); // current ratio
    expect(all).toContain("34.3%"); // debt to assets
    expect(all).toContain("+7.7%"); // revenue growth
    expect(all).toContain("14.3%"); // loan to revenue
    expect(all).toContain("12 years"); // track record
  });

  it("matches the agreed wording for interest coverage and liquidity", () => {
    expect(NORDWERK_ASSESSMENT.strengths).toContain(
      "Current Interest Coverage of 9.0× indicates strong interest-payment capacity.",
    );
    expect(NORDWERK_ASSESSMENT.strengths).toContain(
      "Current Ratio of 1.56 indicates adequate short-term liquidity.",
    );
  });
});

describe("explanations for the awkward cases", () => {
  it("explains an unmeasurable leverage in words, not as 'n/m is elevated'", () => {
    const result = assessWith({ ebitdaEur: -100_000 });
    const sentence = result.risks.find((r) => r.toLowerCase().includes("leverage"));
    expect(sentence).toBe("Leverage cannot be measured because EBITDA is zero or negative.");
  });

  it("describes having no debt as a strength in its own terms", () => {
    const result = assessWith({ existingDebtEur: 0, interestExpenseEur: 0 });
    expect(result.strengths).toContain("The business carries no interest-bearing debt today.");
  });

  it("says the trend is unknown rather than blaming the applicant for a decline", () => {
    const result = assessWith({ revenuePriorYearEur: null });
    // 2/5 is at the risk threshold exactly, so it does produce a sentence.
    expect(result.risks).toContain("No prior-year revenue was provided, so the trend cannot be assessed.");
  });

  it("never renders a null or a NaN into a sentence", () => {
    const awkward = [
      { ebitdaEur: 0 },
      { revenueEur: 0 },
      { currentLiabilitiesEur: 0 },
      { revenuePriorYearEur: null },
      { interestExpenseEur: 0, existingDebtEur: 500_000 },
      { totalAssetsEur: 0 },
    ];
    for (const overrides of awkward) {
      const result = assessWith(overrides);
      for (const sentence of [...result.strengths, ...result.risks]) {
        expect(sentence).not.toMatch(/NaN|Infinity|null|undefined/);
        expect(sentence.endsWith(".")).toBe(true);
      }
    }
  });

  it("is deterministic: the same input produces the same sentences every time", () => {
    const a = assessWith({ ebitdaEur: 120_000, currentAssetsEur: 210_000 });
    const b = assessWith({ ebitdaEur: 120_000, currentAssetsEur: 210_000 });
    expect(a.strengths).toEqual(b.strengths);
    expect(a.risks).toEqual(b.risks);
  });
});
