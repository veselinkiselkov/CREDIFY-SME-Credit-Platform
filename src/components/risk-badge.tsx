import { cn } from "@/lib/utils";
import { gradeForScore, type RiskGrade } from "@/lib/risk-grades";

interface RiskBadgeProps {
  /** Pass either a grade or a score; the badge works out the grade from the score. */
  grade?: RiskGrade;
  score?: number;
  className?: string;
}

/**
 * Shows a risk grade as a coloured dot plus dark text.
 * The text stays dark on white so it is readable for everyone; the colour only reinforces it.
 * Colour is never the only signal, which matters for colour-blind users.
 */
export function RiskBadge({ grade, score, className }: RiskBadgeProps) {
  const resolved = grade ?? gradeForScore(score ?? 0);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[13px] font-medium text-foreground",
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", resolved.swatchClass)} />
      {resolved.label} risk
    </span>
  );
}
