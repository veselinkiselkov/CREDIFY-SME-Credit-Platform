import { RATIO_MEANINGS } from "@/lib/analyst/ratio-meanings";
import type { FactorResult, RatioResult } from "@/lib/credit";
import { cn } from "@/lib/utils";

/**
 * The ratios, with what each one means.
 *
 * SCORED ratios carry a risk indicator derived from how many of the factor's points they
 * earned. DISPLAY-ONLY ratios deliberately carry none: they have no band and no points, so
 * inventing a colour for them would imply a judgement the model has not made. They are
 * marked "Not scored" instead, which is the honest signal and doubles as an explanation of
 * why return on equity is sitting there without a verdict.
 *
 * Colour is never the only signal. Every scored ratio prints its points as "14 / 25" and
 * its band beside the dot, so the row reads identically in greyscale.
 */

/** Maps a factor's share of its maximum onto the project's risk colour tokens. */
function indicatorClass(share: number): string {
  if (share >= 0.8) return "bg-risk-low";
  if (share >= 0.6) return "bg-risk-moderate";
  if (share >= 0.4) return "bg-risk-elevated";
  if (share >= 0.2) return "bg-risk-high";
  return "bg-risk-very-high";
}

function Row({
  label,
  value,
  meaning,
  scoring,
  note,
}: {
  label: string;
  value: string;
  meaning: string;
  /** Present only for scored ratios. */
  scoring?: { share: number; points: number; maxPoints: number; band: string };
  note?: string;
}) {
  return (
    <li className="grid gap-x-6 gap-y-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          {scoring ? (
            <span aria-hidden className={cn("size-2 shrink-0 translate-y-[-1px] rounded-full", indicatorClass(scoring.share))} />
          ) : (
            <span aria-hidden className="size-2 shrink-0 translate-y-[-1px] rounded-full border border-input" />
          )}
          <span className="font-medium">{label}</span>
        </div>
        <p className="mt-0.5 pl-4 text-[13px] leading-relaxed text-muted-foreground">{meaning}</p>
        {note && <p className="mt-0.5 pl-4 text-[13px] leading-relaxed text-muted-foreground">{note}</p>}
      </div>

      <div className="pl-4 text-left tabular-nums sm:pl-0 sm:text-right">
        <p className="text-[17px] font-medium">{value}</p>
        {scoring ? (
          <p className="text-[13px] text-muted-foreground">
            {scoring.points} / {scoring.maxPoints} pts · {scoring.band}
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground">Not scored</p>
        )}
      </div>
    </li>
  );
}

export function ScoredRatioList({ factors }: { factors: FactorResult[] }) {
  return (
    <ul>
      {factors.map((factor) => (
        <Row
          key={factor.id}
          label={factor.ratio.label}
          value={factor.ratio.display}
          meaning={RATIO_MEANINGS[factor.id]}
          note={factor.ratio.note}
          scoring={{
            share: factor.share,
            points: factor.points,
            maxPoints: factor.maxPoints,
            band: factor.band,
          }}
        />
      ))}
    </ul>
  );
}

export function DisplayRatioList({ ratios }: { ratios: RatioResult[] }) {
  return (
    <ul>
      {ratios.map((ratio) => (
        <Row
          key={ratio.id}
          label={ratio.label}
          value={ratio.display}
          meaning={RATIO_MEANINGS[ratio.id]}
          note={ratio.note}
        />
      ))}
    </ul>
  );
}
