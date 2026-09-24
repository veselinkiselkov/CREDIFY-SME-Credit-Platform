"use server";

import { redirect } from "next/navigation";
import { insertApplication } from "@/lib/applications/repository";
import { validateApplication, type FieldErrors } from "@/lib/applications/schema";
import { SupabaseNotConfiguredError } from "@/lib/supabase/server";

/**
 * SUBMIT ACTION.
 *
 * "use server" makes this function callable from the browser, but it only ever RUNS on the
 * server: Next.js replaces the import in the client bundle with a network call. That is why
 * the database key, and the repository that reads it, never reach the browser.
 *
 * The form already validated every step before allowing submission. This action validates
 * the whole thing again anyway, because the browser check is a convenience for the
 * applicant, not a security control: a server action is a public HTTP endpoint and anyone
 * can post anything to it. Only what comes out of `validateApplication` is ever written.
 */

export interface SubmitApplicationResult {
  /** Errors keyed by field, if the server rejected something the browser let through. */
  fieldErrors?: FieldErrors;
  /** A problem that is not about any one field, e.g. the database being unreachable. */
  formError?: string;
}

export async function submitApplication(values: unknown): Promise<SubmitApplicationResult> {
  const result = validateApplication(values);
  if (!result.success) {
    return { fieldErrors: result.errors };
  }

  let accessToken: string;
  try {
    const saved = await insertApplication(result.data);
    accessToken = saved.accessToken;
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) {
      return {
        formError:
          "The application database is not connected yet, so nothing was saved. " +
          "If you are running Credify locally, add SUPABASE_URL and SUPABASE_SECRET_KEY " +
          "to .env.local and restart the dev server.",
      };
    }
    // The real reason goes to the server log, where the team can see it. The applicant gets
    // a plain sentence: a database error message can disclose table and column names.
    console.error("[credify] submitApplication failed:", error);
    return {
      formError: "Something went wrong while saving your application. Please try again in a moment.",
    };
  }

  // Outside the try/catch on purpose. redirect() works by throwing a control-flow signal
  // that Next.js catches; inside the block above, our own catch would swallow it and the
  // applicant would see a "something went wrong" message after a successful save.
  redirect(`/apply/submitted/${accessToken}`);
}
