import { formatEur } from "@/lib/format";
import type { PortfolioSummary } from "@/lib/analyst/list";

/**
 * The four numbers an analyst wants before they open anything.
 *
 * The average-score card is the one that needed thought. An application missing a required
 * figure has no score, and averaging it in as a zero would drag the portfolio's apparent
 * quality down for a reason that has nothing to do with credit. Unscored applications are
 * therefore excluded from the mean and the card states its own denominator, so the number
 * is never quietly computed over a different population than the analyst assumes.
 */
function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {note && <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{note}</p>}
    </div>
  );
}

export function KpiCards({ summary }: { summary: PortfolioSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        label="Total applications"
        value={String(summary.total)}
        note={
          summary.unscoredCount > 0
            ? `${summary.unscoredCount} cannot be scored yet`
            : "All have complete figures"
        }
      />
      <Card
        label="Awaiting review"
        value={String(summary.awaitingReview)}
        note="Submitted and not yet picked up"
      />
      <Card
        label="Requested volume"
        value={formatEur(summary.totalRequestedEur)}
        note="Across every application in the list"
      />
      <Card
        label="Average credit score"
        value={summary.averageScore === null ? "—" : `${summary.averageScore} / 100`}
        note={
          summary.averageScore === null
            ? "No application has complete figures yet"
            : `Mean of the ${summary.scoredCount} scored application${summary.scoredCount === 1 ? "" : "s"}`
        }
      />
    </div>
  );
}
