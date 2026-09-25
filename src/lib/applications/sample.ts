import type { ApplicationFormValues } from "./schema";

/**
 * SAMPLE APPLICATION, used by the "Fill with sample data" button on the form.
 *
 * This is Nordwerk Precision GmbH, the same FICTIONAL company as the worked example on the
 * landing page (see lib/sample/nordwerk-preview.ts). Using one company throughout means a
 * demo can move from the landing page to a real submission without the numbers changing.
 *
 * The nine financial figures are the inputs behind the landing page's 78/100 Moderate
 * result, so once the Day 3 scoring engine exists, filling this form and submitting it
 * must reproduce that score. That makes this sample a check on the engine, not just a
 * convenience.
 *
 * Every value here is a string, because it is poured straight into the form's inputs.
 */

const LAST_FULL_YEAR = new Date().getUTCFullYear() - 1;

export const SAMPLE_APPLICATION: ApplicationFormValues = {
  // Step 1: company information
  companyName: "Nordwerk Precision GmbH",
  legalForm: "gmbh",
  registrationNumber: "HRB 84021 B",
  industry: "manufacturing",
  country: "DE",
  yearFounded: String(LAST_FULL_YEAR + 1 - 12), // 12 years in business, matching the landing page
  employees: "38",
  contactName: "Katrin Vogel",
  contactEmail: "k.vogel@nordwerk-precision.example",
  contactPhone: "+49 30 5550 1184",

  // Step 2: loan request
  loanAmountEur: "600000",
  loanTermMonths: "60",
  loanPurpose: "equipment",
  purposeDescription:
    "Replacing two 1998 CNC milling machines with a single five-axis machining centre. " +
    "The new centre removes an outsourced finishing step and adds capacity for an agreed " +
    "three-year supply contract with an existing customer.",

  // Step 3: financial information (last full financial year)
  fiscalYear: String(LAST_FULL_YEAR),
  revenueEur: "4200000",
  revenuePriorYearEur: "3900000",
  ebitdaEur: "630000",
  netIncomeEur: "260000",
  interestExpenseEur: "70000",
  existingDebtEur: "1200000",
  totalAssetsEur: "3500000",
  currentAssetsEur: "1400000",
  currentLiabilitiesEur: "900000",
  totalLiabilitiesEur: "2100000",
  equityEur: "1400000",

  // Step 4: review and submit. Left unticked on purpose: confirming the figures are
  // accurate is the applicant's act, and a demo button should not perform it for them.
  confirmAccuracy: "false",
};
