import { z } from "zod";
import {
  COUNTRIES,
  INDUSTRIES,
  LEGAL_FORMS,
  LOAN_AMOUNT_MAX,
  LOAN_AMOUNT_MIN,
  LOAN_PURPOSES,
  LOAN_TERMS,
  valuesOf,
} from "./options";

/**
 * APPLICATION SCHEMA: the single source of truth for what a valid application is.
 *
 * The same schema runs twice:
 *   1. in the browser, one step at a time, so the applicant sees mistakes immediately;
 *   2. on the server inside the submit action, before anything reaches the database.
 *
 * The second run is the one that matters. Browser validation is a convenience and can be
 * bypassed by anyone with developer tools open, so the server never trusts it.
 *
 * Every field arrives as a string, because that is what an HTML form produces. The schema
 * both validates and converts: `z.infer<typeof applicationSchema>` is fully typed, with
 * real numbers where the database expects numbers.
 */

const CURRENT_YEAR = new Date().getUTCFullYear();
const OLDEST_FOUNDING_YEAR = 1800;
/** Generous ceiling that still rejects an accidental extra digit or a pasted phone number. */
const MAX_MONEY = 1_000_000_000;

/**
 * Accepts the ways people actually type amounts: "4200000", "4 200 000", "4,200,000",
 * "4200000.50". Spaces, apostrophes and commas are treated as digit grouping and removed;
 * a dot is the decimal separator. Anything else is rejected rather than guessed at, because
 * silently misreading "4.200" as four euro twenty would corrupt the credit analysis.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s'’ ]/g, "").replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

interface NumberFieldOptions {
  min?: number;
  max?: number;
  integer?: boolean;
  /** Shown in the "must be a number" message so the expected shape is obvious. */
  example?: string;
}

/** Builds a "string in, validated number out" field with messages written for a human. */
function numberField(label: string, { min, max, integer = false, example = "250000" }: NumberFieldOptions = {}) {
  let numeric = z.number();
  if (integer) numeric = numeric.int(`${label} must be a whole number.`);
  if (min !== undefined) numeric = numeric.min(min, `${label} cannot be below ${min.toLocaleString("en-GB")}.`);
  if (max !== undefined) numeric = numeric.max(max, `${label} cannot be above ${max.toLocaleString("en-GB")}.`);

  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .transform((raw, ctx) => {
      const parsed = parseAmount(raw);
      if (parsed === null) {
        ctx.addIssue({ code: "custom", message: `${label} must be a number, for example ${example}.` });
        return z.NEVER;
      }
      return parsed;
    })
    .pipe(numeric);
}

/** A required free-text field. */
function textField(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
    .max(max, `${label} cannot be longer than ${max} characters.`);
}

/** An optional free-text field. Blank is stored as null rather than an empty string. */
function optionalTextField(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, `${label} cannot be longer than ${max} characters.`)
    .transform((value) => (value.length === 0 ? null : value));
}

/** A dropdown. The allowed values come from the same list the dropdown renders. */
function choiceField(label: string, options: Parameters<typeof valuesOf>[0]) {
  return z.enum(valuesOf(options), { message: `Please choose ${label}.` });
}

