"use client";

import {
  COUNTRIES,
  INDUSTRIES,
  LEGAL_FORMS,
  LOAN_PURPOSES,
  LOAN_TERMS,
  type Option,
} from "@/lib/applications/options";
import { parseAmount, type ApplicationFormValues } from "@/lib/applications/schema";
import { formatEur, formatNumber } from "@/lib/format";

/**
 * Step 4: everything the applicant entered, read back to them.
 *
 * This step is the point of having a multi-step form at all. Steps 1 to 3 ask for figures
 * a business owner has to look up; this one gives them a single page to check before those
 * figures reach a credit analyst. Codes are resolved to their labels and amounts are
 * formatted, so what is shown here is what the analyst will see, not what was typed.
 *
 * Every group has its own "Edit" control that jumps straight back to the right step, with
 * the answers still in place.
 */

function labelFor(options: readonly Option[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Formats a raw input string as euro, falling back to the raw text if it will not parse. */
function money(raw: string): string {
  const parsed = parseAmount(raw);
  return parsed === null ? raw || "—" : formatEur(parsed);
}

function count(raw: string): string {
  const parsed = parseAmount(raw);
  return parsed === null ? raw || "—" : formatNumber(parsed);
}

function optional(raw: string): string {
  return raw.trim() === "" ? "Not provided" : raw;
}

interface SectionProps {
  title: string;
  onEdit: () => void;
  rows: { label: string; value: string }[];
  /** Long free text shown below the rows rather than squeezed into a column. */
  note?: { label: string; value: string };
}

function ReviewSection({ title, onEdit, rows, note }: SectionProps) {
  return (
    <section className="border-t-2 border-foreground pt-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-primary underline underline-offset-4 hover:text-brand-strong"
        >
          Edit<span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>

      <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="text-right text-[15px] tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>

      {note && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{note.label}</p>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{note.value || "—"}</p>
        </div>
      )}
    </section>
  );
}

interface ReviewStepProps {
  values: ApplicationFormValues;
  onEditStep: (index: number) => void;
}

export function ReviewStep({ values, onEditStep }: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-10">
      <ReviewSection
        title="Company information"
        onEdit={() => onEditStep(0)}
        rows={[
          { label: "Company name", value: values.companyName || "—" },
          { label: "Legal form", value: labelFor(LEGAL_FORMS, values.legalForm) },
          { label: "Register number", value: optional(values.registrationNumber) },
          { label: "Industry", value: labelFor(INDUSTRIES, values.industry) },
          { label: "Country", value: labelFor(COUNTRIES, values.country) },
          { label: "Year founded", value: values.yearFounded || "—" },
          { label: "Employees", value: count(values.employees) },
          { label: "Contact", value: values.contactName || "—" },
          { label: "Email", value: values.contactEmail || "—" },
          { label: "Phone", value: optional(values.contactPhone) },
        ]}
      />

      <ReviewSection
        title="Loan request"
        onEdit={() => onEditStep(1)}
        rows={[
          { label: "Amount requested", value: money(values.loanAmountEur) },
          { label: "Repayment term", value: labelFor(LOAN_TERMS, values.loanTermMonths) },
          { label: "Purpose", value: labelFor(LOAN_PURPOSES, values.loanPurpose) },
        ]}
        note={{ label: "What the money will be used for", value: values.purposeDescription }}
      />

      <ReviewSection
        title="Financial information"
        onEdit={() => onEditStep(2)}
        rows={[
          { label: "Financial year", value: values.fiscalYear || "—" },
          { label: "Revenue", value: money(values.revenueEur) },
          { label: "Revenue, previous year", value: money(values.revenuePriorYearEur) },
          { label: "EBITDA", value: money(values.ebitdaEur) },
          { label: "Net income", value: money(values.netIncomeEur) },
          { label: "Interest expense", value: money(values.interestExpenseEur) },
          { label: "Existing debt", value: money(values.existingDebtEur) },
          { label: "Total assets", value: money(values.totalAssetsEur) },
          { label: "Current assets", value: money(values.currentAssetsEur) },
          { label: "Cash", value: money(values.cashEur) },
          { label: "Current liabilities", value: money(values.currentLiabilitiesEur) },
          { label: "Total liabilities", value: money(values.totalLiabilitiesEur) },
          { label: "Shareholders' equity", value: money(values.equityEur) },
        ]}
      />
    </div>
  );
}
