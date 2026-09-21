"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODE_HOME, modeForPath, type DemoMode } from "@/lib/demo-mode";

const OPTIONS: { mode: DemoMode; label: string }[] = [
  { mode: "applicant", label: "Applicant" },
  { mode: "analyst", label: "Analyst" },
];

/**
 * The demo-mode switch replaces a login in the MVP.
 * It is two ordinary links styled as a segmented control; the highlighted side
 * follows the current page address (see lib/demo-mode.ts).
 *
 * "use client" at the top: this component needs to know the current URL in the browser,
 * which only client components can read.
 */
export function DemoModeSwitch() {
  const pathname = usePathname();
  const active = modeForPath(pathname);

  return (
    <nav aria-label="Demo mode" className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">Demo mode</span>
      <div className="inline-flex rounded-md border border-border bg-card p-0.5">
        {OPTIONS.map(({ mode, label }) => {
          const isActive = active === mode;
          return (
            <Link
              key={mode}
              href={MODE_HOME[mode]}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-[4px] px-3 py-1 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
