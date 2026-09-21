import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Application status" };

/**
 * /status with no token.
 *
 * There is nothing to show without a link, but landing on a 404 after trimming a URL is
 * confusing. This explains why, which matters especially because there is no "look up my
 * application by reference number" alternative: allowing that would turn the short, quotable
 * reference into a key that opens an application, and it is deliberately not one.
 */
export default function StatusIndexPage() {
  return (
    <Container className="max-w-2xl py-24">
      <h1 className="font-display text-4xl font-semibold tracking-tight">You need your status link</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        Each application has its own private status page. The link was shown on the confirmation screen right after you
        submitted, and it is the only way in: Credify has no login yet, and an application cannot be looked up by its
        reference number alone.
      </p>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        If you have lost the link, get in touch quoting your reference number and we will send it again.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/apply" className={buttonVariants()}>
          Start a new application
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to overview
        </Link>
      </div>
    </Container>
  );
}
