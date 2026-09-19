import { experimental_evaluate as evaluate } from "ai";
import { gateway } from "@ai-sdk/gateway";

export const ACTIONS = {
  direct_answer: "Answer directly without writing or running code.",
  inspect_existing_script: "Inspect an existing script before deciding whether it should run.",
  write_script: "Write a focused, reviewable script but do not run it automatically.",
  run_existing_script: "Run an existing script that has already been inspected and authorized.",
  ask_clarification: "Ask one focused question because scope or authorization is materially unclear.",
} as const;

export type Action = keyof typeof ACTIONS;

type EvaluationAnswers = {
  action: { type: "choice"; choice: string; probabilities?: Record<string, number> };
  external_side_effect: { type: "boolean"; probability: number };
  repeatability: { type: "score"; score: number; probabilities?: Record<string, number> };
  risk: { type: "score"; score: number; probabilities?: Record<string, number> };
};

export const questions = {
  action: {
    type: "choice",
    instructions: "Choose the safest useful next action for this request, given the shared state.",
    criteria: ACTIONS,
  },
  external_side_effect: {
    type: "boolean",
    instructions: "Would carrying out the likely next action send, publish, delete, purchase, modify an external system, or otherwise cause an external side effect?",
    criteria: {
      true: "The action has an external or irreversible side effect.",
      false: "The action is local, read-only, or produces an uncommitted draft.",
    },
  },
  repeatability: {
    type: "score",
    instructions: "How much would a deterministic script improve repeatability, scale, validation, or artifact generation for this request?",
    criteria: [
      "No script benefit; answer or make a tiny manual change.",
      "A script may help slightly, but the task is still simpler without one.",
      "A small script would make the work clearer or more reliable.",
      "A script is strongly preferable because the work is repetitive, data-heavy, or validation-oriented.",
      "A reusable script is essential for scale, repeatability, or a durable workflow.",
    ],
  },
  risk: {
    type: "score",
    instructions: "How risky would it be to execute the likely action without another focused confirmation?",
    criteria: [
      "No meaningful risk; the action is explanatory or read-only.",
      "Low risk; the action is local and easily reversible.",
      "Moderate risk; inspect inputs and outputs before proceeding.",
      "High risk; require explicit confirmation before execution.",
      "Critical risk; do not execute automatically and ask for confirmation or a safer plan.",
    ],
  },
} as const;

export type NormalizedDecision = {
  action: Action;
  externalSideEffectProbability: number;
  repeatabilityScore: number;
  riskScore: number;
  reason: string;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function isAction(value: string): value is Action {
  return Object.hasOwn(ACTIONS, value);
}

export function normalizeDecision(answers: EvaluationAnswers): NormalizedDecision {
  const externalSideEffectProbability = clamp(answers.external_side_effect.probability, 0, 1);
  const repeatabilityScore = clamp(answers.repeatability.score, 0, 4);
  const riskScore = clamp(answers.risk.score, 0, 4);
  const suggestedAction = answers.action.choice;

  if (!isAction(suggestedAction)) {
    return {
      action: "ask_clarification",
      externalSideEffectProbability,
      repeatabilityScore,
      riskScore,
      reason: "Jev returned an action outside the local policy; failing closed.",
    };
  }

  if (externalSideEffectProbability >= 0.55) {
    return {
      action: "ask_clarification",
      externalSideEffectProbability,
      repeatabilityScore,
      riskScore,
      reason: "The request is likely to cause an external or irreversible side effect.",
    };
  }

  if (riskScore >= 3) {
    return {
      action: "ask_clarification",
      externalSideEffectProbability,
      repeatabilityScore,
      riskScore,
      reason: "The request has high execution risk and needs focused confirmation.",
    };
  }

  return {
    action: suggestedAction,
    externalSideEffectProbability,
    repeatabilityScore,
    riskScore,
    reason: ACTIONS[suggestedAction],
  };
}

function getFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

async function readRequest(value: string | undefined): Promise<string> {
  if (!value) throw new Error("--request is required.");
  if (value !== "-") return value.trim();
  return (await Bun.stdin.text()).trim();
}

function usage(): string {
  return [
    "Usage: bun run scripts/jev-evaluate.ts --request <text> [options]",
    "",
    "Options:",
    "  --request <text>       Request to classify; use - to read from stdin.",
    "  --context <text>       Relevant files, constraints, and authorization context.",
    "  --json                 Emit machine-readable JSON.",
    "  --dry-run              Print the evaluation plan without calling the Gateway.",
    "  --max-retries <n>      Gateway retries from 0 to 3; default 2.",
    "  --help                 Show this help.",
  ].join("\n");
}

export async function evaluateRequest(request: string, context = "", maxRetries = 2) {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY is not set. Add it in Zo Settings > Advanced Secrets.");
  }

  const state = {
    request,
    context: context || "No additional context was provided.",
    policy: "Jev advises; local policy controls authorization. Never execute an external or irreversible action automatically.",
  };

  const result = await evaluate({
    model: gateway.evaluation("typesafe-ai/jev"),
    state,
    questions,
    maxRetries,
    abortSignal: AbortSignal.timeout(30_000),
  });

  const answers = result.answers as EvaluationAnswers;
  return {
    model: "typesafe-ai/jev",
    decision: normalizeDecision(answers),
    answers,
    usage: result.usage,
    response: {
      id: result.response.id,
      modelId: result.response.modelId,
      timestamp: result.response.timestamp,
    },
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help")) {
    console.log(usage());
    return;
  }

  const request = await readRequest(getFlag(args, "--request"));
  if (!request) throw new Error("The request cannot be empty.");
  const context = getFlag(args, "--context") ?? "";
  const maxRetries = Number(getFlag(args, "--max-retries") ?? "2");
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 3) {
    throw new Error("--max-retries must be an integer from 0 to 3.");
  }

  if (hasFlag(args, "--dry-run")) {
    console.log(JSON.stringify({ model: "typesafe-ai/jev", state: { request, context }, questions }, null, 2));
    return;
  }

  const result = await evaluateRequest(request, context, maxRetries);
  if (hasFlag(args, "--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Action: ${result.decision.action}`);
  console.log(`Reason: ${result.decision.reason}`);
  console.log(`Repeatability: ${result.decision.repeatabilityScore}/4`);
  console.log(`Risk: ${result.decision.riskScore}/4`);
  console.log(`External side-effect probability: ${result.decision.externalSideEffectProbability}`);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
