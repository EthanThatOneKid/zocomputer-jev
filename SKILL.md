---
name: zocomputer-jev
description: Use TypeSafe AI Jev through Vercel AI Gateway to outsource bounded, typed situational judgments about routing, triage, retries, risk, verification, and tool, script, or subagent selection while Zo retains implementation, authorization, and verification.
compatibility: Created for Zo Computer; requires Bun and an AI_GATEWAY_API_KEY secret.
metadata:
  author: etok.zo.computer
---

# Situational decision delegation with Jev

## What Jev is good at

Jev is TypeSafe AI's probabilistic decision model for software. Through Vercel AI Gateway, the `typesafe-ai/jev` evaluation model evaluates one shared state against several typed questions and returns structured `Choice`, `Score`, and `Boolean` answers with probabilities. It is useful for fast, repeatable judgments such as:

- choosing the next tool, script, or subagent in an agent loop;
- deciding whether to continue, retry, ask, or stop;
- scoring repeatability, urgency, risk, or confidence;
- routing uncertain cases to review; and
- checking outputs against simple guardrails.

Jev is not a general-purpose coding model, a filesystem inspector, an execution engine, or an authorization system. Do not ask it to write the implementation, infer permissions, approve an irreversible action, or replace inspection of the actual files. Use Zo's normal reasoning and tools for those jobs.

## Why this skill exists

Jev makes a distinct kind of delegation available to Zo. Many problems contain a bounded judgment that does not require a full child agent or a general-purpose coding model: classify a state, choose among tools, score risk or quality, decide whether to continue, retry, ask, or stop, route an uncertain case to review, or verify an output against a rubric. Zo can package that narrow question and its relevant state, outsource the judgment to Jev, and use the typed result to guide the rest of the work.

This skill exists to make that practice normal and reusable across domains, not just for scripting. The user does not need to know Jev exists or name it; Zo should recognize when a small, structured decision is worth delegating and keep the delegation internal. The included evaluator demonstrates the pattern for choosing a scripting path, while the same pattern applies to triage, routing, prioritization, retry policy, quality checks, and other bounded decisions.

Jev is a specialized decision delegate, not a replacement for Zo. It does not inspect files, implement solutions, run commands, grant permission, or own the final decision. Zo remains responsible for context gathering, implementation, authorization, side-effect control, and verification.

## User-facing behavior

The user does not need to know Jev exists or mention it by name. Invoke this skill when the work contains a bounded judgment that can be separated from execution: repeated or data-heavy tasks, custom transformations, uncertain tool or script selection, routing, triage, retry/continue/stop decisions, scoring, validation, or review thresholds. Keep Jev as an internal decision step unless explaining the choice would help the user.

Jev outsources a narrow judgment call to a fast typed model; it does not outsource the whole problem. Zo remains responsible for reading the actual files, writing custom scripts when needed, running only authorized commands, and verifying the result.

## When to use this skill

Call this skill when a structured Jev judgment can reduce uncertainty or make a recurring decision consistent. Examples include choosing a tool, script, or subagent; deciding whether to continue, retry, ask, or stop; ranking or routing work; scoring risk, urgency, repeatability, or quality; checking an output against a rubric; and deciding whether an uncertain case should go to review. Do not call it for every simple explanation or obvious deterministic action; use normal reasoning and tools when Jev would add more overhead than value.

Use Jev as typed evidence, not as an authorization system. The local policy always protects private data and requires explicit authorization for publishing, sending, deleting, financial actions, or other irreversible changes.

## General Jev delegation loop

When a problem has a bounded judgment worth outsourcing:

1. Isolate the judgment from the larger task; do not delegate the entire problem by default.
2. Gather the relevant state and constraints from the actual files, request, or tool results.
3. Formulate a small set of typed questions with explicit choices, score levels, or Boolean criteria.
4. Ask Jev through the current AI SDK and Vercel AI Gateway integration.
5. Treat the answers and probabilities as evidence; apply deterministic local thresholds and safety rules.
6. Continue the work in Zo, or delegate an independently scoped implementation task through `zocomputer-subagent` when that is separately justified.
7. Verify the outcome and route ambiguous or low-confidence cases to review instead of pretending certainty.

