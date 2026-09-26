/**
 * SEED THE FICTIONAL DEMO PORTFOLIO.
 *
 *   npm run seed:demo              # dry run - shows what would be written, changes nothing
 *   npm run seed:demo -- --confirm # actually writes
 *
 * WHAT IT DOES
 * Inserts (or updates) the six invented borrowers in src/lib/sample/demo-applications.ts,
 * so the analyst dashboard shows a realistic spread of grades instead of whatever test
 * submissions happen to be lying around.
 *
 * EVERY COMPANY AND FIGURE IT WRITES IS FICTIONAL. None of them exists.
 *
 * IDEMPOTENT, AND THEREFORE DESTRUCTIVE IN ONE SPECIFIC WAY
 * Each demo borrower has a fixed reference (CR-DEMO-0000NN) and the script upserts on it,
 * so running it twice leaves six rows rather than twelve. The flip side is that re-running
 * RESETS those six rows to their starting state - including any decision an analyst
 * recorded during a demo. That is usually exactly what you want before demonstrating
 * again, but it is worth knowing before you run it. Rows that are not demo rows are never
 * touched.
 *
 * THIS SCRIPT IS NOT PART OF THE WEBSITE
 * It lives outside src/, is never imported by the app, and is never bundled. It reads the
 * same server-side credentials the app uses and is run by hand from a terminal. There is no
 * route, no button and no server action that can trigger it.
 */

import { createClient } from "@supabase/supabase-js";
import { DEMO_APPLICATIONS } from "../src/lib/sample/demo-applications.ts";

const TABLE = "applications";

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

const confirmed = process.argv.includes("--confirm");

console.log("\n  Credify demo data seeder");
console.log("  ────────────────────────");
console.log("  Writes six FICTIONAL borrowers. No real company or person is involved.\n");

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  fail(
    "SUPABASE_URL and SUPABASE_SECRET_KEY are not set.\n" +
      "    Run it with your local environment file:\n" +
      "      node --env-file=.env.local scripts/seed-demo-data.ts --confirm",
  );
}

// What each row will look like. Built here rather than in the data file so the data file
// stays free of database concerns and can be imported by the tests.
const rows = DEMO_APPLICATIONS.map((demo) => ({
  reference: demo.reference,
  status: demo.status,
  analyst_message: demo.analystMessage,
  company_name: demo.companyName,
  legal_form: demo.legalForm,
  registration_number: demo.registrationNumber,
  industry: demo.industry,
  country: demo.country,
  year_founded: demo.yearFounded,
  employees: demo.employees,
  contact_name: demo.contactName,
  contact_email: demo.contactEmail,
  contact_phone: demo.contactPhone,
  loan_amount_eur: demo.loanAmountEur,
  loan_term_months: demo.loanTermMonths,
  loan_purpose: demo.loanPurpose,
  purpose_description: demo.purposeDescription,
  fiscal_year: demo.fiscalYear,
  revenue_eur: demo.revenueEur,
  revenue_prior_year_eur: demo.revenuePriorYearEur,
  ebitda_eur: demo.ebitdaEur,
  net_income_eur: demo.netIncomeEur,
  interest_expense_eur: demo.interestExpenseEur,
  existing_debt_eur: demo.existingDebtEur,
  total_assets_eur: demo.totalAssetsEur,
  current_assets_eur: demo.currentAssetsEur,
  cash_eur: demo.cashEur,
  current_liabilities_eur: demo.currentLiabilitiesEur,
  total_liabilities_eur: demo.totalLiabilitiesEur,
  equity_eur: demo.equityEur,
}));

console.log("  These six borrowers would be written:\n");
for (const demo of DEMO_APPLICATIONS) {
  const score = demo.expectedScore === null ? "not scored" : `${demo.expectedScore}/100 ${demo.expectedGrade}`;
  console.log(`    ${demo.reference}  ${demo.companyName.padEnd(26)} ${score.padEnd(20)} ${demo.demoPurpose}`);
}

if (!confirmed) {
  console.log("\n  DRY RUN - nothing was written.");
  console.log("  To write them, re-run with --confirm:\n");
  console.log("      node --env-file=.env.local scripts/seed-demo-data.ts --confirm\n");
  console.log("  Note: re-seeding RESETS these six rows, including any decision recorded on them.\n");
  process.exit(0);
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("\n  Writing…");

// Upsert on the unique reference: re-running updates in place rather than duplicating.
const { data, error } = await supabase.from(TABLE).upsert(rows, { onConflict: "reference" }).select("reference");

if (error) {
  fail(
    `Supabase rejected the write: ${error.message}\n` +
      "    If it mentions a missing column, run the migrations in supabase/migrations/ first.",
  );
}

console.log(`\n  ✓ ${data?.length ?? 0} demo borrowers written.`);
console.log("    Open /analyst to see them.\n");
