import Link from "next/link";
import { Container } from "@/components/layout/container";
import { RiskScale } from "@/components/risk-scale";
import { MODEL_DISCLAIMER, RISK_GRADES } from "@/lib/risk-grades";
import { cn } from "@/lib/utils";

export function RiskGradesSection() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-semibold tracking-tight">Five risk grades</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            The 100-point score maps to a grade. The grade tells the analyst where to focus, not what to decide.
          </p>
        </div>

        <RiskScale showRanges className="mt-12" />

        <dl className="mt-12 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
          {RISK_GRADES.map((g) => (
            <div key={g.id}>
              <dt className="flex items-center gap-2 font-medium">
                <span aria-hidden className={cn("size-2.5 rounded-full", g.swatchClass)} />
                {g.label}
                <span className="text-sm font-normal tabular-nums text-muted-foreground">
                  {g.minScore}–{g.maxScore}
                </span>
              </dt>
              <dd className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{g.meaning}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 max-w-3xl border-l-2 border-primary pl-5">
          <p className="leading-relaxed">{MODEL_DISCLAIMER}</p>
          <Link href="/methodology" className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
            Read how the scorecard works
          </Link>
        </div>
      </Container>
    </section>
  );
}