Never send secrets or unnecessary private content to Jev. Minimize the state, redact sensitive values, and do not let a Jev answer authorize an irreversible action.

## Decision loop

1. Inspect the relevant files and project guidance before deciding whether a script is needed.
2. Run `bun run scripts/jev-evaluate.ts --request "..." --context "..." --json` when the right level of automation is unclear.
3. Apply the returned action:
   - `direct_answer`: answer without creating code.
   - `inspect_existing_script`: read the script, its inputs, and its likely effects before considering execution.
   - `write_script`: create a focused, reviewable script; do not run it automatically.
   - `run_existing_script`: run only an existing script that has been inspected and whose execution is authorized.
   - `ask_clarification`: ask one focused question when scope or authorization is materially unclear.
4. Override any model recommendation when local evidence shows higher risk. Never let Jev authorize a side effect.
5. Verify the result, report changed files and failures, and keep generated artifacts in the user's workspace when they are meant for the user.

Prefer a script when the task involves repeated work, many files or rows, deterministic transformations, validation, parsing, or a durable workflow. Prefer a direct answer for explanation-only requests and tiny one-off changes. Start with a dry run or read-only inspection when a script touches private data, external services, or a broad file set.

## Writing custom scripts situationally

When Jev returns `write_script`, do not reach for a generic script automatically. Zo should:

1. inspect the relevant files, formats, existing commands, and project guidance;
2. define the smallest useful input/output contract for this request;
3. write a focused script in the appropriate project or workspace location;
4. make it reviewable and safe by default, with bounded inputs and a dry-run or read-only mode when practical;
5. test it, show or inspect the planned changes, and run it only when the user has authorized execution.

The script should be customized to the user's actual files and goal. Prefer an existing project convention when one exists, and promote a one-off script into a reusable tool only when the workflow is likely to recur. Report the script path, what it changed, and any verification results.

## Relationship to subagent delegation

`zocomputer-jev` and `zocomputer-subagent` delegate at different levels. Jev delegates a narrow, typed judgment to a specialized decision model; `zocomputer-subagent` delegates an approved, independently scoped implementation or research task to a child Zo agent. Use Jev when the missing piece is a choice, score, classification, routing decision, or verification signal. Use a subagent when the missing piece is substantial work that another agent can perform. They can be composed: Jev can choose or validate the path before or after bounded subagent work, but Jev itself must not recursively spawn agents.

## Credential setup

Set `AI_GATEWAY_API_KEY` in Zo's [Settings > Advanced](/?t=settings&s=advanced) Secrets area. Never put the key in the repository, command arguments, source files, or committed `.env` files. The script uses the Vercel AI SDK Gateway provider and the `typesafe-ai/jev` evaluation model.

## Local commands

```sh
bun install
bun run scripts/jev-evaluate.ts --request "Summarize these CSV files" --context "Read-only local analysis" --json
bun test
```

The evaluator accepts a request and optional context, then returns the typed Jev answers, a normalized action, risk and side-effect estimates, and token usage. The normalized policy fails closed to `ask_clarification` for unknown actions, high risk, or likely external side effects.

## Documentation freshness

Before changing this skill, the evaluator, or any AI SDK/AI Gateway integration, consult the latest official documentation rather than relying on memory, old snippets, or search-result summaries. Check the current AI SDK evaluation API, the AI SDK AI Gateway provider guidance, the Vercel AI Gateway evaluation documentation, and the current Jev model page. Confirm model IDs, experimental API names, supported question types, authentication variables, result shapes, and version requirements against the installed packages and official examples.

Use the current documented model identifier and API shape; do not assume that an older alias or import remains valid. If the documentation and installed package disagree, inspect the installed type definitions, resolve the version mismatch deliberately, and run a small dry-run or authorized live smoke test before changing behavior. Do not put API keys in prompts, source files, command arguments, or documentation.

Official references:

- [AI SDK evaluation](https://ai-sdk.dev/docs/ai-sdk-core/evaluation)
- [AI SDK with AI Gateway](https://vercel.com/docs/ai-gateway/sdks-and-apis/ai-sdk)
- [Vercel AI Gateway evaluation](https://vercel.com/docs/ai-gateway/modalities/evaluation)
- [Jev model page](https://vercel.com/ai-gateway/models/jev)
