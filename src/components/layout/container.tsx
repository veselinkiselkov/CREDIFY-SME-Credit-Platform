import { cn } from "@/lib/utils";

/** Keeps page content at a readable maximum width with consistent side padding. */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}
