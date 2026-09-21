import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Credify wordmark. The mark is a five-step meter in the five risk-grade colours,
 * rising from Very High to Low: the product's core idea in a 20-pixel icon.
 */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="Credify home">
      <svg width="22" height="20" viewBox="0 0 22 20" aria-hidden>
        <rect x="0" y="14" width="3" height="6" rx="0.75" className="fill-risk-very-high" />
        <rect x="4.75" y="11" width="3" height="9" rx="0.75" className="fill-risk-high" />
        <rect x="9.5" y="8" width="3" height="12" rx="0.75" className="fill-risk-elevated" />
        <rect x="14.25" y="4" width="3" height="16" rx="0.75" className="fill-risk-moderate" />
        <rect x="19" y="0" width="3" height="20" rx="0.75" className="fill-risk-low" />
      </svg>
      <span className="font-display text-[1.35rem] font-semibold leading-none tracking-tight text-foreground">
        Credify
      </span>
    </Link>
  );
}
