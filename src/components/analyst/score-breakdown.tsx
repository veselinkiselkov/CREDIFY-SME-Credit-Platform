import type { CreditAssessment } from "@/lib/credit";
import { MAX_SCORE } from "@/lib/credit";

/**
 * WHY THIS COMPANY SCORED WHAT IT SCORED.
 *
 * The screen an analyst uses to answer "why 78 and not 85?" without asking anyone. Each row
 * shows the measured value, the band it fell into, the points it earned, and - the column
 * that actually answers the question - the points it gave up against that factor's maximum.
 *
 * Reading the "Forgone" column top to bottom accounts for every missing point. For
 * Nordwerk: 11 on leverage, 3 on liquidity, 4 on profitability, 2 on capital structure,
 * 1 on revenue trend, 1 on loan size. That is the 22 points between 78 and 100, itemised.
 */
export function ScoreBreakdown({ assessment }: { assessment: CreditAssessment }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="border-b border-border text-left text-[13px] text-muted-foreground">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">
              Factor
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Measured
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Band
            </th>
            <th scope="col" className="px-3 py-2 font-medium" style={{ width: "22%" }}>
              Share of maximum
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Points
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">
              Forgone
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {assessment.factors.map((factor) => {
            const forgone = factor.maxPoints - factor.points;
            return (
              <tr key={factor.id}>
                <td className="py-2.5 pr-3 font-medium">{factor.label}</td>
                <td className="px-3 py-2.5 tabular-nums">{factor.ratio.display}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{factor.band}</td>
                <td className="px-3 py-2.5">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${Math.round(factor.share * 100)}%` }}
                    />
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span className="font-medium">{factor.points}</span>
                  <span className="text-muted-foreground">/{factor.maxPoints}</span>
                </td>
                <td className="py-2.5 pl-3 text-right tabular-nums text-muted-foreground">
                  {forgone === 0 ? "—" : `−${forgone}`}
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot className="border-t-2 border-foreground">
          <tr>
            <td className="py-3 pr-3 font-medium" colSpan={4}>
              Total
            </td>
            <td className="px-3 py-3 text-right font-display text-lg font-semibold tabular-nums">
              {assessment.score}
              <span className="text-muted-foreground">/{MAX_SCORE}</span>
            </td>
            <td className="py-3 pl-3 text-right tabular-nums text-muted-foreground">
              {MAX_SCORE - assessment.score === 0 ? "—" : `−${MAX_SCORE - assessment.score}`}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
