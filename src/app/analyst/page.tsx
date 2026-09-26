import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { NotConnectedNotice } from "@/components/apply/not-connected-notice";
import { ApplicationsTable } from "@/components/analyst/applications-table";
import { KpiCards } from "@/components/analyst/kpi-cards";
import { RiskDistributionChart } from "@/components/analyst/risk-distribution-chart";
import { listApplicationsForAnalyst } from "@/lib/applications/repository";
import { riskDistribution, summarise, toListItem } from "@/lib/analyst/list";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { MODEL_DISCLAIMER, MODEL_VERSION } from "@/lib/risk-grades";

export const metadata: Metadata = {
  title: "Applications",
  description: "Every submitted SME loan application, scored by Credify's illustrative scorecard.",
};

/**
 * /analyst - THE DASHBOARD.
 *
 * A server component. It reads the applications, runs each one through the Day 3 credit
 * engine, and works out the portfolio numbers - all on the server. Only the finished table
 * rows cross to the browser, and only so the table can filter and sort without a round trip.
 *
 * What that boundary buys: the database key stays server-side (it is the same server-only
 * client the applicant pages use), the applicant's `access_token` is never selected at all,
 * and the browser receives nine columns per application rather than every borrower's full
 * accounts.
 *
 * Nothing here calculates a ratio, a score or a grade. Those come from `assess()`.
 */
export const dynamic = "force-dynamic";

export default async function AnalystDashboardPage() {
  if (!isSupabaseConfigured()) return <NotConnectedNotice />;

  const records = await listApplicationsForAnalyst();
  const items = records.map((record) => toListItem(record));
  const summary = summarise(items);
  const distribution = riskDistribution(items);

  return (
    <Container className="max-w-[1400px] py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Analyst</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Applications</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
          Every submitted application, scored by Credify&rsquo;s illustrative scorecard {MODEL_VERSION}. Open a
          borrower to see the ratios, the factor-by-factor breakdown and the flagged risks behind its grade.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="font-medium">No applications yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Submitted applications appear here automatically. Use the application form to add one.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <KpiCards summary={summary} />

          <section className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-medium">Applications by risk grade</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {summary.scoredCount} scored
                {summary.unscoredCount > 0 && `, ${summary.unscoredCount} without a grade`}
              </p>
              <div className="mt-3">
                <RiskDistributionChart data={distribution} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-secondary/50 p-5">
              <h2 className="text-sm font-medium">How to read these scores</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-secondary-foreground">{MODEL_DISCLAIMER}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-secondary-foreground">
                A grade marked <span className="font-medium">Capped</span> carries a critical flag: the scorecard
                will not show it better than High, whatever its points total. That is a limit on the grade, not a
                decision on the application.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">All applications</h2>
            <ApplicationsTable items={items} />
          </section>
        </div>
      )}
    </Container>
  );
}
