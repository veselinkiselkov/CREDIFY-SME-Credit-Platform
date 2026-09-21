import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Apply for financing" };

export default function ApplyPage() {
  return (
    <ComingSoon
      title="Apply for financing"
      plannedFor="Day 2"
      description="A four-step application covering company details, the loan request and financial figures, with a review step before you submit."
    />
  );
}
