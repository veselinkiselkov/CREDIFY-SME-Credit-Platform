import type { ApplicationStatus } from "@/lib/applications/status";
import type { RiskGradeId } from "@/lib/risk-grades";
import type { AnalystListItem } from "./list";

/**
 * FILTERING AND SORTING, as pure functions.
 *
 * Kept out of the React component on purpose. The table component decides how a control
 * looks; this file decides what "sort by score, worst first" actually means, and it can be
 * tested directly with a plain array - no rendering, no DOM, no test framework for the UI.
 * The interesting bugs in a dashboard live here, not in the markup.
 */

export type SortField = "submittedAt" | "score" | "loanAmountEur" | "companyName";
export type SortDirection = "asc" | "desc";

export interface TableFilters {
  /** Matched against company name and reference, case-insensitively. */
  search: string;
  status: ApplicationStatus | "all";
  /** "unscored" is offered alongside the five grades: it is a real thing to look for. */
  grade: RiskGradeId | "all" | "unscored";
  sortField: SortField;
  sortDirection: SortDirection;
}

export const DEFAULT_FILTERS: TableFilters = {
  search: "",
  status: "all",
  grade: "all",
  sortField: "submittedAt",
  sortDirection: "desc",
};

export function matchesSearch(item: AnalystListItem, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (needle === "") return true;
  return (
    item.companyName.toLowerCase().includes(needle) || item.reference.toLowerCase().includes(needle)
  );
}

function matchesGrade(item: AnalystListItem, grade: TableFilters["grade"]): boolean {
  if (grade === "all") return true;
  if (grade === "unscored") return !item.scored;
  return item.gradeId === grade;
}

/**
 * Compares two rows on the chosen field.
 *
 * Rows with no value always sink to the bottom, whichever direction is chosen. An
 * application that cannot be scored has no score, and letting a null sort as though it were
 * zero would plant unscoreable rows among the worst credits - which is precisely the wrong
 * reading. They are not bad; they are unknown, and they belong at the end of the list
 * either way.
 */
function compare(a: AnalystListItem, b: AnalystListItem, field: SortField, direction: SortDirection): number {
  const factor = direction === "asc" ? 1 : -1;

  if (field === "companyName") {
    return a.companyName.localeCompare(b.companyName) * factor;
  }
  if (field === "submittedAt") {
    return (Date.parse(a.submittedAt) - Date.parse(b.submittedAt)) * factor;
  }

  const left = field === "score" ? a.score : a.loanAmountEur;
  const right = field === "score" ? b.score : b.loanAmountEur;

  if (left === null && right === null) return 0;
  if (left === null) return 1; // nulls last, regardless of direction
  if (right === null) return -1;
  return (left - right) * factor;
}

/** Applies the filters and the sort. Returns a new array; the input is never mutated. */
export function applyFilters(items: AnalystListItem[], filters: TableFilters): AnalystListItem[] {
  return items
    .filter(
      (item) =>
        matchesSearch(item, filters.search) &&
        (filters.status === "all" || item.status === filters.status) &&
        matchesGrade(item, filters.grade),
    )
    .slice()
    .sort((a, b) => compare(a, b, filters.sortField, filters.sortDirection));
}
