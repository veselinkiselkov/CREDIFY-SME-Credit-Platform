import Link from "next/link";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { CreditMemoPreview } from "./credit-memo-preview";

export function Hero() {
  return (
    <section className="border-b border-border">
      <Container className="grid items-center gap-12 py-14 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16 lg:py-24">
        <div>
          <h1 className="max-w-[15ch] font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.015em] sm:text-6xl">
            SME credit decisions, with every point explained.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
            Credify turns a small-business loan application into credit ratios, a transparent scorecard and a list of
            flagged risks, so a bank analyst can review it quickly and make the decision.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/apply" className={buttonVariants({ size: "lg" })}>
              Start an application
            </Link>
            <Link href="/analyst" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Open the analyst dashboard
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Demonstration product with fictional data and an illustrative scoring model.
          </p>
        </div>

        <CreditMemoPreview />
      </Container>
    </section>
  );
}
