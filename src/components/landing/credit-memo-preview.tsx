import { RiskBadge } from "@/components/risk-badge";
import { RiskScale } from "@/components/risk-scale";
import { MODEL_VERSION } from "@/lib/risk-grades";
import { NORDWERK_PREVIEW as n, NORDWERK_SCORE } from "@/lib/sample/nordwerk-preview";

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/**
 * A static excerpt of the analyst's scorecard for the fictional Nordwerk example.
 * The hero shows the product itself: what an analyst actually sees.
 */
export function CreditMemoPreview() {
  return (
    <figure className="rounded-lg border border-border bg-card shadow-[0_1px_0_rgba(21,33,43,0.04),0_12px_32px_-12px_rgba(21,33,43,0.18)]">
      <div className="h-1 rounded-t-lg bg-primary" aria-hidden />

      <div className="p-5 sm:p-7">
        <p className="font-medium">{n.company}</p>
        <p className="text-sm text-muted-foreground">
          {n.industry}, {n.yearsInBusiness} years trading. Requests {eur.format(n.loanAmountEur)} over{" "}
          {n.loanTermMonths} months.
        </p>

        <div className="mt-6 flex items-end justify-between gap-4">
          <p className="font-display font-semibold leading-none tabular-nums">
            <span className="text-6xl tracking-tight">{NORDWERK_SCORE}</span>
            <span className="ml-1 text-xl text-muted-foreground">/ 100</span>
          </p>
          <RiskBadge score={NORDWERK_SCORE} className="mb-1" />
        </div>

        <RiskScale score={NORDWERK_SCORE} className="mt-5" />

        <h2 className="mt-7 text-sm font-medium">How the score is built</h2>
        <ul className="mt-2 divide-y divide-border/70">
          {n.factors.map((f, i) => (
            <li
              key={f.label}
              className="grid grid-cols-[minmax(0,1fr)_4.5rem_2.75rem] items-center gap-x-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_3.5rem_5.5rem_2.75rem]"
            >
              <span className="truncate text-[13px]">{f.label}</span>
              <span className="hidden text-right text-[13px] tabular-nums text-muted-foreground sm:block">{f.value}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span
                  className="bar-fill block h-full rounded-full bg-primary"
                  style={{ width: `${(f.points / f.maxPoints) * 100}%`, animationDelay: `${150 + i * 60}ms` }}
                />
              </span>
              <span className="text-right text-[13px] tabular-nums">
                <span className="font-medium">{f.points}</span>
                <span className="text-muted-foreground">/{f.maxPoints}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-md border-l-2 border-risk-elevated bg-muted/60 px-3.5 py-2.5 text-[13px] leading-relaxed">
          <span className="font-medium">Point to watch:</span> the requested loan raises debt from {n.leverageBefore} to{" "}
          {n.leverageAfter} EBITDA.
        </div>
      </div>

      <figcaption className="border-t border-border px-5 py-3 text-xs text-muted-foreground sm:px-7">
        Fictional company. Illustrative scorecard {MODEL_VERSION}, not a real underwriting model.
      </figcaption>
    </figure>
  );
}
