import { cn } from "@/lib/utils";

/**
 * The building blocks of the borrower page.
 *
 * A section is a ruled heading plus content, matching the landing page's use of a rule
 * above a block. Figures are laid out as definition lists rather than tables, because each
 * one is a label and a value rather than a row in a grid - and a screen reader announces
 * the pairing correctly.
 */

export function Section({
  title,
  description,
  children,
  className,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("border-t-2 border-foreground pt-5", className)}>
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export interface Figure {
  label: string;
  value: string;
  /** Rendered in muted text under the value, e.g. "Not collected by the form". */
  note?: string;
}

/** A two-column list of reported figures. Values are right-aligned and tabular. */
export function FigureList({ figures, columns = 2 }: { figures: Figure[]; columns?: 1 | 2 }) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-0", columns === 2 ? "sm:grid-cols-2" : "")}>
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0"
        >
          <dt className="text-sm text-muted-foreground">{figure.label}</dt>
          <dd className="text-right text-[15px] tabular-nums">
            {figure.value}
            {figure.note && <span className="block text-[12px] text-muted-foreground">{figure.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
