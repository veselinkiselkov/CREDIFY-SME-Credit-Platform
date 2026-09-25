import { assess, type CreditInput, type CreditAssessment, type ScoredRatioId } from "@/lib/credit";

/**
 * Shared test fixtures.
 *
 * HEALTHY_INPUT is a deliberately strong borrower that scores 99/100 with no critical flag.
 * Each test then changes ONE figure and asserts what that change did, so a failure points at
 * a single factor rather than at "the score moved".
 */
export const HEALTHY_INPUT: CreditInput = {
  loanAmountEur: 50_000, // 5% of revenue         -> 5/5
  revenueEur: 1_000_000,
  revenuePriorYearEur: 1_000_000, // 0% growth    -> 4/5
  ebitdaEur: 200_000,
  netIncomeEur: 100_000, // 10% margin            -> 15/15
  interestExpenseEur: 20_000, // 10x coverage     -> 20/20
  existingDebtEur: 100_000, // 0.75x pro forma    -> 25/25, 10% of assets -> 10/10
  totalAssetsEur: 1_000_000,
  currentAssetsEur: 400_000,
  currentLiabilitiesEur: 200_000, // 2.0 current ratio -> 15/15
  yearsInBusiness: 12, //                         -> 5/5
};

/** HEALTHY_INPUT with specific figures replaced. */
export function inputWith(overrides: Partial<CreditInput>): CreditInput {
  return { ...HEALTHY_INPUT, ...overrides };
}

export function assessWith(overrides: Partial<CreditInput>): CreditAssessment {
  return assess(inputWith(overrides));
}

/** Points awarded to one factor, for boundary tests that care about a single row. */
export function pointsFor(assessment: CreditAssessment, id: ScoredRatioId): number {
  const factor = assessment.factors.find((f) => f.id === id);
  if (!factor) throw new Error(`No factor ${id} in the assessment`);
  return factor.points;
}

export function factorFor(assessment: CreditAssessment, id: ScoredRatioId) {
  const factor = assessment.factors.find((f) => f.id === id);
  if (!factor) throw new Error(`No factor ${id} in the assessment`);
  return factor;
}

export function hasFlag(assessment: CreditAssessment, id: string): boolean {
  return assessment.criticalFlags.some((flag) => flag.id === id);
}

export function hasWarning(assessment: CreditAssessment, id: string): boolean {
  return assessment.dataQualityWarnings.some((warning) => warning.id === id);
}

/**
 * Walks the whole assessment and reports any value that should never have escaped the
 * engine: a NaN, an Infinity, or a string that rendered one.
 *
 * This is the safety net behind every edge-case test. Rather than each test remembering to
 * check its own corner, one function proves that nothing anywhere in the output is
 * unrenderable - including fields the test was not thinking about.
 */
export function findBadNumbers(value: unknown, path = "assessment"): string[] {
  const problems: string[] = [];

  if (typeof value === "number") {
    if (!Number.isFinite(value)) problems.push(`${path} = ${value}`);
    return problems;
  }

  if (typeof value === "string") {
    if (/NaN|Infinity|undefined/.test(value)) problems.push(`${path} = "${value}"`);
    return problems;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => problems.push(...findBadNumbers(item, `${path}[${index}]`)));
    return problems;
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      // Functions are configuration, not output.
      if (typeof item === "function") continue;
      problems.push(...findBadNumbers(item, `${path}.${key}`));
    }
  }

  return problems;
}
