import { CAPPED_GRADE_ID, MODEL_DISCLAIMER, RISK_GRADES, gradeForScore } from "@/lib/risk-grades";
import { RISK_THRESHOLD, SCORECARD, SCORECARD_VERSION, STRENGTH_THRESHOLD, bandFor, type FactorConfig } from "./scorecard";
import { calculateDisplayRatios, calculateScoredRatios, resolveEquity } from "./ratios";
import { checkDataQuality } from "./data-quality";
import type {
  CreditAssessment,
  CreditInput,
  CriticalFlag,
  EquityBasis,
  FactorResult,
  RatioResult,
} from "./types";

/**
 * THE CREDIT ENGINE.
 *
 * assess() is the whole public surface: figures in, analysis out. It runs in five steps,
 * in this order, and each step is a separate, separately testable function:
 *
 *   1. calculate the ratios          (ratios.ts)
 *   2. score each ratio into a band  (scorecard.ts holds every threshold)
 *   3. find critical flags and cap the grade
 *   4. write the strengths and risks from the numbers just calculated
 *   5. check the input data for internal contradictions  (data-quality.ts)
 *
 * WHY DETERMINISTIC, AND WHY NO AI ANYWHERE NEAR IT
 * A credit decision has to be explainable to the borrower who was refused, to the analyst
 * who signed it, and to a regulator reading the file two years later. This engine can
 * answer all three, because the answer is always the same arithmetic: the score is a sum of
 * eight table lookups, and the sentences are templates filled with the values that produced
 * them. Run it a thousand times and you get the same number a thousand times. A language
 * model can do none of that - it varies between runs, cannot show which figure drove the
 * result, and would be guessing at exactly the point where the work must be exact.
 *
 * The engine never approves or rejects. It produces analysis; a credit analyst decides.
 */

// =======================================================================================
// 2. Scoring
// =======================================================================================

/**
 * Turns one ratio into points.
 *
 * A ratio with a number is looked up in its band table. A ratio without one scores whatever
 * the scorecard says that particular absence is worth - which is zero unless the config
 * names an exception, so an unscoreable ratio can never pick up points by accident.
 */
function scoreFactor(config: FactorConfig, ratio: RatioResult): FactorResult {
  const scoreable = ratio.status === "ok" && ratio.value !== null;

  const points = scoreable
    ? bandFor(config, ratio.value as number).points
    : (config.pointsWhenUnscoreable?.[ratio.status] ?? 0);

  const band = scoreable
    ? bandFor(config, ratio.value as number).label
    : (config.unscoreableBandLabel?.[ratio.status] ?? ratio.display);

  return {
    id: config.id,
    label: config.label,
    points,
    maxPoints: config.maxPoints,
    band,
    ratio,
    share: points / config.maxPoints,
  };
}

// =======================================================================================
// 3. Critical flags and the grade cap
// =======================================================================================

/**
 * The four conditions that cap the grade.
 *
 * Each one says the same thing in a different way: this business may not be able to pay,
 * whatever the other seven factors add up to. A strong score elsewhere can otherwise mask
 * them - a profitable, fast-growing company with negative equity still scores well on six
 * factors - and the cap is what stops the total from papering over the hole.
 *
 * Note that the coverage and liquidity flags only fire on a real calculated value. A ratio
 * that could not be calculated is not evidence of anything, and must not raise a flag as
 * though it were.
 */
function findCriticalFlags(
  input: CreditInput,
  equity: EquityBasis,
  coverage: RatioResult,
  currentRatio: RatioResult,
): CriticalFlag[] {
  const flags: CriticalFlag[] = [];

  if (input.ebitdaEur <= 0) {
    flags.push({
      id: "non-positive-ebitda",
      label: "EBITDA is zero or negative",
      detail: "The business does not generate operating earnings to service debt from.",
    });
  }

  if (equity.valueEur < 0) {
    flags.push({
      id: "negative-equity",
      label: "Negative shareholders' equity",
      detail:
        `Liabilities exceed assets by ${Math.abs(Math.round(equity.valueEur)).toLocaleString("en-IE")} EUR.` +
        (equity.derived ? " Equity is derived from the reported figures, not taken from the accounts." : ""),
    });
  }

  if (coverage.status === "ok" && coverage.value !== null && coverage.value < 1.0) {
    flags.push({
      id: "interest-coverage-below-1",
      label: "Interest coverage below 1.0×",
      detail: `EBITDA of ${coverage.display} does not cover the current interest bill.`,
    });
  }

  if (currentRatio.status === "ok" && currentRatio.value !== null && currentRatio.value < 0.8) {
    flags.push({
      id: "current-ratio-below-0-8",
      label: "Current ratio below 0.8",
      detail: `Short-term liabilities substantially exceed short-term assets (${currentRatio.display}).`,
    });
  }

  return flags;
}

