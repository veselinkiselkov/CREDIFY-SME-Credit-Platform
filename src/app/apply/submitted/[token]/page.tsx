import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { getConfirmation } from "@/lib/applications/repository";
import { looksLikeAccessToken } from "@/lib/applications/reference";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { NotConnectedNotice } from "@/components/apply/not-connected-notice";

export const metadata: Metadata = {
  title: "Application submitted",
  // A page reachable only with a private link should never appear in a search result.
  robots: { index: false, follow: false },
};

/**
 * /apply/submitted/<access_token>
 *
 * The page an applicant lands on immediately after submitting. It has one job: hand over
 * the two things they need to keep, the reference number and the status link.
 *
 * WHY THE URL CARRIES THE TOKEN AND NOT THE REFERENCE
 * A reference like CR-2026-7K4QP2 is short by design, because people read it aloud. The
 * token is a random UUID and is what actually opens the application. Keeping them separate
 * means the reference can be quoted in an email without that email also granting access.
 *
 * This page may show the company name, which the status page does not: the applicant is
 * looking at it seconds after typing it, on their own device, and confirming that the right
 * company was submitted is the point of a confirmation screen. The status page is a link
 * that gets forwarded, so it stays narrower.
 */
export default async function SubmittedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!looksLikeAccessToken(token)) notFound();
  if (!isSupabaseConfigured()) return <NotConnectedNotice />;

  const application = await getConfirmation(token);
  if (!application) notFound();

  const statusHref = `/status/${token}`;

  return (
    <Container className="max-w-2xl py-16 sm:py-24">
      <p className="text-sm text-muted-foreground">Applicant</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Application received</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Thank you. {application.companyName}&rsquo;s application is with Credify and is queued for a credit analyst.
      </p>

      {/* The reference is the single most important thing on this page, so it gets the most
          visual weight on it. */}
      <div className="mt-10 rounded-md border-2 border-primary bg-card p-6">
        <p className="text-sm text-muted-foreground">Your application reference</p>
        <p className="mt-1 font-display text-3xl font-semibold tracking-wide tabular-nums">{application.reference}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Quote this if you contact us about the application. Submitted {formatDateTime(application.submittedAt)} UTC.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">What happens next</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {[
            "A credit analyst reviews your figures and the reasoning behind your request.",
            "If anything is unclear, the analyst leaves a note for you on your status page.",
            "The analyst records a decision. Credify never decides on its own.",
          ].map((text, index) => (
            <li key={text} className="flex gap-4">
              <span className="font-display text-lg font-semibold tabular-nums text-primary">{index + 1}</span>
              <span className="text-[15px] leading-relaxed text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10 rounded-md border border-border bg-secondary/60 p-6">
        <h2 className="font-medium">Save your status link</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-secondary-foreground">
          This link is the only way back to your application, and there is no password to reset. Bookmark it now.
        </p>
        <p className="mt-3 break-all rounded border border-border bg-card px-3 py-2 font-mono text-sm">{statusHref}</p>
        <Link href={statusHref} className={buttonVariants({ className: "mt-5" })}>
          Open my status page
        </Link>
      </div>
    </Container>
  );
}
