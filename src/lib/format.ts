/**
 * Shared formatters. Kept in one file so a euro amount looks identical on the review step,
 * the confirmation page, the landing page and (from Day 4) the analyst dashboard.
 *
 * The locale is "en-IE": English, and the euro zone's English-language convention of a
 * leading symbol with comma grouping, EUR 1,250,000. It is the locale Day 1's landing page
 * already used, so amounts read the same across the whole site. Fixing the locale rather
 * than using the visitor's own is deliberate: a figure an analyst and an applicant discuss
 * over the phone must not be grouped differently on their two screens.
 */

const EUR = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const PLAIN = new Intl.NumberFormat("en-IE");

/** EUR 1,250,000. Whole euro, because credit figures are never discussed to the cent. */
export function formatEur(value: number): string {
  return EUR.format(value);
}

export function formatNumber(value: number): string {
  return PLAIN.format(value);
}

/** "21 September 2026, 14:05" in UTC, so the timestamp reads the same for everyone. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}