/**
 * Applies the cap.
 *
 * WHY A CAP RATHER THAN AN AUTOMATIC REJECTION
 * An automatic rejection would make this a decision engine, and it is not one - it has no
 * access to the things that legitimately rescue a case like this: a parent guarantee, a
 * signed contract that fixes next year, security worth more than the loan, an owner
 * injecting capital next month. A score built from one year of figures cannot see any of
 * that, so it has no business closing the file.
 *
 * What it can honestly do is refuse to call the case low risk. The cap does exactly that:
 * the grade cannot come out better than High, the analyst sees the flag and the reason, and
 * the decision stays where the information is. The score itself is left untouched, so the
 * analyst can see both what the business scored and why it is not being shown as its score
 * would suggest.
 *
 * RISK_GRADES is ordered best to worst, so a higher index is a worse grade and taking the
 * larger index is taking the worse of the two.
 */
function applyGradeCap(score: number, hasCriticalFlag: boolean) {
  const uncappedGrade = gradeForScore(score);
  if (!hasCriticalFlag) {
    return { grade: uncappedGrade, uncappedGrade, gradeCapped: false };
  }

  const uncappedIndex = RISK_GRADES.findIndex((g) => g.id === uncappedGrade.id);
  const capIndex = RISK_GRADES.findIndex((g) => g.id === CAPPED_GRADE_ID);
  const finalIndex = Math.max(uncappedIndex, capIndex);

  return {
    grade: RISK_GRADES[finalIndex],
    uncappedGrade,
    // Only "capped" when the cap actually changed something. A case already sitting at Very
    // High is not made better by the cap, and saying it was capped would be misleading.
    gradeCapped: finalIndex !== uncappedIndex,
  };
}

// =======================================================================================
// 4. Narrative
// =======================================================================================

/**
 * Builds the explanatory sentences.
 *
 * These are templates from scorecard.ts filled with the values the engine just calculated -
 * not generated text. The analyst can check every sentence against the number beside it,
 * and the same case always produces the same words.
 *
 * A factor is only worth a sentence if it is clearly good or clearly bad. Everything
 * between the two thresholds is unremarkable and stays silent, which is what keeps the
 * summary short enough to be read.
 */
function buildNarrative(factors: FactorResult[]) {
  const strengths: string[] = [];
  const risks: string[] = [];

  for (const factor of factors) {
    const config = SCORECARD.find((c) => c.id === factor.id);
    if (!config) continue;

    if (factor.share >= STRENGTH_THRESHOLD) {
      strengths.push(config.strength(factor.ratio));
    } else if (factor.share <= RISK_THRESHOLD) {
      risks.push(config.risk(factor.ratio));
    }
  }

  return { strengths, risks };
}

// =======================================================================================
// The public entry point
// =======================================================================================

export function assess(input: CreditInput): CreditAssessment {
  // 1. Ratios. Equity is resolved first because return on equity and the negative-equity
  //    flag both depend on it.
  const equity = resolveEquity(input);
  const scoredRatios = calculateScoredRatios(input);
  const displayRatios = calculateDisplayRatios(input, equity);

  // 2. Score. Iterating over SCORECARD rather than over the ratios means the configuration
  //    decides which factors exist and in what order, here and on every screen.
  const factors = SCORECARD.map((config) => scoreFactor(config, scoredRatios[config.id]));
  const score = factors.reduce((total, factor) => total + factor.points, 0);

  // 3. Flags and cap.
  const criticalFlags = findCriticalFlags(input, equity, scoredRatios.interestCoverage, scoredRatios.currentRatio);
  const { grade, uncappedGrade, gradeCapped } = applyGradeCap(score, criticalFlags.length > 0);

  // 4. Narrative.
  const { strengths, risks } = buildNarrative(factors);

  // 5. Data quality, which deliberately played no part in any of the above.
  const dataQualityWarnings = checkDataQuality(input, equity);

  return {
    modelVersion: SCORECARD_VERSION,
    score,
    grade,
    uncappedGrade,
    gradeCapped,
    factors,
    displayRatios: Object.values(displayRatios),
    criticalFlags,
    strengths,
    risks,
    dataQualityWarnings,
    equity,
    disclaimer: MODEL_DISCLAIMER,
  };
}
