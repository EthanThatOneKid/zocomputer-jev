import { describe, expect, test } from "bun:test";
import { ACTIONS, normalizeDecision, questions } from "./jev-evaluate";

describe("JeV situational policy", () => {
  test("exposes typed questions for the five-way action choice", () => {
    expect(Object.keys(questions.action.criteria)).toEqual(Object.keys(ACTIONS));
    expect(questions.repeatability.criteria).toHaveLength(5);
    expect(questions.risk.criteria).toHaveLength(5);
  });

  test("keeps safe, local script work actionable", () => {
    const decision = normalizeDecision({
      action: { type: "choice", choice: "write_script" },
      external_side_effect: { type: "boolean", probability: 0.08 },
      repeatability: { type: "score", score: 3 },
      risk: { type: "score", score: 1 },
    });

    expect(decision.action).toBe("write_script");
  });

  test("requires clarification for likely external side effects", () => {
    const decision = normalizeDecision({
      action: { type: "choice", choice: "run_existing_script" },
      external_side_effect: { type: "boolean", probability: 0.8 },
      repeatability: { type: "score", score: 4 },
      risk: { type: "score", score: 2 },
    });

    expect(decision.action).toBe("ask_clarification");
  });

  test("requires clarification for high risk even when Jev suggests running", () => {
    const decision = normalizeDecision({
      action: { type: "choice", choice: "run_existing_script" },
      external_side_effect: { type: "boolean", probability: 0.1 },
      repeatability: { type: "score", score: 4 },
      risk: { type: "score", score: 4 },
    });

    expect(decision.action).toBe("ask_clarification");
  });

  test("fails closed on an unknown action", () => {
    const decision = normalizeDecision({
      action: { type: "choice", choice: "unknown" },
      external_side_effect: { type: "boolean", probability: 0.1 },
      repeatability: { type: "score", score: 1 },
      risk: { type: "score", score: 0 },
    });

    expect(decision.action).toBe("ask_clarification");
  });
});
