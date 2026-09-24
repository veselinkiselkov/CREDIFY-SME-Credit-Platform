import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * SUPABASE ACCESS: server-side only, on purpose.
 *
 * The `import "server-only"` line at the top is a build-time tripwire. If any file that
 * ends up in the browser bundle ever imports this module, the build FAILS with a clear
 * error instead of quietly shipping a database key to the public. That is the mechanism
 * that enforces "no secret keys in the client".
 *
 * WHICH KEY, AND WHY
 *
 * Supabase issues two kinds of API key:
 *
 *   sb_publishable_...  replaces the old `anon` key. Safe to ship to a browser, because
 *                       every query it makes is still gated by Row Level Security.
 *   sb_secret_...       replaces the old `service_role` key. It carries Postgres's
 *                       BYPASSRLS attribute, so it skips every policy. Server-side only.
 *
 * Credify uses the SECRET key and no publishable key at all, because the browser never
 * talks to Supabase directly.
 *
 * The usual Supabase setup puts the publishable key in the browser and relies on RLS
 * policies to decide what it may read. Credify has no login yet, so any policy permissive
 * enough for an anonymous applicant to read their own application would also be permissive
 * enough for anyone else to read every application, financial figures included.
 *
 * Credify therefore does the opposite: every read and write goes through a Next.js Server
 * Action or a server-rendered page in this codebase, which is the only place the key
 * exists. Row Level Security is switched on with NO policies, so the table is unreadable to
 * every key except this one. The application's own code becomes the access rule, and it is
 * a rule we can read and review.
 *
 * The cost is that Supabase's client-side features (realtime, direct queries) are
 * unavailable. Credify does not need them. When authentication arrives, this decision is
 * revisited: real users mean real RLS policies and a publishable key in the browser.
 *
 * The variable below is not prefixed NEXT_PUBLIC_, which is what stops Next.js from
 * inlining it into browser JavaScript.
 *
 * Legacy note: the older `service_role` JWT (the long `eyJ...` string) still works and
 * grants the same access, so an existing deployment does not break. Supabase has it on a
 * deprecation path, and Credify follows the current recommendation. Either value can be
 * placed in SUPABASE_SECRET_KEY; nothing in this file inspects its format.
 */

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY " +
        "in .env.local (locally) or in the Vercel project settings (deployed). " +
        "See supabase/README.md for the setup steps.",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

/**
 * True when both environment variables are present.
 *
 * Pages call this before querying so that an unconfigured deployment shows a clear,
 * honest "not connected yet" panel instead of a stack trace. Day 1's build and the
 * landing page keep working with no Supabase project at all.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

// One client per server process. Creating a client is cheap but not free, and Supabase
// pools connections for us, so there is no reason to build a new one on every request.
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new SupabaseNotConfiguredError();

  cached = createClient(url, secretKey, {
    auth: {
      // No user sessions exist, so there is nothing to persist or refresh.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
