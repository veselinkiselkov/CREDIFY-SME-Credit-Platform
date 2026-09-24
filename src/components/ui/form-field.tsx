import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * FORM FIELDS, in the shadcn/ui pattern and using only the design tokens from globals.css.
 *
 * All four field types live in one file so the accessibility wiring is written once:
 *
 *   - the <label> is joined to its input by `htmlFor`/`id`, so clicking the label focuses
 *     the input and a screen reader announces the two together;
 *   - the hint and the error message are joined by `aria-describedby`, so a screen reader
 *     reads the error out instead of leaving a silently red box;
 *   - `aria-invalid` marks the field as wrong independently of colour, which matters for
 *     anyone who cannot see the red border.
 *
 * Getting that wrong once in a shared file is much easier to spot than getting it wrong in
 * twenty places.
 */

const CONTROL_BASE =
  "w-full rounded-md border bg-card px-3 text-[15px] text-foreground transition-colors " +
  "placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60";

function controlClasses(hasError: boolean, extra?: string) {
  return cn(CONTROL_BASE, hasError ? "border-destructive" : "border-input hover:border-muted-foreground/40", extra);
}

interface FieldShellProps {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (describedBy: string | undefined, hasError: boolean) => React.ReactNode;
}

/** Label above, control in the middle, hint or error below. Never both at once. */
function FieldShell({ name, label, hint, error, optional, className, children }: FieldShellProps) {
  const hasError = Boolean(error);
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = hasError ? `${name}-error` : undefined;
  const describedBy = errorId ?? hintId;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="flex items-baseline justify-between gap-2 text-sm font-medium">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
      </label>

      {children(describedBy, hasError)}

      {hasError ? (
        // role="alert" makes a screen reader announce the message the moment it appears.
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type ChangeHandler = (name: string, value: string) => void;

interface TextFieldProps extends Omit<FieldShellProps, "children"> {
  value: string;
  onValueChange: ChangeHandler;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  /** A fixed unit shown inside the field, e.g. "EUR". Purely visual; never submitted. */
  prefix?: string;
}

export function TextField({
  value,
  onValueChange,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  prefix,
  ...shell
}: TextFieldProps) {
  return (
    <FieldShell {...shell}>
      {(describedBy, hasError) => (
        <div className="relative">
          {prefix && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[15px] text-muted-foreground"
            >
              {prefix}
            </span>
          )}
          <input
            id={shell.name}
            name={shell.name}
            type={type}
            value={value}
            onChange={(event) => onValueChange(shell.name, event.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            className={controlClasses(hasError, cn("h-10", prefix && "pl-12"))}
          />
        </div>
      )}
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<FieldShellProps, "children"> {
  value: string;
  onValueChange: ChangeHandler;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({ value, onValueChange, options, placeholder = "Select…", ...shell }: SelectFieldProps) {
  return (
    <FieldShell {...shell}>
      {(describedBy, hasError) => (
        <select
          id={shell.name}
          name={shell.name}
          value={value}
          onChange={(event) => onValueChange(shell.name, event.target.value)}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          // A native <select> is used on purpose: it is keyboard accessible, works on every
          // phone, and needs no JavaScript. A custom dropdown would look identical and
          // behave worse.
          className={controlClasses(hasError, cn("h-10 appearance-none pr-9", value === "" && "text-muted-foreground"))}
          style={{
            // Chevron drawn in the brand ink colour, inline so it needs no icon library.
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2355616b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.75rem center",
          }}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

interface TextareaFieldProps extends Omit<FieldShellProps, "children"> {
  value: string;
  onValueChange: ChangeHandler;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export function TextareaField({
  value,
  onValueChange,
  placeholder,
  rows = 4,
  maxLength,
  ...shell
}: TextareaFieldProps) {
  return (
    <FieldShell {...shell}>
      {(describedBy, hasError) => (
        <>
          <textarea
            id={shell.name}
            name={shell.name}
            value={value}
            rows={rows}
            maxLength={maxLength}
            onChange={(event) => onValueChange(shell.name, event.target.value)}
            placeholder={placeholder}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            className={controlClasses(hasError, "resize-y py-2 leading-relaxed")}
          />
          {maxLength && (
            <p className="text-right text-xs tabular-nums text-muted-foreground">
              {value.length} / {maxLength}
            </p>
          )}
        </>
      )}
    </FieldShell>
  );
}

interface CheckboxFieldProps {
  name: string;
  label: React.ReactNode;
  /** Stored as the string "true" or "false" so the form state stays uniformly strings. */
  value: string;
  onValueChange: ChangeHandler;
  error?: string;
}

export function CheckboxField({ name, label, value, onValueChange, error }: CheckboxFieldProps) {
  const hasError = Boolean(error);
  const errorId = hasError ? `${name}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={name}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-md border bg-card p-4 text-[15px] leading-relaxed transition-colors",
          hasError ? "border-destructive" : "border-input hover:border-muted-foreground/40",
        )}
      >
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={value === "true"}
          onChange={(event) => onValueChange(name, String(event.target.checked))}
          aria-invalid={hasError || undefined}
          aria-describedby={errorId}
          className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
        />
        <span>{label}</span>
      </label>
      {hasError && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