/*
  THE FIELDS.

  Declared as a plain object rather than inside z.object() so the same definitions can be
  reused three ways: the whole schema, one step's schema, and the list of field names.
*/
const applicationFields = {
  // --- Step 1: company information -------------------------------------------------
  companyName: textField("Company name", 2, 120),
  legalForm: choiceField("a legal form", LEGAL_FORMS),
  registrationNumber: optionalTextField("Registration number", 60),
  industry: choiceField("an industry", INDUSTRIES),
  country: choiceField("a country", COUNTRIES),
  yearFounded: numberField("Year founded", {
    min: OLDEST_FOUNDING_YEAR,
    max: CURRENT_YEAR,
    integer: true,
    example: "2014",
  }),
  employees: numberField("Number of employees", { min: 1, max: 100_000, integer: true, example: "24" }),
  contactName: textField("Contact name", 2, 120),
  contactEmail: z.email("Please enter a valid email address.").max(160),
  contactPhone: optionalTextField("Phone number", 40),

  // --- Step 2: loan request --------------------------------------------------------
  loanAmountEur: numberField("Loan amount", { min: LOAN_AMOUNT_MIN, max: LOAN_AMOUNT_MAX, example: "600000" }),
  loanTermMonths: choiceField("a repayment term", LOAN_TERMS).transform(Number),
  loanPurpose: choiceField("a purpose", LOAN_PURPOSES),
  purposeDescription: textField("Purpose description", 20, 1000),

  // --- Step 3: financial information ----------------------------------------------
  // Eleven of these twelve figures feed the Day 3 scorecard. Cash is the exception: it
  // is collected so the engine can check it against current assets, and is never scored.
  fiscalYear: numberField("Financial year", {
    min: CURRENT_YEAR - 5,
    max: CURRENT_YEAR,
    integer: true,
    example: String(CURRENT_YEAR - 1),
  }),
  revenueEur: numberField("Revenue", { min: 1, max: MAX_MONEY, example: "4200000" }),
  revenuePriorYearEur: numberField("Revenue, prior year", { min: 0, max: MAX_MONEY, example: "3900000" }),
  // EBITDA and net income may be negative: a loss-making year is a fact the analyst must see,
  // not an input error. Day 3 treats an EBITDA of zero or less as a critical flag.
  ebitdaEur: numberField("EBITDA", { min: -MAX_MONEY, max: MAX_MONEY, example: "630000" }),
  netIncomeEur: numberField("Net income", { min: -MAX_MONEY, max: MAX_MONEY, example: "260000" }),
  interestExpenseEur: numberField("Interest expense", { min: 0, max: MAX_MONEY, example: "70000" }),
  existingDebtEur: numberField("Existing debt", { min: 0, max: MAX_MONEY, example: "1200000" }),
  totalAssetsEur: numberField("Total assets", { min: 1, max: MAX_MONEY, example: "3500000" }),
  currentAssetsEur: numberField("Current assets", { min: 0, max: MAX_MONEY, example: "1400000" }),
  // Cash is a COMPONENT of current assets, not an addition to them. It earns no points: it
  // exists so the engine can check that it sits inside current assets, and so an analyst can
  // see how much of the liquidity position is actually cash rather than stock or receivables.
  cashEur: numberField("Cash", { min: 0, max: MAX_MONEY, example: "500000" }),
  currentLiabilitiesEur: numberField("Current liabilities", { min: 0, max: MAX_MONEY, example: "900000" }),
  totalLiabilitiesEur: numberField("Total liabilities", { min: 0, max: MAX_MONEY, example: "2100000" }),
  // Equity may be negative: a business whose liabilities exceed its assets is exactly the
  // case the scorecard's negative-equity critical flag exists to catch, so the figure has to
  // be accepted rather than rejected at the form.
  equityEur: numberField("Shareholders' equity", { min: -MAX_MONEY, max: MAX_MONEY, example: "1400000" }),

  // --- Step 4: review and submit ---------------------------------------------------
  confirmAccuracy: z
    .string()
    .refine((value) => value === "true", "Please confirm the figures are accurate before submitting.")
    .transform(() => true),
} as const;

export type ApplicationFieldName = keyof typeof applicationFields;

/** Form state: every field is a string, which is what inputs and `FormData` give us. */
export type ApplicationFormValues = Record<ApplicationFieldName, string>;

/*
  THE FOUR STEPS.

  Each step lists the fields it owns. "Next" validates only those fields, so the applicant
  is never shown an error about a question they have not reached yet.
*/
export const APPLICATION_STEPS = [
  {
    id: "company",
    title: "Company information",
    summary: "Who is applying.",
    fields: [
      "companyName",
      "legalForm",
      "registrationNumber",
      "industry",
      "country",
      "yearFounded",
      "employees",
      "contactName",
      "contactEmail",
      "contactPhone",
    ],
  },
  {
    id: "loan",
    title: "Loan request",
    summary: "How much, for how long, and what for.",
    fields: ["loanAmountEur", "loanTermMonths", "loanPurpose", "purposeDescription"],
  },
  {
    id: "financials",
    title: "Financial information",
    summary: "Figures from your most recent annual accounts.",
    fields: [
      "fiscalYear",
      "revenueEur",
      "revenuePriorYearEur",
      "ebitdaEur",
      "netIncomeEur",
      "interestExpenseEur",
      "existingDebtEur",
      "totalAssetsEur",
      "currentAssetsEur",
      "cashEur",
      "currentLiabilitiesEur",
      "totalLiabilitiesEur",
      "equityEur",
    ],
  },
  {
    id: "review",
    title: "Review and submit",
    summary: "Check everything before it reaches an analyst.",
    fields: ["confirmAccuracy"],
  },
] as const satisfies readonly { id: string; title: string; summary: string; fields: readonly ApplicationFieldName[] }[];

