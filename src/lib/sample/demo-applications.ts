/**
 * THE FICTIONAL DEMO PORTFOLIO.
 *
 * Six invented SME borrowers chosen so the analyst dashboard shows a realistic spread of
 * outcomes rather than the same company five times.
 *
 * EVERY COMPANY, PERSON AND FIGURE HERE IS INVENTED. None of them exists.
 *
 * HOW THESE WERE BUILT - and it matters, because the alternative would be dishonest.
 * The financial inputs were designed first, run through the real Day 3 credit engine, and
 * the resulting grades observed. No score or grade is stored, asserted into the UI, or
 * adjusted after the fact. `expectedScore` and `expectedGrade` below are documentation of
 * what the engine produces, and a test re-runs every one of them through `assess()` to
 * prove the comment still matches the model. Change a threshold in the scorecard and that
 * test fails, rather than this file quietly becoming a lie.
 *
 * This file has NO runtime imports, so the seed script can load it directly under Node's
 * TypeScript stripping without pulling in the app's module aliases.
 */

export interface DemoApplication {
  /** Stable, so re-seeding updates a row instead of adding a duplicate. */
  reference: string;
  /** Why this borrower is in the set. Printed by the seed script. */
  demoPurpose: string;
  /** What the engine produces. Verified by a test, never used by the UI. */
  expectedScore: number | null;
  expectedGrade: string;

  companyName: string;
  legalForm: string;
  registrationNumber: string | null;
  industry: string;
  country: string;
  yearFounded: number;
  employees: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;

  loanAmountEur: number;
  loanTermMonths: number;
  loanPurpose: string;
  purposeDescription: string;

  status: string;
  analystMessage: string | null;

  fiscalYear: number;
  revenueEur: number;
  revenuePriorYearEur: number;
  ebitdaEur: number;
  netIncomeEur: number;
  interestExpenseEur: number;
  existingDebtEur: number;
  totalAssetsEur: number;
  currentAssetsEur: number;
  cashEur: number | null;
  currentLiabilitiesEur: number;
  /** Null on the deliberately incomplete row. */
  totalLiabilitiesEur: number | null;
  equityEur: number | null;
}

