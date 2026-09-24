"use client";

import { CheckboxField, SelectField, TextField, TextareaField } from "@/components/ui/form-field";
import {
  COUNTRIES,
  INDUSTRIES,
  LEGAL_FORMS,
  LOAN_AMOUNT_MAX,
  LOAN_AMOUNT_MIN,
  LOAN_PURPOSES,
  LOAN_TERMS,
} from "@/lib/applications/options";
import type { ApplicationFormValues, FieldErrors } from "@/lib/applications/schema";
import { formatEur } from "@/lib/format";

/**
 * The three data-entry steps.
 *
 * Each one is a plain presentational component: it receives the values and the errors and
 * reports changes upward. All the state lives in ApplicationForm, which is what lets the
 * applicant move back and forth without losing anything they typed.
 *
 * Field names are typed as ApplicationFieldName by the shared `StepProps`, so a typo in a
 * `name` fails the build rather than silently writing to a key nothing reads.
 */

export interface StepProps {
  values: ApplicationFormValues;
  errors: FieldErrors;
  onValueChange: (name: string, value: string) => void;
}

// ---------------------------------------------------------------------------------------
// Step 1: company information
// ---------------------------------------------------------------------------------------

export function CompanyStep({ values, errors, onValueChange }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        name="companyName"
        label="Registered company name"
        className="sm:col-span-2"
        value={values.companyName}
        error={errors.companyName}
        onValueChange={onValueChange}
        autoComplete="organization"
        placeholder="Nordwerk Precision GmbH"
      />

      <SelectField
        name="legalForm"
        label="Legal form"
        value={values.legalForm}
        error={errors.legalForm}
        onValueChange={onValueChange}
        options={LEGAL_FORMS}
      />

      <TextField
        name="registrationNumber"
        label="Commercial register number"
        optional
        hint="For example HRB 84021 B."
        value={values.registrationNumber}
        error={errors.registrationNumber}
        onValueChange={onValueChange}
      />

      <SelectField
        name="industry"
        label="Industry"
        value={values.industry}
        error={errors.industry}
        onValueChange={onValueChange}
        options={INDUSTRIES}
      />

      <SelectField
        name="country"
        label="Country of registration"
        value={values.country}
        error={errors.country}
        onValueChange={onValueChange}
        options={COUNTRIES}
      />

      <TextField
        name="yearFounded"
        label="Year founded"
        value={values.yearFounded}
        error={errors.yearFounded}
        onValueChange={onValueChange}
        inputMode="numeric"
        placeholder="2014"
        hint="Length of trading history is one of the scorecard factors."
      />

      <TextField
        name="employees"
        label="Number of employees"
        value={values.employees}
        error={errors.employees}
        onValueChange={onValueChange}
        inputMode="numeric"
        placeholder="38"
      />

      <div className="sm:col-span-2">
        <h3 className="border-t border-border pt-6 text-sm font-medium">Who should the analyst contact?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Used only to discuss this application. Never shown on the public status page.
        </p>
      </div>

      <TextField
        name="contactName"
        label="Contact name"
        value={values.contactName}
        error={errors.contactName}
        onValueChange={onValueChange}
        autoComplete="name"
      />

      <TextField
        name="contactEmail"
        label="Email address"
        type="email"
        value={values.contactEmail}
        error={errors.contactEmail}
        onValueChange={onValueChange}
        autoComplete="email"
      />

      <TextField
        name="contactPhone"
        label="Phone number"
        type="tel"
        optional
        value={values.contactPhone}
        error={errors.contactPhone}
        onValueChange={onValueChange}
        autoComplete="tel"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Step 2: loan request
// ---------------------------------------------------------------------------------------

export function LoanStep({ values, errors, onValueChange }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        name="loanAmountEur"
        label="Amount requested"
        prefix="EUR"
        value={values.loanAmountEur}
        error={errors.loanAmountEur}
        onValueChange={onValueChange}
        inputMode="decimal"
        placeholder="600000"
        hint={`Between ${formatEur(LOAN_AMOUNT_MIN)} and ${formatEur(LOAN_AMOUNT_MAX)}.`}
      />

      <SelectField
        name="loanTermMonths"
        label="Repayment term"
        value={values.loanTermMonths}
        error={errors.loanTermMonths}
        onValueChange={onValueChange}
        options={LOAN_TERMS}
      />

      <SelectField
        name="loanPurpose"
        label="Purpose"
        className="sm:col-span-2"
        value={values.loanPurpose}
        error={errors.loanPurpose}
        onValueChange={onValueChange}
        options={LOAN_PURPOSES}
      />

      <TextareaField
        name="purposeDescription"
        label="What will the money be used for?"
        className="sm:col-span-2"
        value={values.purposeDescription}
        error={errors.purposeDescription}
        onValueChange={onValueChange}
        rows={5}
        maxLength={1000}
        placeholder="Describe the investment, why it is needed now, and how it will be repaid."
        hint="The analyst reads this first. Concrete detail helps more than length."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Step 3: financial information
// ---------------------------------------------------------------------------------------

/** Every figure here feeds a scorecard factor; the hint says which, so nothing feels arbitrary. */
export function FinancialsStep({ values, errors, onValueChange }: StepProps) {
  const money = (name: keyof ApplicationFormValues, label: string, placeholder: string, hint?: string) => (
    <TextField
      name={name}
      label={label}
      prefix="EUR"
      value={values[name]}
      error={errors[name]}
      onValueChange={onValueChange}
      inputMode="decimal"
      placeholder={placeholder}
      hint={hint}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-md border border-border bg-secondary/60 p-4 text-[15px] leading-relaxed">
        Take these from your most recent <strong className="font-medium">completed</strong> annual accounts, not from
        a part-year figure. Enter plain numbers; a loss is entered with a minus sign, for example{" "}
        <code className="rounded bg-card px-1 py-0.5 text-sm">-45000</code>.
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="fiscalYear"
          label="Financial year these figures cover"
          value={values.fiscalYear}
          error={errors.fiscalYear}
          onValueChange={onValueChange}
          inputMode="numeric"
          placeholder={String(new Date().getUTCFullYear() - 1)}
        />
      </div>

      <section className="grid gap-5 sm:grid-cols-2">
        <h3 className="text-sm font-medium sm:col-span-2">Profit and loss</h3>
        {money("revenueEur", "Revenue", "4200000", "Drives the loan-size factor.")}
        {money("revenuePriorYearEur", "Revenue, previous year", "3900000", "Drives the revenue-trend factor.")}
        {money("ebitdaEur", "EBITDA", "630000", "Drives leverage and interest coverage.")}
        {money("netIncomeEur", "Net income after tax", "260000", "Drives the profitability factor.")}
        {money("interestExpenseEur", "Interest expense", "70000", "Drives interest coverage.")}
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <h3 className="text-sm font-medium sm:col-span-2">Balance sheet at year end</h3>
        {money("existingDebtEur", "Existing interest-bearing debt", "1200000", "Excludes trade payables.")}
        {money("totalAssetsEur", "Total assets", "3500000", "Drives the capital-structure factor.")}
        {money("currentAssetsEur", "Current assets", "1400000", "Stock, receivables and cash.")}
        {money("currentLiabilitiesEur", "Current liabilities", "900000", "Due within twelve months.")}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// The declaration on step 4, kept here so all form controls live together.
// ---------------------------------------------------------------------------------------

export function AccuracyDeclaration({ values, errors, onValueChange }: StepProps) {
  return (
    <CheckboxField
      name="confirmAccuracy"
      value={values.confirmAccuracy}
      error={errors.confirmAccuracy}
      onValueChange={onValueChange}
      label={
        <>
          I confirm that the figures above are taken from our annual accounts and are accurate to the best of my
          knowledge.
        </>
      }
    />
  );
}
