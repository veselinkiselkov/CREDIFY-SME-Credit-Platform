import { describe, expect, it } from "vitest";
import { assess, type CreditInput } from "@/lib/credit";
import { DEMO_APPLICATIONS, type DemoApplication } from "@/lib/sample/demo-applications";
import { RISK_GRADES } from "@/lib/risk-grades";

/**
 * THE DEMO PORTFOLIO IS SCORED BY THE REAL ENGINE.
 *
 * The `expectedScore` and `expectedGrade` fields on each demo borrower are documentation,
 * not data the product uses. This file re-runs every one of them through `assess()` and
 * asserts the documentation still matches.
 *
 * That is the whole guarantee: nobody can quietly tune a demo company to look good on the
 * dashboard, because the only way to change its grade is to change its financial inputs and
 * update the comment - and the only way to change the model is to fail this test.
 */

/** Fixed, so "years in business" does not drift with the calendar mid-test. */
const NOW = new Date("2026-06-01T00:00:00Z");

function toCreditInput(demo: DemoApplication): CreditInput | null {
  if (demo.totalLiabilitiesEur === null || demo.equityEur === null) return null;
  return {
    loanAmountEur: demo.loanAmountEur,
    revenueEur: demo.revenueEur,
    revenuePriorYearEur: demo.revenuePriorYearEur,
    ebitdaEur: demo.ebitdaEur,
    netIncomeEur: demo.netIncomeEur,
    interestExpenseEur: demo.interestExpenseEur,
    existingDebtEur: demo.existingDebtEur,
    totalAssetsEur: demo.totalAssetsEur,
    currentAssetsEur: demo.currentAssetsEur,
    currentLiabilitiesEur: demo.currentLiabilitiesEur,
    totalLiabilitiesEur: demo.totalLiabilitiesEur,
    equityEur: demo.equityEur,
    cashEur: demo.cashEur,
    yearsInBusiness: NOW.getUTCFullYear() - demo.yearFounded,
  };
}

describe("the demo portfolio", () => {
  it("has six borrowers with unique references", () => {
    expect(DEMO_APPLICATIONS).toHaveLength(6);
    const references = DEMO_APPLICATIONS.map((d) => d.reference);
    expect(new Set(references).size).toBe(references.length);
  });

  it.each(DEMO_APPLICATIONS.map((d) => [d.companyName, d] as const))(
    "%s scores exactly what its comment claims",
    (_name, demo) => {
      const input = toCreditInput(demo);

      if (input === null) {
        // The deliberately incomplete row: it must not be scoreable at all.
        expect(demo.expectedScore).toBeNull();
        expect(demo.expectedGrade).toBe("Not scored");
        return;
      }

      const assessment = assess(input);
      expect(assessment.score).toBe(demo.expectedScore);
      expect(assessment.grade.label).toBe(demo.expectedGrade);
    },
  );

  it("covers a useful spread of grades rather than one repeated company", () => {
    const grades = DEMO_APPLICATIONS.map((d) => d.expectedGrade);
    expect(grades).toContain("Low");
    expect(grades).toContain("Moderate");
    expect(grades).toContain("Elevated");
    expect(grades).toContain("High");
    expect(grades).toContain("Not scored");
  });

  it("includes exactly one borrower whose grade is capped by a critical flag", () => {
    const capped = DEMO_APPLICATIONS.filter((demo) => {
      const input = toCreditInput(demo);
      return input !== null && assess(input).gradeCapped;
    });
    expect(capped).toHaveLength(1);
    expect(capped[0].companyName).toBe("Rheinbau Hochtief KG");

    // The instructive part: the score alone would have been Moderate.
    const assessment = assess(toCreditInput(capped[0]) as CreditInput);
    expect(assessment.uncappedGrade.label).toBe("Moderate");
    expect(assessment.grade.label).toBe("High");
    expect(assessment.criticalFlags.map((f) => f.id)).toContain("negative-equity");
  });

  it("gives every scoreable borrower a grade that exists in the grade table", () => {
    const labels = RISK_GRADES.map((g) => g.label);
    for (const demo of DEMO_APPLICATIONS) {
      if (demo.expectedScore !== null) expect(labels).toContain(demo.expectedGrade);
    }
  });

  it("balances every reported balance sheet, so no demo row trips a data-quality warning by accident", () => {
    for (const demo of DEMO_APPLICATIONS) {
      const input = toCreditInput(demo);
      if (input === null) continue;
      expect(assess(input).dataQualityWarnings, `${demo.companyName} raised a warning`).toEqual([]);
    }
  });

  it("uses only fictional contact details", () => {
    for (const demo of DEMO_APPLICATIONS) {
      // .example is reserved by RFC 2606 and can never be a real domain.
      expect(demo.contactEmail).toMatch(/\.example$/);
    }
  });
});
