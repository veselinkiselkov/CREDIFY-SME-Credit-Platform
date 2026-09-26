import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { riskDistribution, summarise, toListItem } from "../list";
import { LEGACY_RECORD, NORDWERK_RECORD, NOW, recordWith } from "./fixtures";

/**
 * THE DASHBOARD'S DATA.
 *
 * The last block is the security test: nothing that reaches the browser may carry the
 * applicant's access token, which is the capability that opens their private status page.
 */

describe("projecting a record into a table row", () => {
  const item = toListItem(NORDWERK_RECORD, NOW);

  it("carries the engine's score and grade, not its own", () => {
    expect(item.scored).toBe(true);
    expect(item.score).toBe(78);
    expect(item.gradeId).toBe("moderate");
    expect(item.gradeLabel).toBe("Moderate");
    expect(item.gradeCapped).toBe(false);
    expect(item.criticalFlagCount).toBe(0);
  });

  it("resolves codes into labels the analyst can read", () => {
    expect(item.industryLabel).toBe("Manufacturing");
    expect(item.loanPurposeLabel).toBe("Equipment or machinery");
  });

  it("links on the internal id, not on anything applicant-facing", () => {
    expect(item.id).toBe(NORDWERK_RECORD.id);
  });

  it("marks a legacy row unscored instead of scoring it", () => {
    const legacy = toListItem(LEGACY_RECORD, NOW);
    expect(legacy.scored).toBe(false);
    expect(legacy.score).toBeNull();
    expect(legacy.gradeId).toBeNull();
    expect(legacy.gradeLabel).toBeNull();
    expect(legacy.missingCount).toBe(2);
  });

  it("does not throw on a legacy row", () => {
    expect(() => toListItem(LEGACY_RECORD, NOW)).not.toThrow();
  });

  it("reports a capped grade", () => {
    const capped = toListItem(recordWith({ equityEur: -400_000, totalLiabilitiesEur: 3_900_000 }), NOW);
    expect(capped.gradeCapped).toBe(true);
    expect(capped.gradeId).toBe("high");
    expect(capped.criticalFlagCount).toBeGreaterThan(0);
  });
});

describe("portfolio summary", () => {
  const items = [
    toListItem(NORDWERK_RECORD, NOW),
    toListItem(recordWith({ id: "b", reference: "CR-2026-BBBBBB", status: "in_review" }), NOW),
    toListItem(LEGACY_RECORD, NOW),
  ];

  it("counts every application, scoreable or not", () => {
    expect(summarise(items).total).toBe(3);
  });

  it("counts only submitted applications as awaiting review", () => {
    expect(summarise(items).awaitingReview).toBe(2); // Nordwerk and the legacy row
  });

  it("sums the requested volume across every application", () => {
    expect(summarise(items).totalRequestedEur).toBe(1_800_000);
  });

  it("averages the score over SCOREABLE applications only", () => {
    const summary = summarise(items);
    // Two scored at 78, one unscored. Counting the unscored row as zero would give 52.
    expect(summary.averageScore).toBe(78);
    expect(summary.scoredCount).toBe(2);
    expect(summary.unscoredCount).toBe(1);
  });

  it("returns a null average rather than a misleading zero when nothing can be scored", () => {
    const summary = summarise([toListItem(LEGACY_RECORD, NOW)]);
    expect(summary.averageScore).toBeNull();
    expect(summary.scoredCount).toBe(0);
  });

  it("handles an empty book", () => {
    const summary = summarise([]);
    expect(summary).toEqual({
      total: 0,
      awaitingReview: 0,
      totalRequestedEur: 0,
      averageScore: null,
      scoredCount: 0,
      unscoredCount: 0,
    });
  });
});

describe("risk distribution", () => {
  it("always returns all five grades, best to worst", () => {
    const bars = riskDistribution([]);
    expect(bars.map((b) => b.gradeId)).toEqual(["low", "moderate", "elevated", "high", "very-high"]);
    expect(bars.every((b) => b.count === 0)).toBe(true);
  });

  it("counts scored applications into their grade", () => {
    const bars = riskDistribution([toListItem(NORDWERK_RECORD, NOW), toListItem(NORDWERK_RECORD, NOW)]);
    expect(bars.find((b) => b.gradeId === "moderate")?.count).toBe(2);
  });

  it("excludes unscored applications entirely: they have no grade", () => {
    const bars = riskDistribution([toListItem(LEGACY_RECORD, NOW)]);
    expect(bars.reduce((total, bar) => total + bar.count, 0)).toBe(0);
  });

  it("uses the project's risk colour tokens", () => {
    expect(riskDistribution([]).map((b) => b.colorVar)).toEqual([
      "var(--risk-low)",
      "var(--risk-moderate)",
      "var(--risk-elevated)",
      "var(--risk-high)",
      "var(--risk-very-high)",
    ]);
  });
});

/**
 * SECURITY: the applicant's access token must not reach the analyst UI.
 *
 * It is the capability that opens their private status page, so it is excluded at the query
 * itself rather than merely left unrendered. These tests hold that line at both ends: the
 * SELECT the analyst screens run, and the object that is serialised into the page.
 */
describe("the applicant access token never reaches the analyst UI", () => {
  it("is absent from the row the browser receives", () => {
    const item = toListItem(NORDWERK_RECORD, NOW) as unknown as Record<string, unknown>;
    const keys = Object.keys(item);
    expect(keys.some((key) => /token/i.test(key))).toBe(false);
    expect(JSON.stringify(item)).not.toMatch(/token/i);
  });

  it("is absent from the analyst SELECT in the repository", () => {
    // Read as source rather than imported: the repository is server-only and would throw
    // here. This asserts the actual column list the query sends to Postgres.
    const source = readFileSync("src/lib/applications/repository.ts", "utf8");
    const columnList = source.slice(source.indexOf("const ANALYST_COLUMNS"), source.indexOf("].join"));
    expect(columnList).not.toContain("access_token");
    // Sanity check that the slice really is the column list.
    expect(columnList).toContain("company_name");
    expect(columnList).toContain("equity_eur");
  });

  it("is absent from the record type the analyst screens use", () => {
    const source = readFileSync("src/lib/applications/repository.ts", "utf8");
    const iface = source.slice(
      source.indexOf("export interface ApplicationRecord"),
      source.indexOf("const ANALYST_COLUMNS"),
    );
    expect(iface).not.toMatch(/accessToken/);
  });
});
