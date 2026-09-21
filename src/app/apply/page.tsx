import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { ApplicationForm } from "@/components/apply/application-form";

export const metadata: Metadata = {
  title: "Apply for financing",
  description:
    "A four-step SME loan application: company details, the loan request, your financial figures, and a review before you submit.",
};

/**
 * /apply
 *
 * A server component that renders one client component. Keeping the page itself on the
 * server means the headings and the disclaimer below are in the initial HTML: they are
 * readable, and indexable, before any JavaScript runs. Only the form itself needs to be
 * interactive.
 */
export default function ApplyPage() {
  return (
    <Container className="max-w-3xl py-14 sm:py-20">
      <header className="mb-10">
        <p className="text-sm text-muted-foreground">Applicant</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Apply for financing</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Four steps, about ten minutes. Have your most recent annual accounts to hand. Nothing is saved until you
          submit on the last step.
        </p>
      </header>

      <ApplicationForm />

      <p className="mt-12 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
        Credify is a demonstration project. Companies, figures and decisions here are fictional, and submitting an
        application does not create any form of credit agreement.
      </p>
    </Container>
  );
}
