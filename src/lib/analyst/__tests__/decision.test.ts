import { describe, expect, it } from "vitest";
import { assess } from "@/lib/credit";
import { DECISION_META, DECISIONS, isFinalDecision, validateDecision } from "../decision";
import { scoreApplication } from "../scoring";
import { NORDWERK_RECORD, NOW, recordWith } from "./fixtures";

/**
 * THE DECISION WORKFLOW.
 *
 * The last block is the one that matters most: a decision is something a person chooses.
 * No score, grade or critical flag can reach the decision path, and recording a decision
 * cannot move a score.
 */

describe("request information", () => {
  it("requires a message", () => {
    const result = validateDecision({ action: "request_information", message: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.message).toMatch(/required/i);
  });

  it("rejects a message that is only whitespace", () => {
    expect(validateDecision({ action: "request_information", message: "    " }).ok).toBe(false);
  });

  it("rejects a message too short to act on", () => {
    const result = validateDecision({ action: "request_information", message: "send" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.message).toMatch(/at least/i);
  });

  it("sets the status to information_requested and keeps the message", () => {
    const result = validateDecision({
      action: "request_information",
      message: "Please send your interim accounts to 31 March.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision.status).toBe("information_requested");
    expect(result.decision.analystMessage).toBe("Please send your interim accounts to 31 March.");
  });

  it("trims surrounding whitespace before storing", () => {
    const result = validateDecision({ action: "request_information", message: "  Please send the accounts.  " });
    if (!result.ok) throw new Error("expected valid");
    expect(result.decision.analystMessage).toBe("Please send the accounts.");
  });
});

describe("approve", () => {
  it("does not require a message", () => {
    const result = validateDecision({ action: "approve", message: "" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision.status).toBe("approved");
  });

  it("stores an omitted message as null, not an empty string", () => {
    const result = validateDecision({ action: "approve", message: "   " });
    if (!result.ok) throw new Error("expected valid");
    // The applicant's status page can then simply test for a message.
    expect(result.decision.analystMessage).toBeNull();
  });

  it("keeps an optional message when one is given", () => {
    const result = validateDecision({ action: "approve", message: "Approved at the requested amount." });
    if (!result.ok) throw new Error("expected valid");
    expect(result.decision.analystMessage).toBe("Approved at the requested amount.");
  });
});

describe("decline", () => {
  it("requires an explanation", () => {
    const result = validateDecision({ action: "decline", message: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.message).toMatch(/required/i);
  });

  it("sets the status to declined and keeps the explanation", () => {
    const result = validateDecision({
      action: "decline",
      message: "Leverage after the requested facility would exceed our appetite for this sector.",
    });
    if (!result.ok) throw new Error("expected valid");
    expect(result.decision.status).toBe("declined");
    expect(result.decision.analystMessage).toMatch(/Leverage after/);
  });
});

describe("input the analyst cannot send", () => {
  it("rejects an unknown action", () => {
    const result = validateDecision({ action: "delete_everything", message: "x".repeat(40) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.action).toBeDefined();
  });

  it("rejects an empty action", () => {
    expect(validateDecision({ action: "", message: "" }).ok).toBe(false);
  });

  it("rejects an over-long message", () => {
    const result = validateDecision({ action: "approve", message: "x".repeat(1001) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.message).toMatch(/longer than/i);
  });

  it("only ever produces one of the three known statuses", () => {
    for (const action of DECISIONS) {
      const result = validateDecision({ action, message: "A sufficiently long message for validation." });
      if (!result.ok) throw new Error(`${action} should be valid`);
      expect(["information_requested", "approved", "declined"]).toContain(result.decision.status);
    }
  });
});

describe("the recorded state", () => {
  it("treats approved and declined as final", () => {
    expect(isFinalDecision("approved")).toBe(true);
    expect(isFinalDecision("declined")).toBe(true);
  });

  it("does not treat submitted, in review or information requested as final", () => {
    expect(isFinalDecision("submitted")).toBe(false);
    expect(isFinalDecision("in_review")).toBe(false);
    expect(isFinalDecision("information_requested")).toBe(false);
  });

  it("names the company in every confirmation prompt, so the wrong borrower is obvious", () => {
    for (const action of DECISIONS) {
      expect(DECISION_META[action].confirmation("Nordwerk Precision GmbH")).toContain("Nordwerk Precision GmbH");
    }
  });
});

/**
 * THE CENTRAL GUARANTEE: the model informs, the analyst decides.
 */
describe("the credit model cannot decide", () => {
  it("validation takes no score, grade or flag as input", () => {
    // The whole signature is an action and a message. There is no argument that could
    // carry an assessment into this function.
    const strong = validateDecision({ action: "approve", message: "" });
    const weak = validateDecision({ action: "approve", message: "" });
    expect(strong).toEqual(weak);
  });

  it("the same decision is valid for a 78-point borrower and a flagged one", () => {
    const good = scoreApplication(NORDWERK_RECORD, NOW);
    const flagged = scoreApplication(recordWith({ equityEur: -400_000, totalLiabilitiesEur: 3_900_000 }), NOW);
    if (good.status !== "scored" || flagged.status !== "scored") throw new Error("expected scored");

    expect(good.assessment.criticalFlags).toEqual([]);
    expect(flagged.assessment.criticalFlags.length).toBeGreaterThan(0);

    // Approving a flagged borrower is permitted: the cap limits the GRADE, not the analyst.
    expect(validateDecision({ action: "approve", message: "" }).ok).toBe(true);
    expect(validateDecision({ action: "decline", message: "Declined despite a strong score." }).ok).toBe(true);
  });

  it("recording a decision cannot change the calculated score", () => {
    // A decision writes only `status` and `analyst_message`; the engine reads neither.
    const before = scoreApplication(NORDWERK_RECORD, NOW);
    const afterApproval = scoreApplication(
      recordWith({ status: "approved", analystMessage: "Approved at the requested amount." }),
      NOW,
    );
    if (before.status !== "scored" || afterApproval.status !== "scored") throw new Error("expected scored");

    expect(afterApproval.assessment.score).toBe(before.assessment.score);
    expect(afterApproval.assessment.grade.id).toBe(before.assessment.grade.id);
    expect(afterApproval.assessment).toEqual(before.assessment);
  });

  it("the engine's own input type has no field for a status or a decision", () => {
    const scoring = scoreApplication(NORDWERK_RECORD, NOW);
    if (scoring.status !== "scored") throw new Error("expected scored");
    const keys = Object.keys(scoring.input);
    expect(keys).not.toContain("status");
    expect(keys).not.toContain("analystMessage");
    expect(keys).not.toContain("decision");
  });

  it("the assessment carries no approval or rejection of its own", () => {
    const assessment = assess({
      loanAmountEur: 100_000, revenueEur: 1_000_000, revenuePriorYearEur: 900_000, ebitdaEur: 200_000,
      netIncomeEur: 90_000, interestExpenseEur: 10_000, existingDebtEur: 100_000, totalAssetsEur: 1_000_000,
      currentAssetsEur: 400_000, currentLiabilitiesEur: 200_000, totalLiabilitiesEur: 300_000,
      equityEur: 700_000, yearsInBusiness: 12,
    });
    for (const key of ["decision", "approved", "rejected", "outcome", "recommendation"]) {
      expect(assessment).not.toHaveProperty(key);
    }
  });
});
