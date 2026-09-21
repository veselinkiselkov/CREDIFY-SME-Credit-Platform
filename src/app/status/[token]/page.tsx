import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { NotConnectedNotice } from "@/components/apply/not-connected-notice";
import { StatusBadge } from "@/components/status-badge";
import { getApplicantStatus } from "@/lib/applications/repository";
import { looksLikeAccessToken } from "@/lib/applications/reference";
import { STATUS_META } from "@/lib/applications/status";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Application status",
  // No search engine should index a page reached by a private link.
  robots: { index: false, follow: false },
};

/**
 * /status/<access_token> - THE PUBLIC STATUS PAGE.
 *
 * Exactly three things appear here: the reference number, the status, and the analyst's
 * message if one exists. That is the whole page, and the restraint is the feature.
 *
 * WHY IT IS THIS NARROW
 * The page has no login. It is protected only by the unguessable token in its own URL, and
 * a URL is the easiest thing in the world to forward, screenshot or paste into a chat. So
 * the page is designed on the assumption that the wrong person will eventually see it, and
 * is given nothing worth seeing: no revenue, no EBITDA, no balance sheet, no contact
 * details, and from Day 3 no score and no risk grade either. A borrower's financial
 * position is not something a forwarded link should disclose.
 *
 * This is enforced one layer down as well. getApplicantStatus() selects four columns and
 * returns a type with four fields, so the financial figures are not withheld from the
 * markup - they are never fetched from the database in the first place.
 *
 * The score and grade stay off this page permanently, not just until Day 3. A machine-
 * generated risk grade shown to a borrower without an analyst's context invites exactly the
 * misreading the model disclaimer exists to prevent.
 */
export const dynamic = "force-dynamic";

export default async function StatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!looksLikeAccessToken(token)) notFound();
  if (!isSupabaseConfigured()) return <NotConnectedNotice />;

  const application = await getApplicantStatus(token);
  if (!application) notFound();

  const meta = STATUS_META[application.status];

  return (
    <Container className="max-w-2xl py-16 sm:py-24">
      <p className="text-sm text-muted-foreground">Applicant</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Your application</h1>

      <dl className="mt-10 flex flex-col gap-6 border-t-2 border-foreground pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-sm text-muted-foreground">Reference</dt>
          <dd className="font-display text-2xl font-semibold tracking-wide tabular-nums">{application.reference}</dd>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-6">
          <dt className="text-sm text-muted-foreground">Status</dt>
          <dd>
            <StatusBadge status={application.status} />
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">{meta.applicantText}</p>

      {/*
        The analyst's message appears only when there is one. An empty "Message from your
        analyst" heading would suggest something had been missed.
      */}
      {application.analystMessage && (
        <section className="mt-10 rounded-md border border-border bg-card p-6">
          <h2 className="font-medium">Message from your credit analyst</h2>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{application.analystMessage}</p>
        </section>
      )}

      <p className="mt-10 text-sm text-muted-foreground">
        Last updated {formatDateTime(application.statusUpdatedAt)} UTC. This page refreshes each time you open it;
        bookmark it and check back.
      </p>

      <div className="mt-10 border-t border-border pt-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your financial figures are not shown on this page, because the link to it has no password and could be
          forwarded. To discuss them, contact your analyst and quote {application.reference}.
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
          Back to overview
        </Link>
      </div>
    </Container>
  );
}
