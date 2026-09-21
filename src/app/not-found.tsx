import Link from "next/link";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="py-24">
      <div className="max-w-xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Check the address, or go back to the overview to start an application or open the analyst dashboard.
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-8" })}>
          Back to overview
        </Link>
      </div>
    </Container>
  );
}
