import { cn } from "@/lib/utils";
import { STATUS_META, type ApplicationStatus } from "@/lib/applications/status";

/**
 * Shows an application's status as a coloured dot plus dark text.
 *
 * Built to match RiskBadge deliberately: an applicant and an analyst looking at the same
 * platform should recognise the same visual grammar. As there, the text carries the
 * meaning and the colour only reinforces it, so the badge still works in greyscale and for
 * colour-blind users.
 */
export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[13px] font-medium text-foreground",
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", meta.dotClass)} />
      {meta.label}
    </span>
  );
}
