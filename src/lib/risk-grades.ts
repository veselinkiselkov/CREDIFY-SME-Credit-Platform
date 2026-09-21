/**
 * RISK GRADES: the single source of truth for Credify's rating labels.
 *
 * Every screen that shows a grade (badges, the risk scale, the dashboard, the methodology page)
 * reads from this file, so labels and score ranges can never disagree between screens.
 *
 * The full scoring engine (ratios, factor bands, weights) is built on Day 3 in lib/credit/.
 * The grade definitions live here from Day 1 because the landing page already displays them.
 */

export const MODEL_VERSION = "v1.0";

/** Shown wherever the score or grade appears. */
export const MODEL_DISCLAIMER =
  "Credify's scorecard is an illustrative decision-support model built for demonstration. " +
  "It is not a real bank underwriting model. It never approves or rejects an application: " +
  "a credit analyst reviews every case and makes the final decision.";

export type RiskGradeId = "low" | "moderate" | "elevated" | "high" | "very-high";

export interface RiskGrade {
  id: RiskGradeId;
  label: string;
  /** Lowest score in this grade (inclusive). */
  minScore: number;
  /** Highest score in this grade (inclusive). */
  maxScore: number;
  /** Tailwind background class. Written out in full so Tailwind can detect it. */
  swatchClass: string;
  /** Plain-language meaning, shown on the landing and methodology pages. */
  meaning: string;
}

/** Ordered from best to worst. */
export const RISK_GRADES: readonly RiskGrade[] = [
  {
    id: "low",
    label: "Low",
    minScore: 80,
    maxScore: 100,
    swatchClass: "bg-risk-low",
    meaning: "Strong capacity to carry the requested debt.",
  },
  {
    id: "moderate",
    label: "Moderate",
    minScore: 65,
    maxScore: 79,
    swatchClass: "bg-risk-moderate",
    meaning: "Sound overall, with one or two points to watch.",
  },
  {
    id: "elevated",
    label: "Elevated",
    minScore: 50,
    maxScore: 64,
    swatchClass: "bg-risk-elevated",
    meaning: "Clear weaknesses that need the analyst's attention.",
  },
  {
    id: "high",
    label: "High",
    minScore: 35,
    maxScore: 49,
    swatchClass: "bg-risk-high",
    meaning: "Significant weaknesses. Also the best grade possible when a critical flag is present.",
  },
  {
    id: "very-high",
    label: "Very High",
    minScore: 0,
    maxScore: 34,
    swatchClass: "bg-risk-very-high",
    meaning: "Serious concerns about the ability to repay.",
  },
];

/**
 * RISK-GRADE CAP (implemented in the scoring engine on Day 3).
 * If a critical flag is present (EBITDA of zero or less, negative equity,
 * interest coverage below 1.0x, or a current ratio below 0.8), the grade is capped at High.
 * The cap changes the grade shown to the analyst. It never approves or rejects anything.
 */
export const CAPPED_GRADE_ID: RiskGradeId = "high";

/** Returns the grade for a score between 0 and 100. */
export function gradeForScore(score: number): RiskGrade {
  const bounded = Math.min(100, Math.max(0, score));
  const grade = RISK_GRADES.find((g) => bounded >= g.minScore);
  // The last grade starts at 0, so a match is guaranteed; the fallback only satisfies TypeScript.
  return grade ?? RISK_GRADES[RISK_GRADES.length - 1];
}

/**
 * Segments for drawing the 0-100 risk scale from left (worst) to right (best).
 * Each segment's width equals the score range it covers: 35, 15, 15, 15 and 20 points.
 */
export function riskScaleSegments() {
  const ascending = [...RISK_GRADES].reverse();
  return ascending.map((grade, i) => {
    const end = i < ascending.length - 1 ? ascending[i + 1].minScore : 100;
    return { grade, widthPercent: end - grade.minScore };
  });
}
