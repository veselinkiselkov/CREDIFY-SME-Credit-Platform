"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RiskBadge } from "@/components/risk-badge";
import { StatusBadge } from "@/components/status-badge";
import { APPLICATION_STATUSES, STATUS_META } from "@/lib/applications/status";
import { RISK_GRADES } from "@/lib/risk-grades";
import { applyFilters, DEFAULT_FILTERS, type SortField, type TableFilters } from "@/lib/analyst/filters";
import type { AnalystListItem } from "@/lib/analyst/list";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The applications table.
 *
 * This component owns how the controls LOOK. What "sort by score, worst first" actually
 * means lives in lib/analyst/filters.ts as pure functions, which is where the tests point:
 * the interesting bugs in a dashboard are in the comparator, not the markup.
 *
 * Filtering happens in the browser because the whole list is already here - the page is one
 * bank's book, not an infinite feed - and instant filtering demos far better than a round
 * trip per keystroke. If the book ever outgrows a single page, the same pure functions move
 * to the server unchanged.
 */

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground hover:border-muted-foreground/40";

function SortableHeader({
  label,
  field,
  filters,
  onSort,
  align = "left",
}: {
  label: string;
  field: SortField;
  filters: TableFilters;
  onSort: (field: SortField) => void;
  align?: "left" | "right";
}) {
  const active = filters.sortField === field;
  return (
    <th
      scope="col"
      // aria-sort is what tells a screen reader the table is sorted and which way.
      aria-sort={active ? (filters.sortDirection === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-2 font-medium", align === "right" && "text-right")}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <span aria-hidden className={cn("text-[10px]", !active && "opacity-0")}>
          {filters.sortDirection === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}

export function ApplicationsTable({ items }: { items: AnalystListItem[] }) {
  const [filters, setFilters] = useState<TableFilters>(DEFAULT_FILTERS);

  const visible = useMemo(() => applyFilters(items, filters), [items, filters]);

  function handleSort(field: SortField) {
    setFilters((current) => ({
      ...current,
      sortField: field,
      // Clicking the active column flips direction; a new column starts descending,
      // which is what an analyst wants first for a score, an amount or a date.
      sortDirection: current.sortField === field && current.sortDirection === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <div>
      {/* Controls sit in one row above the table, in the order they are usually reached. */}
      <div className="flex flex-wrap items-end gap-3 pb-4">
        <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
          <label htmlFor="analyst-search" className="text-sm font-medium">
            Search
          </label>
          <input
            id="analyst-search"
            type="search"
            value={filters.search}
            onChange={(event) => setFilters((c) => ({ ...c, search: event.target.value }))}
            placeholder="Company name or reference"
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm placeholder:text-muted-foreground/70 hover:border-muted-foreground/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="analyst-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="analyst-status"
            value={filters.status}
            onChange={(event) => setFilters((c) => ({ ...c, status: event.target.value as TableFilters["status"] }))}
            className={SELECT_CLASS}
          >
            <option value="all">All statuses</option>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="analyst-grade" className="text-sm font-medium">
            Risk grade
          </label>
          <select
            id="analyst-grade"
            value={filters.grade}
            onChange={(event) => setFilters((c) => ({ ...c, grade: event.target.value as TableFilters["grade"] }))}
            className={SELECT_CLASS}
          >
            <option value="all">All grades</option>
            {RISK_GRADES.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.label}
              </option>
            ))}
            {/* Not a grade, but a real thing to go looking for. */}
            <option value="unscored">Unscored</option>
          </select>
        </div>
      </div>

      <p className="pb-2 text-sm text-muted-foreground" role="status">
        Showing {visible.length} of {items.length} application{items.length === 1 ? "" : "s"}
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead className="border-b border-border text-left text-[13px]">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                Reference
              </th>
              <SortableHeader label="Company" field="companyName" filters={filters} onSort={handleSort} />
              <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                Industry
              </th>
              <SortableHeader
                label="Requested"
                field="loanAmountEur"
                filters={filters}
                onSort={handleSort}
                align="right"
              />
              <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                Purpose
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                Status
              </th>
              <SortableHeader label="Score" field="score" filters={filters} onSort={handleSort} align="right" />
              <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                Risk grade
              </th>
              <SortableHeader label="Submitted" field="submittedAt" filters={filters} onSort={handleSort} />
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {visible.map((item) => {
              const grade = RISK_GRADES.find((g) => g.id === item.gradeId);
              return (
                <tr key={item.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-3 py-2.5">
                    {/* The link carries the internal id, never the applicant's access token. */}
                    <Link
                      href={`/analyst/applications/${item.id}`}
                      className="font-medium tabular-nums text-primary underline-offset-4 hover:underline"
                    >
                      {item.reference}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{item.companyName}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{item.industryLabel}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {item.loanAmountEur === null ? "—" : formatEur(item.loanAmountEur)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{item.loanPurposeLabel}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {item.scored ? (
                      <span className="font-medium">{item.score}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {grade ? (
                      <span className="inline-flex items-center gap-1.5">
                        <RiskBadge grade={grade} />
                        {/* The cap is never left to colour alone. */}
                        {item.gradeCapped && (
                          <span
                            title="Grade capped by a critical flag"
                            className="rounded border border-risk-high px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            Capped
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="rounded border border-input px-1.5 py-0.5 text-[12px] text-muted-foreground">
                        Incomplete data
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {new Date(item.submittedAt).toLocaleDateString("en-IE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </td>
                </tr>
              );
            })}

            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                  No applications match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
