"use server";

import { revalidatePath } from "next/cache";
import { recordAnalystDecision } from "@/lib/applications/repository";
import { validateDecision, type DecisionInput } from "@/lib/analyst/decision";
import { SupabaseNotConfiguredError } from "@/lib/supabase/server";

/**
 * RECORDING A DECISION.
 *
 * "use server" makes this callable from the analyst's browser, but it only ever RUNS on the
 * server: Next.js replaces the import in the client bundle with a network call, so the
 * database key and the repository never reach the browser.
 *
 * The application is addressed by its internal `id`. The applicant's `access_token` is not
 * an input here, is not read, and is not returned - it stays what it has always been, the
 * capability that opens the applicant's own status page and nothing else.
 *
 * WHAT THIS FUNCTION CANNOT DO
 * It takes an action and a message. It never loads the assessment, so there is no path by
 * which a score, a grade or a critical flag could influence what is recorded. The analyst
 * decides; the scorecard only informs. A test asserts that a decision leaves the calculated
 * score untouched.
 */

export interface DecisionResult {
  ok: boolean;
  /** Errors keyed by field, if the server rejected something the browser let through. */
  errors?: { action?: string; message?: string };
  /** A problem that is not about any one field. */
  formError?: string;
}

export async function submitDecision(id: string, input: DecisionInput): Promise<DecisionResult> {
  // Validated again here even though the browser already checked: a server action is a
  // public HTTP endpoint and anyone can post to it.
  const validation = validateDecision(input);
  if (!validation.ok) return { ok: false, errors: validation.errors };

  try {
    const updated = await recordAnalystDecision(
      id,
      validation.decision.status,
      validation.decision.analystMessage,
    );
    if (!updated) {
      return { ok: false, formError: "That application no longer exists. Refresh the dashboard and try again." };
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) {
      return { ok: false, formError: "The application database is not connected, so nothing was saved." };
    }
    // The real reason goes to the server log; the analyst gets a plain sentence, because a
    // database error message can disclose table and column names.
    console.error("[credify] submitDecision failed:", error);
    return { ok: false, formError: "Something went wrong while saving the decision. Please try again." };
  }

  // Refresh both analyst views. The applicant's status page is force-dynamic, so it picks
  // the change up on its next load without being revalidated here.
  revalidatePath("/analyst");
  revalidatePath(`/analyst/applications/${id}`);

  return { ok: true };
}
