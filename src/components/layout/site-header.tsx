"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { modeForPath, type DemoMode } from "@/lib/demo-mode";
import { Container } from "./container";
import { Logo } from "./logo";
import { DemoModeSwitch } from "./demo-mode-switch";

/** Navigation changes with the role, so each view only shows what that user needs. */
const NAV: Record<DemoMode, { href: string; label: string }[]> = {
  applicant: [
    { href: "/#how-it-works", label: "How it works" },
    { href: "/apply", label: "Apply for financing" },
    { href: "/methodology", label: "Methodology" },
  ],
  analyst: [
    { href: "/analyst", label: "Applications" },
    { href: "/methodology", label: "Methodology" },
  ],
};

export function SiteHeader() {
  const pathname = usePathname();
  const mode = modeForPath(pathname) ?? "applicant";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <Container className="flex h-16 items-center gap-8">
        <Logo href={mode === "analyst" ? "/analyst" : "/"} />

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {NAV[mode].map((item) => {
            const isActive = item.href === pathname;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-sm transition-colors hover:text-foreground",
                  isActive ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <DemoModeSwitch />
        </div>
      </Container>
    </header>
  );
}
