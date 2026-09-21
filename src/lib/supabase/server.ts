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
 * WHY THE SERVICE-ROLE KEY, AND NOT THE PUBLIC ANON KEY?
 *
 * The usual Supabase setup puts the anon key in the browser and relies on Row Level
 * Security policies to decide what that key may read. Credify has no login yet, so any
 * policy permissive enough for an anonymous applicant to read their own application would
 * also be permissive enough for anyone else to read every application, financial figures
 * included.
 *
 * Credify therefore does the opposite: the browser never talks to Supabase at all. Every
 * read and write goes through a Next.js Server Action or a server-rendered page in this
 * codebase, which is the only place the key exists. Row Level Security is switched on with
 * NO policies, so the table is unreadable to every key except this one. The application's
 * own code becomes the access rule, and it is a rule we can read and review.
 *
 * The cost is that Supabase's client-side features (realtime, direct queries) are
 * unavailable. Credify does not need them. When authentication arrives, this decision is
 * revisited: real users mean real RLS policies.
 *
 * Neither variable below is prefixed NEXT_PUBLIC_, which is what stops Next.js from
 * inlining either of them into browser JavaScript.
 */

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
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
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// One client per server process. Creating a client is cheap but not free, and Supabase
// pools connections for us, so there is no reason to build a new one on every request.
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new SupabaseNotConfiguredError();

  cached = createClient(url, serviceRoleKey, {
    auth: {
      // No user sessions exist, so there is nothing to persist or refresh.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
