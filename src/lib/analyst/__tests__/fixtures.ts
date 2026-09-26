import type { ApplicationRecord } from "@/lib/applications/repository";

/**
 * Stored-application fixtures.
 *
 * `import type` is used on purpose: the repository is marked `server-only` and would throw
 * if it were imported for real outside a server component. A type import is erased at
 * compile time, so these fixtures stay type-checked against the real record shape without
 * dragging the database client into the test run.
 */

/** Fixed so that "years in business" never drifts with the calendar. */
export const NOW = new Date("2026-06-01T00:00:00Z");

/** Nordwerk Precision GmbH as it would be stored after a form submission. */
export const NORDWERK_RECORD: ApplicationRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  reference: "CR-2026-7K4QP2",
  status: "submitted",
  analystMessage: null,
  submittedAt: "2026-05-20T09:30:00Z",
  updatedAt: "2026-05-20T09:30:00Z",

  companyName: "Nordwerk Precision GmbH",
  legalForm: "gmbh",
  registrationNumber: "HRB 84021 B",
  industry: "manufacturing",
  country: "DE",
  yearFounded: 2014, // 12 years at NOW
  employees: 38,
  contactName: "Katrin Vogel",
  contactEmail: "k.vogel@nordwerk-precision.example",
  contactPhone: "+49 30 5550 1184",

  loanAmountEur: 600_000,
  loanTermMonths: 60,
  loanPurpose: "equipment",
  purposeDescription: "Replacing two CNC milling machines with a five-axis machining centre.",

  fiscalYear: 2025,
  revenueEur: 4_200_000,
  revenuePriorYearEur: 3_900_000,
  ebitdaEur: 630_000,
  netIncomeEur: 260_000,
  interestExpenseEur: 70_000,
  existingDebtEur: 1_200_000,
  totalAssetsEur: 3_500_000,
  currentAssetsEur: 1_400_000,
  currentLiabilitiesEur: 900_000,
  totalLiabilitiesEur: 2_100_000,
  equityEur: 1_400_000,
};

/**
 * A row created before total liabilities and shareholders' equity existed.
 *
 * This is the shape of the real legacy rows in the deployed database: everything else
 * present, those two columns NULL because the migration added them as nullable.
 */
export const LEGACY_RECORD: ApplicationRecord = {
  ...NORDWERK_RECORD,
  id: "22222222-2222-4222-8222-222222222222",
  reference: "CR-2026-LEGACY",
  companyName: "Altwerk Legacy GmbH",
  totalLiabilitiesEur: null,
  equityEur: null,
};

export function recordWith(overrides: Partial<ApplicationRecord>): ApplicationRecord {
  return { ...NORDWERK_RECORD, ...overrides };
}
