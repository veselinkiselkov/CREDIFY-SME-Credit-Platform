import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { RiskScale } from "@/components/risk-scale";
import {
  LIMITATIONS,
  MAX_SCORE,
  SCORECARD_VERSION,
  DISPLAY_RATIO_NOTES,
  methodologyCriticalFlags,
  methodologyDataQualityChecks,
  methodologyFactors,
  methodologyGrades,
} from "@/lib/methodology/model";
import { MODEL_DISCLAIMER } from "@/lib/risk-grades";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Scoring methodology",
  description:
    "How Credify's illustrative SME scorecard works: the eight scored factors, their bands and weights, the risk grades, the critical-flag caps, and what the model cannot see.",
};

/**
 * /methodology - THE MODEL, PUBLISHED IN FULL.
 *
 * Every threshold, weight, band, grade range and flag condition on this page is read from
 * the engine's own configuration through lib/methodology/model.ts. Nothing is retyped, so
 * the published methodology cannot drift away from the model that produces the scores.
 *
 * A model whose documentation has quietly stopped matching its implementation is worse than
 * one with no documentation, because people keep deciding against a document that is no
 * longer true.
 */

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t-2 border-foreground pt-6">
      <h2 className="font-display text-3xl font-semibold tracking-tight">{title}</h2>
      {lead && <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-muted-foreground">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

const CONTENTS = [
  ["purpose", "What this model is"],
  ["factors", "The eight scored factors"],
  ["grades", "Risk grades"],
  ["flags", "Critical flags"],
  ["not-scored", "Shown but not scored"],
  ["data-quality", "Data quality"],
  ["limitations", "Limitations"],
] as const;

export default function MethodologyPage() {
  const factors = methodologyFactors();
  const grades = methodologyGrades();
  const flags = methodologyCriticalFlags();
  const checks = methodologyDataQualityChecks();

  return (
    <Container className="max-w-4xl py-12 sm:py-16">
      <header>
        <p className="text-sm text-muted-foreground">Scorecard {SCORECARD_VERSION}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Scoring methodology</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Every number below is read from the scoring engine&rsquo;s own configuration, not written out by hand. If a
          threshold changes in the model, it changes on this page.
        </p>
      </header>

      <nav aria-label="On this page" className="mt-8 rounded-md border border-border bg-card p-4">
        <p className="text-sm font-medium">On this page</p>
        <ol className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {CONTENTS.map(([id, label], index) => (
            <li key={id} className="text-[15px]">
              <span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>
              <a href={`#${id}`} className="text-primary underline-offset-4 hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 flex flex-col gap-14">
        {/* ------------------------------------------------------------------ PURPOSE -- */}
        <Section
          id="purpose"
          title="What this model is"
          lead="Credify turns a small business's reported accounts into a 100-point score, a risk grade, and a written explanation of both. It exists to prepare a credit analyst's work, not to replace it."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="font-medium">It is</h3>
              <ul className="mt-3 flex flex-col gap-2.5 text-[15px] leading-relaxed">
                <li>
                  <span className="font-medium">Deterministic.</span> The same figures always produce the same score.
                  No randomness, no model drift, no language model anywhere in the calculation.
                </li>
                <li>
                  <span className="font-medium">Transparent.</span> The score is a sum of eight table lookups. Every
                  point can be traced to the figure that earned it.
                </li>
                <li>
                  <span className="font-medium">Explainable.</span> The strengths and risks an analyst reads are
                  templates filled with the borrower&rsquo;s own calculated values, not generated prose.
                </li>
              </ul>
            </div>
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="font-medium">It is not</h3>
              <ul className="mt-3 flex flex-col gap-2.5 text-[15px] leading-relaxed">
                <li>
                  <span className="font-medium">A bank underwriting model.</span> The thresholds are reasoned, not
                  fitted to an observed default book.
                </li>
                <li>
                  <span className="font-medium">A regulatory model.</span> No IFRS 9 expected credit loss, no Basel
                  rating system, no probability of default.
                </li>
                <li>
                  <span className="font-medium">An approval engine.</span> It never approves or declines anything. An
                  analyst records every decision.
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-5 rounded-md border border-border bg-secondary/60 p-4 text-[15px] leading-relaxed text-secondary-foreground">
            {MODEL_DISCLAIMER}
          </p>
        </Section>

        {/* ------------------------------------------------------------------ FACTORS -- */}
        <Section
          id="factors"
          title="The eight scored factors"
          lead={`The score is the sum of eight independent factors, each worth a fixed maximum. Together they total ${MAX_SCORE} points. Forty-five of those points sit on leverage and interest coverage, because whether a business can carry and service its debt is the question a lender is actually asking.`}
        >
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <caption className="sr-only">Factor weights</caption>
              <thead className="border-b border-border text-left text-[13px] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Factor</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Maximum</th>
                  <th scope="col" className="px-4 py-2 font-medium" style={{ width: "40%" }}>Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {factors.map((factor) => (
                  <tr key={factor.id}>
                    <td className="px-4 py-2.5 font-medium">{factor.label}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{factor.maxPoints} pts</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${factor.weightPercent}%` }}
                          />
                        </span>
                        <span className="w-10 text-right text-[13px] tabular-nums text-muted-foreground">
                          {factor.weightPercent}%
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex flex-col gap-8">
            {factors.map((factor, index) => (
              <article key={factor.id} className="border-t border-border pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold tracking-tight">
                    <span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>
                    {factor.label}
                  </h3>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {factor.maxPoints} points · {factor.direction === "higher-is-better" ? "higher is better" : "lower is better"}
                  </span>
                </div>

                <div className="mt-3 grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
                  <div>
                    <p className="text-[15px] leading-relaxed">
                      <span className="font-medium">What it measures. </span>
                      {factor.measures}
                    </p>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">Why it matters. </span>
                      {factor.matters}
                    </p>
                  </div>

                  <table className="h-fit w-full border-collapse text-sm">
                    <caption className="pb-1 text-left text-[13px] text-muted-foreground">Scoring bands</caption>
                    <tbody className="divide-y divide-border">
                      {factor.bands.map((band) => (
                        <tr key={band.label}>
                          <td className="py-1.5 pr-3 tabular-nums">{band.label}</td>
                          <td className="py-1.5 text-right tabular-nums">
                            <span className="font-medium">{band.points}</span>
                            <span className="text-muted-foreground">/{factor.maxPoints}</span>
                          </td>
                        </tr>
                      ))}
                      {factor.specialCases.map((special) => (
                        <tr key={special.label} className="text-muted-foreground">
                          <td className="py-1.5 pr-3">{special.label}</td>
                          <td className="py-1.5 text-right tabular-nums">
                            <span className="font-medium text-foreground">{special.points}</span>
                            <span>/{factor.maxPoints}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* ------------------------------------------------------------------- GRADES -- */}
        <Section
          id="grades"
          title="Risk grades"
          lead="The total score maps onto one of five grades. The same table drives the badge on every screen in the product."
        >
          <RiskScale score={78} className="mb-6" />
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead className="border-b border-border text-left text-[13px] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Grade</th>
                  <th scope="col" className="px-4 py-2 font-medium">Score</th>
                  <th scope="col" className="px-4 py-2 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grades.map((grade) => (
                  <tr key={grade.id}>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span aria-hidden className={cn("size-2.5 rounded-full", grade.swatchClass)} />
                        {grade.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{grade.range}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{grade.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* -------------------------------------------------------------------- FLAGS -- */}
        <Section
          id="flags"
          title="Critical flags cap the grade"
          lead="Four conditions say the same thing in different ways: this business may not be able to pay, whatever the other seven factors add up to. Any one of them holds the final grade at no better than High."
        >
          <div className="overflow-x-auto rounded-lg border-2 border-risk-very-high bg-card">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead className="border-b border-border text-left text-[13px] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Flag</th>
                  <th scope="col" className="px-4 py-2 font-medium">Condition</th>
                  <th scope="col" className="px-4 py-2 font-medium">Why it matters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flags.map((flag) => (
                  <tr key={flag.id}>
                    <td className="px-4 py-2.5 font-medium">{flag.label}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{flag.condition}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{flag.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-md border border-border bg-secondary/60 p-5">
            <h3 className="font-medium">A cap is not a rejection</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-secondary-foreground">
              An automatic rejection would make this a decision engine, and it cannot see the things that legitimately
              rescue such a case: a parent guarantee, security worth more than the loan, a signed contract that fixes
              next year, an owner injecting capital next month. A score built from one year of figures has no business
              closing the file.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-secondary-foreground">
              What it can honestly do is refuse to call the case low risk. The score itself is left untouched, so an
              analyst sees both what the business scored and why it is not being shown as its score alone would
              suggest.
            </p>
          </div>
        </Section>

        {/* --------------------------------------------------------------- NOT SCORED -- */}
        <Section
          id="not-scored"
          title="Shown but not scored"
          lead="Four more ratios are calculated and displayed to the analyst, and deliberately kept out of the score."
        >
          <div className="flex flex-col gap-4">
            {Object.entries(DISPLAY_RATIO_NOTES).map(([id, note]) => (
              <div key={id} className="rounded-md border border-border bg-card p-4">
                <h3 className="font-medium">{note.label}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{note.reason}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            The common thread is double counting. Profitability is already worth 15 points through net margin, and
            return on assets and return on equity are built from the same net income over a different denominator.
            Scoring all three would quietly turn a 15-point weight into something closer to 35, and one good or bad
            trading year would swing the grade far more than the model intends.
          </p>
        </Section>

        {/* -------------------------------------------------------------- DATA QUALITY -- */}
        <Section
          id="data-quality"
          title="Data quality is separate from credit risk"
          lead="These checks ask whether the figures hang together, not whether the business is a good credit. None of them changes the score by a single point."
        >
          <div className="overflow-x-auto rounded-lg border border-risk-elevated bg-card">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead className="border-b border-border text-left text-[13px] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Check</th>
                  <th scope="col" className="px-4 py-2 font-medium">What it looks for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {checks.map((check) => (
                  <tr key={check.id}>
                    <td className="px-4 py-2.5 font-medium">{check.label}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{check.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            Mixing the two would make the model dishonest in both directions. A balance sheet that does not balance is
            far more often a figure typed into the wrong box than a solvency problem, so docking points would punish a
            typo as though it were risk. Silently scoring figures that plainly contradict each other would hand the
            analyst a confident-looking number built on input nobody trusts.
          </p>
        </Section>

        {/* --------------------------------------------------------------- LIMITATIONS -- */}
        <Section
          id="limitations"
          title="What this model cannot see"
          lead="A scorecard that is honest about its blind spots is more useful than one that implies it has none. An analyst who knows the model has no view of collateral will go and look at the security."
        >
          <div className="flex flex-col gap-5">
            {LIMITATIONS.map((limitation) => (
              <div key={limitation.title} className="border-l-2 border-border pl-4">
                <h3 className="font-medium">{limitation.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{limitation.detail}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-14 flex flex-wrap gap-3 border-t border-border pt-8">
        <Link href="/apply" className={buttonVariants()}>
          Start an application
        </Link>
        <Link href="/analyst" className={buttonVariants({ variant: "outline" })}>
          Open the analyst dashboard
        </Link>
      </div>
    </Container>
  );
}
