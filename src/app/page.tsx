import { Hero } from "@/components/landing/hero";
import { Process } from "@/components/landing/process";
import { Principles } from "@/components/landing/principles";
import { RiskGradesSection } from "@/components/landing/risk-grades-section";
import { RolePaths } from "@/components/landing/role-paths";

/*
  LANDING PAGE (route: /)
  In Next.js, the folder structure under src/app defines the website's addresses:
  src/app/page.tsx is "/", src/app/apply/page.tsx is "/apply", and so on.
  This file only arranges sections; each section lives in components/landing/.
*/
export default function HomePage() {
  return (
    <>
      <Hero />
      <Process />
      <Principles />
      <RiskGradesSection />
      <RolePaths />
    </>
  );
}
