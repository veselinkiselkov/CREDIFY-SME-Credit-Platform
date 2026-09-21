import Link from "next/link";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";

interface ComingSoonProps {
  title: string;
  description: string;
  plannedFor: string;
  backHref?: string;
  backLabel?: string;
}

/**
 * Placeholder for screens not built yet, so every link on the live site
 * leads somewhere meaningful instead of a "404 not found" page.
 * Each placeholder is replaced by the real screen on its planned day.
 */
export function ComingSoon({ title, description, plannedFor, backHref = "/", backLabel = "Back to overview" }: ComingSoonProps) {
  return (
    <Container className="py-24">
      <div className="max-w-xl">
        <p className="text-sm text-muted-foreground">In progress, planned for {plannedFor}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">{description}</p>
        <Link href={backHref} className={buttonVariants({ variant: "outline", className: "mt-8" })}>
          {backLabel}
        </Link>
      </div>
    </Container>
  );
}