export type ApplicationStepId = (typeof APPLICATION_STEPS)[number]["id"];
export const STEP_COUNT = APPLICATION_STEPS.length;

/**
 * Checks that hold between fields, so they can only run once every value involved exists.
 * Deliberately few: the form should catch impossible balance sheets, not audit them.
 */
function checkFinancialConsistency(
  values: {
    currentAssetsEur: number;
    totalAssetsEur: number;
    currentLiabilitiesEur: number;
    totalLiabilitiesEur: number;
  },
  ctx: z.RefinementCtx,
) {
  if (values.currentAssetsEur > values.totalAssetsEur) {
    ctx.addIssue({
      code: "custom",
      path: ["currentAssetsEur"],
      message: "Current assets cannot be greater than total assets.",
    });
  }

  if (values.currentLiabilitiesEur > values.totalLiabilitiesEur) {
    ctx.addIssue({
      code: "custom",
      path: ["totalLiabilitiesEur"],
      message: "Total liabilities cannot be less than current liabilities.",
    });
  }

  // Cash above current assets is NOT enforced here either, for the same reason: the credit
  // engine raises it as a data-quality warning so the analyst can query it, rather than the
  // form refusing a submission over a figure that may simply have been read off the wrong line.
  //
  // Assets = liabilities + equity is NOT enforced here, deliberately. A balance sheet that
  // is a few percent out is nearly always rounding or a figure taken from a different
  // statement, and blocking the whole application over it would be wrong. The credit engine
  // raises it as a data-quality warning for the analyst instead. Only the two genuinely
  // impossible relationships above are hard errors.
}

/** The whole application. Used by the server action before writing to the database. */
export const applicationSchema = z.object(applicationFields).superRefine(checkFinancialConsistency);

/** A validated, type-safe application with real numbers. */
export type ApplicationInput = z.infer<typeof applicationSchema>;

/** Field name -> first error message. The shape the form renders directly. */
export type FieldErrors = Partial<Record<ApplicationFieldName, string>>;

function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    // Only the first message per field is kept: showing three at once under one input
    // is noise, and the applicant fixes them one at a time anyway.
    if (typeof field === "string" && !(field in errors)) {
      errors[field as ApplicationFieldName] = issue.message;
    }
  }
  return errors;
}

/**
 * Validates one step in isolation. Step 3 also runs the cross-field checks,
 * because by then every figure they involve has been entered.
 */
export function validateStep(stepIndex: number, values: ApplicationFormValues): FieldErrors {
  const step = APPLICATION_STEPS[stepIndex];
  if (!step) return {};

  const shape = Object.fromEntries(step.fields.map((name) => [name, applicationFields[name]]));
  const base = z.object(shape as Record<string, z.ZodTypeAny>);
  const schema =
    step.id === "financials"
      ? base.superRefine((value, ctx) => checkFinancialConsistency(value as never, ctx))
      : base;

  const result = schema.safeParse(pick(values, step.fields));
  return result.success ? {} : toFieldErrors(result.error);
}

/** Validates the complete application. Used on the server. */
export function validateApplication(
  values: unknown,
): { success: true; data: ApplicationInput } | { success: false; errors: FieldErrors } {
  const result = applicationSchema.safeParse(values);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: toFieldErrors(result.error) };
}

function pick(values: ApplicationFormValues, fields: readonly ApplicationFieldName[]) {
  return Object.fromEntries(fields.map((name) => [name, values[name]]));
}

/** A blank form. Listing every field explicitly keeps it type-checked against the schema. */
export const EMPTY_APPLICATION: ApplicationFormValues = {
  companyName: "",
  legalForm: "",
  registrationNumber: "",
  industry: "",
  country: "",
  yearFounded: "",
  employees: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  loanAmountEur: "",
  loanTermMonths: "",
  loanPurpose: "",
  purposeDescription: "",
  fiscalYear: "",
  revenueEur: "",
  revenuePriorYearEur: "",
  ebitdaEur: "",
  netIncomeEur: "",
  interestExpenseEur: "",
  existingDebtEur: "",
  totalAssetsEur: "",
  currentAssetsEur: "",
  cashEur: "",
  currentLiabilitiesEur: "",
  totalLiabilitiesEur: "",
  equityEur: "",
  confirmAccuracy: "false",
};

/** Field names in schema order. The server action uses it to read the submitted form. */
export const APPLICATION_FIELD_NAMES = Object.keys(applicationFields) as ApplicationFieldName[];
