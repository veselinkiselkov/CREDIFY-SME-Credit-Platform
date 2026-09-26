import type { CriticalFlag, DataQualityWarning } from "@/lib/credit";

/**
 * The three lists of findings, kept visually and conceptually apart.
 *
 *   CRITICAL FLAGS  cap the grade. They are about credit risk.
 *   STRENGTHS/RISKS explain the score. They are about credit risk.
 *   DATA QUALITY    questions the figures. It is NOT about credit risk and changes no points.
 *
 * Every sentence on this screen is generated deterministically by the Day 3 engine from the
 * borrower's own numbers - templates filled with calculated values, never AI-written text.
 * The analyst can check each one against the figure beside it.
 */

export function CriticalFlags({ flags }: { flags: CriticalFlag[] }) {
  if (flags.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3">
        <span aria-hidden className="size-2 rounded-full bg-risk-low" />
        <p className="text-[15px]">No critical risk flags.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border-2 border-risk-very-high bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="font-medium">
          {flags.length} critical risk flag{flags.length === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          The risk grade is held at no better than <span className="font-medium text-foreground">High</span> while any
          of these is present.{" "}
          <span className="font-medium text-foreground">This is not a rejection.</span> The scorecard cannot see a
          guarantee, security, a signed contract or an owner injecting capital, so it declines to call the case low
          risk and leaves the decision to the analyst.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {flags.map((flag) => (
          <li key={flag.id} className="flex gap-3 px-4 py-3">
            <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-risk-very-high" />
            <div>
              <p className="font-medium">{flag.label}</p>
              <p className="mt-0.5 text-[15px] leading-relaxed text-muted-foreground">{flag.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Narrative({ strengths, risks }: { strengths: string[]; risks: string[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-md border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className="size-2 rounded-full bg-risk-low" />
          Strengths
          <span className="text-muted-foreground">({strengths.length})</span>
        </h3>
        {strengths.length === 0 ? (
          <p className="mt-3 text-[15px] text-muted-foreground">No factor scored 80% or more of its maximum.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {strengths.map((sentence) => (
              <li key={sentence} className="text-[15px] leading-relaxed">
                {sentence}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className="size-2 rounded-full bg-risk-high" />
          Risk factors
          <span className="text-muted-foreground">({risks.length})</span>
        </h3>
        {risks.length === 0 ? (
          <p className="mt-3 text-[15px] text-muted-foreground">No factor scored 40% or less of its maximum.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {risks.map((sentence) => (
              <li key={sentence} className="text-[15px] leading-relaxed">
                {sentence}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function DataQuality({ warnings }: { warnings: DataQualityWarning[] }) {
  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3">
        <span aria-hidden className="size-2 rounded-full bg-risk-low" />
        <p className="text-[15px]">The reported figures are internally consistent.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-risk-elevated bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="font-medium">
          {warnings.length} question{warnings.length === 1 ? "" : "s"} about the reported figures
        </p>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          These concern the <span className="font-medium text-foreground">data</span>, not the credit.{" "}
          <span className="font-medium text-foreground">None of them changes the score.</span> A balance sheet that
          does not balance is usually a typing error rather than a solvency problem, so it is raised for the analyst
          to query rather than scored as risk.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {warnings.map((warning) => (
          <li key={warning.id} className="flex gap-3 px-4 py-3">
            <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-risk-elevated" />
            <div>
              <p className="font-medium">{warning.label}</p>
              <p className="mt-0.5 text-[15px] leading-relaxed text-muted-foreground">{warning.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
