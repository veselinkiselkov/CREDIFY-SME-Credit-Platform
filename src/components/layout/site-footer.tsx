import Link from "next/link";
import { MODEL_DISCLAIMER, MODEL_VERSION } from "@/lib/risk-grades";
import { Container } from "./container";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <Container className="grid gap-8 py-10 md:grid-cols-[1fr_2fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            A portfolio project exploring SME credit decisioning. All companies and figures are fictional.
          </p>
        </div>
        <div className="space-y-4 text-sm text-muted-foreground md:justify-self-end md:max-w-xl">
          <p>{MODEL_DISCLAIMER}</p>
          <p>
            Scorecard {MODEL_VERSION}.{" "}
            <Link href="/methodology" className="font-medium text-primary underline-offset-4 hover:underline">
              Read the methodology
            </Link>
          </p>
        </div>
      </Container>
    </footer>
  );
}
