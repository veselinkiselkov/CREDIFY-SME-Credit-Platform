import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Applications" };

export default function AnalystDashboardPage() {
  return (
    <ComingSoon
      title="Applications"
      plannedFor="Day 4"
      description="Every submitted application with its requested amount, status, score and risk grade, sortable so the analyst can decide where to start."
      backHref="/"
      backLabel="Back to overview"
    />
  );
}
