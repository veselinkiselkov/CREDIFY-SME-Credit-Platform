import Link from "next/link";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Closing section: one clear next step for each of the two demo roles. */
export function RolePaths() {
  return (
    <section>
      <Container>
        <div className="grid overflow-hidden rounded-lg border border-border md:grid-cols-2">
          <div className="bg-card p-8 sm:p-10">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Applying for financing</h2>
            <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
              Tell us about the business, the loan you need and your latest financial figures. It takes about five
              minutes.
            </p>
            <Link href="/apply" className={buttonVariants({ className: "mt-7" })}>
              Start an application
            </Link>
          </div>
          <div className="border-t border-border bg-primary p-8 text-primary-foreground sm:p-10 md:border-l md:border-t-0">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Reviewing applications</h2>
            <p className="mt-3 max-w-md leading-relaxed text-primary-foreground/80">
              See every submitted application ranked by risk, open the full analysis and record a decision.
            </p>
            <Link
              href="/analyst"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mt-7 border-transparent text-primary hover:bg-secondary",
              )}
            >
              Open the analyst dashboard
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
