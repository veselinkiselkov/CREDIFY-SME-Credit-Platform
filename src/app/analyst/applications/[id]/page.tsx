import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { NotConnectedNotice } from "@/components/apply/not-connected-notice";
import { RiskBadge } from "@/components/risk-badge";
import { RiskScale } from "@/components/risk-scale";
import { StatusBadge } from "@/components/status-badge";
import { FigureList, Section, type Figure } from "@/components/analyst/detail-sections";
import { DisplayRatioList, ScoredRatioList } from "@/components/analyst/ratio-list";
import { ScoreBreakdown } from "@/components/analyst/score-breakdown";
import { CriticalFlags, DataQuality, Narrative } from "@/components/analyst/findings";
import { getApplicationForAnalyst, type ApplicationRecord } from "@/lib/applications/repository";
import { COUNTRIES, INDUSTRIES, LEGAL_FORMS, LOAN_PURPOSES } from "@/lib/applications/options";
import { STATUS_META } from "@/lib/applications/status";
import { scoreApplication, yearsInBusiness, type MissingInput } from "@/lib/analyst/scoring";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { formatDateTime, formatEur, formatNumber } from "@/lib/format";
import { MODEL_DISCLAIMER } from "@/lib/risk-grades";

export const metadata: Metadata = {
  title: "Borrower analysis",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /analyst/applications/<id> - THE BORROWER ANALYSIS.
 *
 * Fully server-rendered: no client component, no data crossing to the browser beyond the
 * finished HTML. One borrower's complete accounts are on this page, so there is no reason
 * to serialise them into a props payload as well.
 *
 * The route is keyed on the table's internal `id`. The applicant's `access_token` is a
 * capability - anyone holding it can open that applicant's status page - so it is not
 * selected by the analyst query and never appears in an analyst URL, browser history or
 * screen-share.
 *
 * Every number below comes from the Day 3 engine via `scoreApplication`. This page performs
 * no arithmetic of its own beyond formatting.
 */

function labelFor(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

const money = (value: number | null): string => (value === null ? "Not reported" : formatEur(value));

/** The reported figures, in the order an analyst reads a set of accounts. */
function reportedFigures(record: ApplicationRecord): { profitAndLoss: Figure[]; balanceSheet: Figure[] } {
  return {
    profitAndLoss: [
      { label: "Revenue", value: money(record.revenueEur) },
      { label: "Revenue, previous year", value: money(record.revenuePriorYearEur) },
      { label: "EBITDA", value: money(record.ebitdaEur) },
      { label: "Net income", value: money(record.netIncomeEur) },
      { label: "Interest expense", value: money(record.interestExpenseEur) },
    ],
    balanceSheet: [
      { label: "Total assets", value: money(record.totalAssetsEur) },
      { label: "Total liabilities", value: money(record.totalLiabilitiesEur) },
      { label: "Shareholders' equity", value: money(record.equityEur) },
      { label: "Existing interest-bearing debt", value: money(record.existingDebtEur) },
      { label: "Current assets", value: money(record.currentAssetsEur) },
      { label: "Current liabilities", value: money(record.currentLiabilitiesEur) },
      {
        label: "Cash",
        value: "—",
        // Shown rather than silently omitted, so its absence is visible rather than assumed.
        note: "Not collected by the application form",
      },
    ],
  };
}

function IncompleteNotice({ missing }: { missing: MissingInput[] }) {
  return (
    <div className="rounded-md border-2 border-risk-elevated bg-card">
      <div className="border-b border-border px-5 py-4">
        <p className="font-display text-lg font-semibold tracking-tight">Incomplete financial data</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
          This application is missing {missing.length} figure{missing.length === 1 ? "" : "s"} the scorecard needs, so
          it has <span className="font-medium text-foreground">not been scored</span>. Nothing has been estimated,
          derived or defaulted to zero: a plausible-looking score built on absent data would be far more dangerous
          than an obvious gap. The reported figures below are shown as submitted.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Applications submitted before total liabilities and shareholders&rsquo; equity were added to the form will
          always appear here. Ask the applicant for the missing figures, or ask them to re-submit.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {missing.map((item) => (
          <li key={item.field} className="flex items-center gap-3 px-5 py-2.5">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-risk-elevated" />
            <span className="text-[15px]">{item.label}</span>
            <code className="ml-auto text-[12px] text-muted-foreground">{item.field}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function BorrowerAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return <NotConnectedNotice />;

  const record = await getApplicationForAnalyst(id);
  if (!record) notFound();

  const scoring = scoreApplication(record);
  const figures = reportedFigures(record);
  const statusMeta = STATUS_META[record.status];

  return (
    <Container className="max-w-5xl py-10 sm:py-14">
      <Link href="/analyst" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        ← All applications
      </Link>

      {/* ---------------------------------------------------------------- A. HEADER -- */}
      <header className="mt-4 flex flex-wrap items-start justify-between gap-6 border-b border-border pb-8">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{record.companyName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="tabular-nums text-muted-foreground">{record.reference}</span>
            <StatusBadge status={record.status} />
            <span className="text-muted-foreground">
              Requests <span className="font-medium text-foreground">{money(record.loanAmountEur)}</span> over{" "}
              {record.loanTermMonths} months
            </span>
          </div>
        </div>

        {scoring.status === "scored" ? (
          <div className="min-w-[260px]">
            <div className="flex items-end justify-between gap-4">
              <p className="font-display font-semibold leading-none tabular-nums">
                <span className="text-5xl tracking-tight">{scoring.assessment.score}</span>
                <span className="ml-1 text-lg text-muted-foreground">/ 100</span>
              </p>
              <RiskBadge grade={scoring.assessment.grade} className="mb-1" />
            </div>
            <RiskScale score={scoring.assessment.score} className="mt-4" />
            {scoring.assessment.gradeCapped && (
              // The single most important thing on this page when it applies, so it is
              // stated in words immediately under the grade rather than left as a colour.
              <p className="mt-3 rounded-md border border-risk-high bg-card px-3 py-2 text-[13px] leading-relaxed">
                <span className="font-medium">Grade capped at {scoring.assessment.grade.label}.</span> The score of{" "}
                {scoring.assessment.score} alone would give {scoring.assessment.uncappedGrade.label}, but a critical
                flag limits it. See Critical risk flags below.
              </p>
            )}
          </div>
        ) : (
          <div className="min-w-[260px] rounded-md border border-risk-elevated bg-card px-4 py-3">
            <p className="font-medium">Not scored</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {scoring.missing.length} required figure{scoring.missing.length === 1 ? "" : "s"} missing.
            </p>
          </div>
        )}
      </header>

      <div className="mt-10 flex flex-col gap-10">
        {scoring.status === "incomplete" && <IncompleteNotice missing={scoring.missing} />}

        {/* ------------------------------------------------- B & C. COMPANY AND LOAN -- */}
        <div className="grid gap-10 lg:grid-cols-2">
          <Section title="Company">
            <FigureList
              columns={1}
              figures={[
                { label: "Industry", value: labelFor(INDUSTRIES, record.industry) },
                { label: "Country", value: labelFor(COUNTRIES, record.country) },
                { label: "Company type", value: labelFor(LEGAL_FORMS, record.legalForm) },
                { label: "Register number", value: record.registrationNumber ?? "Not provided" },
                {
                  label: "Years in business",
                  value: `${yearsInBusiness(record.yearFounded)} years`,
                  note: `Founded ${record.yearFounded}`,
                },
                { label: "Employees", value: formatNumber(record.employees) },
              ]}
            />
          </Section>

          <Section title="Loan request">
            <FigureList
              columns={1}
              figures={[
                { label: "Amount requested", value: money(record.loanAmountEur) },
                { label: "Repayment term", value: `${record.loanTermMonths} months` },
                { label: "Purpose", value: labelFor(LOAN_PURPOSES, record.loanPurpose) },
              ]}
            />
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">What the money will be used for</p>
              <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{record.purposeDescription}</p>
            </div>
          </Section>
        </div>

        {/* --------------------------------------------- D. FINANCIAL PERFORMANCE -- */}
        <Section
          title="Reported financial figures"
          description={`As submitted for financial year ${record.fiscalYear}. Self-reported and unaudited.`}
        >
          <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium">Profit and loss</h3>
              <FigureList columns={1} figures={figures.profitAndLoss} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Balance sheet at year end</h3>
              <FigureList columns={1} figures={figures.balanceSheet} />
            </div>
          </div>
        </Section>

        {scoring.status === "scored" && (
          <>
            {/* ------------------------------------------------- H. CRITICAL FLAGS -- */}
            <Section title="Critical risk flags">
              <CriticalFlags flags={scoring.assessment.criticalFlags} />
            </Section>

            {/* ----------------------------------------------------- E. RATIOS -- */}
            <Section
              title="Credit ratios"
              description="Calculated by the scorecard from the reported figures. Colour reinforces the points earned; it is never the only signal."
            >
              <ScoredRatioList factors={scoring.assessment.factors} />
            </Section>

            <Section
              title="Shown for context, not scored"
              description="Useful to read, deliberately excluded from the score. Return on assets and return on equity reuse the same net income already scored by net margin, and return on equity becomes unstable as equity approaches zero."
            >
              <DisplayRatioList ratios={scoring.assessment.displayRatios} />
            </Section>

            {/* ------------------------------------------------ F. SCORE BREAKDOWN -- */}
            <Section
              title="How the score was built"
              description="Every point, and every point forgone. The Forgone column accounts for the gap to 100."
            >
              <ScoreBreakdown assessment={scoring.assessment} />
            </Section>

            {/* --------------------------------------- G. STRENGTHS AND RISK FACTORS -- */}
            <Section
              title="Strengths and risk factors"
              description="Generated from the calculated values by fixed rules: a factor at or above 80% of its maximum is a strength, at or below 40% a risk factor. Not AI-written."
            >
              <Narrative strengths={scoring.assessment.strengths} risks={scoring.assessment.risks} />
            </Section>

            {/* ------------------------------------------------- I. DATA QUALITY -- */}
            <Section title="Data quality">
              <DataQuality warnings={scoring.assessment.dataQualityWarnings} />
            </Section>
          </>
        )}

        {/* -------------------------------------------------------- STATUS (read only) -- */}
        <Section title="Status" description="Recording a decision is not part of this screen yet.">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={record.status} />
              <span className="text-[15px] text-muted-foreground">{statusMeta.applicantText}</span>
            </div>
            {record.analystMessage && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-sm text-muted-foreground">Message sent to the applicant</p>
                <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{record.analystMessage}</p>
              </div>
            )}
            <p className="mt-4 text-[13px] text-muted-foreground">
              Last updated {formatDateTime(record.updatedAt)} UTC · Submitted {formatDateTime(record.submittedAt)} UTC
            </p>
          </div>
        </Section>

        <p className="border-t border-border pt-6 text-[13px] leading-relaxed text-muted-foreground">
          {MODEL_DISCLAIMER}
        </p>

        <div>
          <Link href="/analyst" className={buttonVariants({ variant: "outline" })}>
            Back to all applications
          </Link>
        </div>
      </div>
    </Container>
  );
}