export const DEMO_APPLICATIONS: DemoApplication[] = [
  // -------------------------------------------------------------------------------------
  // LOW RISK - asset-light software business, strong margins, modest request.
  // -------------------------------------------------------------------------------------
  {
    reference: "CR-DEMO-000001",
    demoPurpose: "Low risk: strong coverage and liquidity, small request against revenue",
    expectedScore: 86,
    expectedGrade: "Low",
    companyName: "Helder Software BV",
    legalForm: "other",
    registrationNumber: "NL 6641 2298",
    industry: "it-software",
    country: "NL",
    yearFounded: 2012,
    employees: 22,
    contactName: "Sanne de Vries",
    contactEmail: "s.devries@helder-software.example",
    contactPhone: "+31 20 555 0199",
    loanAmountEur: 250_000,
    loanTermMonths: 36,
    loanPurpose: "expansion",
    purposeDescription:
      "Hiring four engineers to deliver a signed three-year enterprise contract starting in Q3. The contract is " +
      "already executed; this funds the delivery team ahead of the first milestone payment.",
    status: "approved",
    analystMessage: "Approved at the requested amount over 36 months. Standard covenants apply.",
    fiscalYear: 2025,
    revenueEur: 3_100_000,
    revenuePriorYearEur: 2_500_000,
    ebitdaEur: 720_000,
    netIncomeEur: 260_000,
    interestExpenseEur: 40_000,
    existingDebtEur: 900_000,
    totalAssetsEur: 2_400_000,
    currentAssetsEur: 1_700_000,
    cashEur: 900_000,
    currentLiabilitiesEur: 600_000,
    totalLiabilitiesEur: 1_500_000,
    equityEur: 900_000,
  },

  // -------------------------------------------------------------------------------------
  // MODERATE - Nordwerk, the reference case used throughout the project and its tests.
  // -------------------------------------------------------------------------------------
  {
    reference: "CR-DEMO-000002",
    demoPurpose: "Moderate risk: the reference case, 78/100, used by the landing page and the test suite",
    expectedScore: 78,
    expectedGrade: "Moderate",
    companyName: "Nordwerk Precision GmbH",
    legalForm: "gmbh",
    registrationNumber: "HRB 84021 B",
    industry: "manufacturing",
    country: "DE",
    yearFounded: 2014,
    employees: 38,
    contactName: "Katrin Vogel",
    contactEmail: "k.vogel@nordwerk-precision.example",
    contactPhone: "+49 30 5550 1184",
    loanAmountEur: 600_000,
    loanTermMonths: 60,
    loanPurpose: "equipment",
    purposeDescription:
      "Replacing two 1998 CNC milling machines with a single five-axis machining centre. The new centre removes an " +
      "outsourced finishing step and adds capacity for an agreed three-year supply contract with an existing customer.",
    status: "submitted",
    analystMessage: null,
    fiscalYear: 2025,
    revenueEur: 4_200_000,
    revenuePriorYearEur: 3_900_000,
    ebitdaEur: 630_000,
    netIncomeEur: 260_000,
    interestExpenseEur: 70_000,
    existingDebtEur: 1_200_000,
    totalAssetsEur: 3_500_000,
    currentAssetsEur: 1_400_000,
    cashEur: 500_000,
    currentLiabilitiesEur: 900_000,
    totalLiabilitiesEur: 2_100_000,
    equityEur: 1_400_000,
  },

  // -------------------------------------------------------------------------------------
  // CAPPED - a decent score held down by negative equity. The most instructive case.
  // -------------------------------------------------------------------------------------
  {
    reference: "CR-DEMO-000003",
    demoPurpose: "Critical flag: 76 points would be Moderate, but negative equity caps the grade at High",
    expectedScore: 76,
    expectedGrade: "High",
    companyName: "Rheinbau Hochtief KG",
    legalForm: "ohg-kg",
    registrationNumber: "HRA 22110",
    industry: "construction",
    country: "DE",
    yearFounded: 2019,
    employees: 64,
    contactName: "Markus Lehmann",
    contactEmail: "m.lehmann@rheinbau-hochtief.example",
    contactPhone: null,
    loanAmountEur: 900_000,
    loanTermMonths: 48,
    loanPurpose: "working-capital",
    purposeDescription:
      "Bridging working capital between certified stage payments on two municipal contracts. Accumulated losses " +
      "from a disputed 2023 contract have left the partnership with negative equity, which the partners are " +
      "addressing through a capital injection scheduled for the next financial year.",
    status: "in_review",
    analystMessage: null,
    fiscalYear: 2025,
    revenueEur: 8_100_000,
    revenuePriorYearEur: 7_800_000,
    ebitdaEur: 1_200_000,
    netIncomeEur: 300_000,
    interestExpenseEur: 150_000,
    existingDebtEur: 1_800_000,
    totalAssetsEur: 4_200_000,
    currentAssetsEur: 2_400_000,
    cashEur: 320_000,
    currentLiabilitiesEur: 1_600_000,
    totalLiabilitiesEur: 4_500_000,
    equityEur: -300_000,
  },

  // -------------------------------------------------------------------------------------
  // ELEVATED - a large, capital-intensive haulier carrying real debt.
  // -------------------------------------------------------------------------------------
  {
    reference: "CR-DEMO-000004",
    demoPurpose: "Elevated risk: sound trading, but heavy existing debt and thin liquidity",
    expectedScore: 54,
    expectedGrade: "Elevated",
    companyName: "Bergmann Logistik GmbH",
    legalForm: "gmbh",
    registrationNumber: "HRB 51902",
    industry: "transport-logistics",
    country: "AT",
    yearFounded: 2004,
    employees: 130,
    contactName: "Eva Brunner",
    contactEmail: "e.brunner@bergmann-logistik.example",
    contactPhone: "+43 1 555 0142",
    loanAmountEur: 1_400_000,
    loanTermMonths: 84,
    loanPurpose: "refinancing",
    purposeDescription:
      "Refinancing six vehicle leases into a single facility at a lower blended rate, releasing roughly EUR 90,000 " +
      "of annual cash flow.",
    status: "information_requested",
    analystMessage:
      "Please send your interim management accounts to 31 March, and confirm the remaining term on the two leases "
      + "not included in this refinancing.",
    fiscalYear: 2025,
    revenueEur: 14_500_000,
    revenuePriorYearEur: 13_900_000,
    ebitdaEur: 1_850_000,
    netIncomeEur: 640_000,
    interestExpenseEur: 290_000,
    existingDebtEur: 5_100_000,
    totalAssetsEur: 11_200_000,
    currentAssetsEur: 3_400_000,
    cashEur: 600_000,
    currentLiabilitiesEur: 2_900_000,
    totalLiabilitiesEur: 8_100_000,
    equityEur: 3_100_000,
  },

  // -------------------------------------------------------------------------------------
  // HIGH - weak on almost every factor, but no single condition bad enough to flag.
  // -------------------------------------------------------------------------------------
  {
    reference: "CR-DEMO-000005",
    demoPurpose: "High risk: weak across the board, yet no critical flag fires",
    expectedScore: 36,
    expectedGrade: "High",
    companyName: "Steinmetz Bau GmbH",
    legalForm: "gmbh",
    registrationNumber: "HRB 77310",
    industry: "construction",
    country: "DE",
    yearFounded: 2016,
    employees: 41,
    contactName: "Dieter Kraus",
    contactEmail: "d.kraus@steinmetz-bau.example",
    contactPhone: null,
    loanAmountEur: 600_000,
    loanTermMonths: 60,
    loanPurpose: "working-capital",
    purposeDescription:
      "Working capital to bridge a slower residential order book while two commercial tenders are decided.",
    status: "submitted",
    analystMessage: null,
    fiscalYear: 2025,
    revenueEur: 5_800_000,
    revenuePriorYearEur: 6_100_000,
    ebitdaEur: 420_000,
    netIncomeEur: 90_000,
    interestExpenseEur: 200_000,
    existingDebtEur: 1_600_000,
    totalAssetsEur: 3_600_000,
    currentAssetsEur: 1_620_000,
    cashEur: 180_000,
    currentLiabilitiesEur: 1_200_000,
    totalLiabilitiesEur: 2_900_000,
    equityEur: 700_000,
  },

  // -------------------------------------------------------------------------------------
  // INCOMPLETE - a row as it would have been stored before the balance-sheet fields
  // existed. Kept in the demo set on purpose: how a product handles missing data is worth
  // showing, and the honest answer is to refuse to score it.
  // -------------------------------------------------------------------------------------
  {
    reference: "CR-DEMO-000006",
    demoPurpose: "Incomplete: submitted before total liabilities, equity and cash were collected, so it is not scored",
    expectedScore: null,
    expectedGrade: "Not scored",
    companyName: "Altwerk Handels GmbH",
    legalForm: "gmbh",
    registrationNumber: null,
    industry: "wholesale",
    country: "DE",
    yearFounded: 2009,
    employees: 45,
    contactName: "Renate Böhm",
    contactEmail: "r.boehm@altwerk-handels.example",
    contactPhone: null,
    loanAmountEur: 400_000,
    loanTermMonths: 60,
    loanPurpose: "other",
    purposeDescription: "Stock purchase ahead of the autumn season.",
    status: "submitted",
    analystMessage: null,
    fiscalYear: 2025,
    revenueEur: 2_800_000,
    revenuePriorYearEur: 2_700_000,
    ebitdaEur: 310_000,
    netIncomeEur: 90_000,
    interestExpenseEur: 55_000,
    existingDebtEur: 800_000,
    totalAssetsEur: 1_900_000,
    currentAssetsEur: 700_000,
    cashEur: null,
    currentLiabilitiesEur: 500_000,
    totalLiabilitiesEur: null,
    equityEur: null,
  },
];
