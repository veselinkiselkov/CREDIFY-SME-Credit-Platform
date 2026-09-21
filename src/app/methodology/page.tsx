import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Scoring methodology" };

export default function MethodologyPage() {
  return (
    <ComingSoon
      title="Scoring methodology"
      plannedFor="Day 5"
      description="How the eight scorecard factors, their bands and weights, the risk grades and the critical-flag caps work, generated from the same settings the scoring engine uses."
    />
  );
}
