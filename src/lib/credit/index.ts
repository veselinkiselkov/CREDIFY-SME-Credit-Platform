/**
 * THE CREDIT ENGINE'S PUBLIC SURFACE.
 *
 * Everything outside this folder imports from "@/lib/credit" and nothing deeper, so the
 * internal split between ratios, scorecard, flags and data quality stays free to change.
 *
 * The engine is pure: no database, no network, no React, no clock, no randomness. That is
 * what lets the same function serve the landing page, the analyst screens (Day 4) and the
 * test suite, and give all three identical answers.
 */

export { assess } from "./engine";
export { SCORECARD, SCORECARD_VERSION, MAX_SCORE, bandFor, RISK_THRESHOLD, STRENGTH_THRESHOLD } from "./scorecard";
export { NOT_MEANINGFUL } from "./ratios";
export type {
  CreditInput,
  CreditAssessment,
  FactorResult,
  RatioResult,
  RatioStatus,
  CriticalFlag,
  CriticalFlagId,
  DataQualityWarning,
  DataQualityWarningId,
  ScoredRatioId,
  DisplayRatioId,
  RatioId,
} from "./types";
