/**
 * CHOICE LISTS for the application form.
 *
 * Every dropdown on the form reads its options from here, and the Zod schema builds its
 * allowed values from the same arrays. A value can therefore never exist in the dropdown
 * but fail validation, or the other way round.
 *
 * The stored value (`value`) is a stable code that goes into the database. The `label` is
 * what the applicant reads and may be reworded at any time without touching stored data.
 */

export interface Option {
  value: string;
  label: string;
}

/** Helper: pulls the allowed values out of a list so the schema and the dropdown stay in step. */
export function valuesOf(options: readonly Option[]): [string, ...string[]] {
  return options.map((o) => o.value) as [string, ...string[]];
}

export const LEGAL_FORMS: readonly Option[] = [
  { value: "gmbh", label: "GmbH" },
  { value: "ug", label: "UG (haftungsbeschränkt)" },
  { value: "gmbh-co-kg", label: "GmbH & Co. KG" },
  { value: "ag", label: "AG" },
  { value: "ohg-kg", label: "OHG / KG" },
  { value: "gbr", label: "GbR" },
  { value: "sole-trader", label: "Sole trader (Einzelunternehmen)" },
  { value: "other", label: "Other" },
];

/**
 * Industry drives nothing yet. It is collected from Day 2 because the scorecard's
 * benchmark thresholds are industry-aware in a later version, and asking for it
 * afterwards would leave earlier applications without the field.
 */
export const INDUSTRIES: readonly Option[] = [
  { value: "manufacturing", label: "Manufacturing" },
  { value: "wholesale", label: "Wholesale" },
  { value: "retail", label: "Retail" },
  { value: "construction", label: "Construction" },
  { value: "transport-logistics", label: "Transport and logistics" },
  { value: "professional-services", label: "Professional services" },
  { value: "it-software", label: "IT and software" },
  { value: "hospitality", label: "Hospitality" },
  { value: "healthcare", label: "Healthcare" },
  { value: "agriculture", label: "Agriculture" },
  { value: "other", label: "Other" },
];

export const COUNTRIES: readonly Option[] = [
  { value: "DE", label: "Germany" },
  { value: "AT", label: "Austria" },
  { value: "CH", label: "Switzerland" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "FR", label: "France" },
  { value: "BG", label: "Bulgaria" },
  { value: "other", label: "Other" },
];

export const LOAN_PURPOSES: readonly Option[] = [
  { value: "equipment", label: "Equipment or machinery" },
  { value: "working-capital", label: "Working capital" },
  { value: "expansion", label: "Expansion or new site" },
  { value: "refinancing", label: "Refinancing existing debt" },
  { value: "real-estate", label: "Commercial property" },
  { value: "other", label: "Other" },
];

/** Offered as fixed terms because the scorecard reasons in whole years. */
export const LOAN_TERMS: readonly Option[] = [
  { value: "12", label: "12 months" },
  { value: "24", label: "24 months" },
  { value: "36", label: "36 months" },
  { value: "48", label: "48 months" },
  { value: "60", label: "60 months" },
  { value: "84", label: "84 months" },
  { value: "120", label: "120 months" },
];

/** The amount the platform is willing to take an application for, in euro. */
export const LOAN_AMOUNT_MIN = 10_000;
export const LOAN_AMOUNT_MAX = 5_000_000;
