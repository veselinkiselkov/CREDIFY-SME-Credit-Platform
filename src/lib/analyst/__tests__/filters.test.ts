import { describe, expect, it } from "vitest";
import { applyFilters, DEFAULT_FILTERS, matchesSearch, type TableFilters } from "../filters";
import type { AnalystListItem } from "../list";

/**
 * FILTERING AND SORTING.
 *
 * These are the functions the table component calls. Testing them here rather than through
 * the rendered table is the point of keeping them separate: the comparator is where a
 * dashboard's real bugs live, and it needs no DOM to exercise.
 */

function item(overrides: Partial<AnalystListItem>): AnalystListItem {
  return {
    id: "id-1",
    reference: "CR-2026-AAAAAA",
    companyName: "Alpha GmbH",
    industry: "manufacturing",
    industryLabel: "Manufacturing",
    loanAmountEur: 100_000,
    loanPurposeLabel: "Equipment or machinery",
    status: "submitted",
    submittedAt: "2026-05-01T00:00:00Z",
    scored: true,
    score: 70,
    gradeId: "moderate",
    gradeLabel: "Moderate",
    gradeCapped: false,
    criticalFlagCount: 0,
    missingCount: 0,
    ...overrides,
  };
}

const alpha = item({ id: "a", companyName: "Alpha GmbH", reference: "CR-2026-AAAAAA", score: 85, gradeId: "low", loanAmountEur: 500_000, submittedAt: "2026-05-03T00:00:00Z" });
const beta = item({ id: "b", companyName: "Beta AG", reference: "CR-2026-BBBBBB", score: 55, gradeId: "elevated", status: "in_review", loanAmountEur: 100_000, submittedAt: "2026-05-01T00:00:00Z" });
const gamma = item({ id: "c", companyName: "Gamma KG", reference: "CR-2026-CCCCCC", score: null, gradeId: null, scored: false, missingCount: 2, loanAmountEur: null, submittedAt: "2026-05-02T00:00:00Z" });

const all = [alpha, beta, gamma];

function withFilters(overrides: Partial<TableFilters>): TableFilters {
  return { ...DEFAULT_FILTERS, ...overrides };
}

describe("search", () => {
  it("matches on company name, ignoring case", () => {
    expect(matchesSearch(alpha, "alpha")).toBe(true);
    expect(matchesSearch(alpha, "ALPHA")).toBe(true);
    expect(matchesSearch(alpha, "beta")).toBe(false);
  });

  it("matches on reference", () => {
    expect(matchesSearch(beta, "CR-2026-BBBBBB")).toBe(true);
    expect(matchesSearch(beta, "bbbb")).toBe(true);
  });

  it("matches a partial company name", () => {
    expect(matchesSearch(gamma, "amma")).toBe(true);
  });

  it("treats an empty or whitespace-only search as no filter", () => {
    expect(matchesSearch(alpha, "")).toBe(true);
    expect(matchesSearch(alpha, "   ")).toBe(true);
  });

  it("filters the list down", () => {
    expect(applyFilters(all, withFilters({ search: "beta" })).map((i) => i.id)).toEqual(["b"]);
  });
});

describe("status and grade filters", () => {
  it("filters by status", () => {
    expect(applyFilters(all, withFilters({ status: "in_review" })).map((i) => i.id)).toEqual(["b"]);
  });

  it("filters by risk grade", () => {
    expect(applyFilters(all, withFilters({ grade: "low" })).map((i) => i.id)).toEqual(["a"]);
  });

  it("filters to unscored applications, which are not a grade", () => {
    expect(applyFilters(all, withFilters({ grade: "unscored" })).map((i) => i.id)).toEqual(["c"]);
  });

  it("'all' leaves everything in", () => {
    expect(applyFilters(all, withFilters({})).length).toBe(3);
  });

  it("combines filters", () => {
    const result = applyFilters(all, withFilters({ status: "submitted", grade: "low" }));
    expect(result.map((i) => i.id)).toEqual(["a"]);
  });

  it("returns an empty list when nothing matches, rather than everything", () => {
    expect(applyFilters(all, withFilters({ search: "nothing here" }))).toEqual([]);
  });
});

describe("sorting", () => {
  it("sorts by score, highest first", () => {
    expect(applyFilters(all, withFilters({ sortField: "score", sortDirection: "desc" })).map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("sorts by score, lowest first", () => {
    expect(applyFilters(all, withFilters({ sortField: "score", sortDirection: "asc" })).map((i) => i.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("keeps unscored rows at the BOTTOM in both directions", () => {
    // A null score must not sort as zero: an unscoreable application is unknown, not bad,
    // and planting it among the worst credits would be exactly the wrong reading.
    const desc = applyFilters(all, withFilters({ sortField: "score", sortDirection: "desc" }));
    const asc = applyFilters(all, withFilters({ sortField: "score", sortDirection: "asc" }));
    expect(desc[desc.length - 1].id).toBe("c");
    expect(asc[asc.length - 1].id).toBe("c");
  });

  it("keeps rows with no requested amount at the bottom too", () => {
    const asc = applyFilters(all, withFilters({ sortField: "loanAmountEur", sortDirection: "asc" }));
    expect(asc.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by requested amount, largest first", () => {
    expect(
      applyFilters(all, withFilters({ sortField: "loanAmountEur", sortDirection: "desc" })).map((i) => i.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("sorts by company name alphabetically", () => {
    expect(
      applyFilters(all, withFilters({ sortField: "companyName", sortDirection: "asc" })).map((i) => i.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("sorts by submitted date, newest first by default", () => {
    expect(applyFilters(all, DEFAULT_FILTERS).map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the array it was given", () => {
    const input = [...all];
    applyFilters(input, withFilters({ sortField: "score", sortDirection: "asc" }));
    expect(input.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("handles an empty list", () => {
    expect(applyFilters([], DEFAULT_FILTERS)).toEqual([]);
  });
});
