import { randomInt } from "node:crypto";

/**
 * APPLICATION REFERENCE: the short code an applicant quotes when they get in touch,
 * for example CR-2026-7K4QP2.
 *
 * Why generate it here rather than in Postgres?
 *   - the format stays visible in the codebase instead of hiding in a database default;
 *   - it needs no migration to change;
 *   - the same code runs in tests without a database.
 *
 * The alphabet leaves out I, L, O, U, 0 and 1, so a reference read over the phone or copied
 * off a screen cannot be mistyped as a different valid one. That leaves 30 usable symbols
 * and about 729 million combinations per year, which is far more than a demo needs, and the
 * database's UNIQUE constraint is the real guarantee (see insertApplication).
 *
 * A reference is NOT a secret. It identifies an application; it does not grant access to
 * one. The status page is reached by a separate random token, so knowing or guessing a
 * reference reveals nothing.
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 6;

export function generateReference(now: Date = new Date()): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    // randomInt is crypto-grade and free of the modulo bias a plain Math.random has.
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `CR-${now.getUTCFullYear()}-${code}`;
}

/** Loose shape check, used to reject junk in a URL before it reaches the database. */
export function looksLikeReference(value: string): boolean {
  return new RegExp(`^CR-\\d{4}-[${ALPHABET}]{${CODE_LENGTH}}$`).test(value);
}

/**
 * Shape check for the status-page token.
 *
 * `access_token` is a Postgres `uuid` column, so querying it with anything that is not a
 * UUID makes Postgres raise a type error rather than return no rows. Checking the shape in
 * the page turns a would-be 500 into an ordinary 404, and stops junk in the address bar
 * from reaching the database at all.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeAccessToken(value: string): boolean {
  return UUID_PATTERN.test(value);
}
