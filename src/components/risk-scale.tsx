import { cn } from "@/lib/utils";
import { riskScaleSegments } from "@/lib/risk-grades";

interface RiskScaleProps {
  /** Optional score (0-100) to mark on the scale. */
  score?: number;
  /** Show each grade's label and score range underneath. */
  showRanges?: boolean;
  className?: string;
}

/**
 * The 0-100 risk scale: Credify's signature visual element.
 * Segment widths match the score ranges, so a marker at 78 sits exactly 78% along.
 * Worst risk is on the left, best on the right, the same direction as the score.
 */
export function RiskScale({ score, showRanges = false, className }: RiskScaleProps) {
  const segments = riskScaleSegments();
  const description =
    "Risk scale: " +
    segments.map((s) => `${s.grade.label} ${s.grade.minScore} to ${s.grade.maxScore}`).join(", ") +
    (score !== undefined ? `. Marked score: ${score}.` : ".");

  return (
    <div className={cn("w-full", className)}>
      <div role="img" aria-label={description} className="relative pt-3">
        {score !== undefined && (
          <span
            aria-hidden
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${Math.min(100, Math.max(0, score))}%` }}
          >
            <svg width="10" height="8" viewBox="0 0 10 8" className="fill-foreground">
              <path d="M0 0h10L5 8z" />
            </svg>
          </span>
        )}
        <div className={cn("flex gap-0.5 overflow-hidden rounded-full", showRanges ? "h-3" : "h-2")}>
          {segments.map(({ grade, widthPercent }) => (
            <span key={grade.id} className={grade.swatchClass} style={{ width: `${widthPercent}%` }} />
          ))}
        </div>
      </div>

      {showRanges && (
        <div className="mt-3 flex gap-0.5">
          {segments.map(({ grade, widthPercent }) => (
            <div key={grade.id} style={{ width: `${widthPercent}%` }} className="min-w-0 pr-1">
              <p className="truncate text-[13px] font-medium sm:text-sm">{grade.label}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {grade.minScore}–{grade.maxScore}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
