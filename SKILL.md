---
name: zocomputer-jev
description: Use TypeSafe AI Jev through Vercel AI Gateway to decide situationally whether a request needs a direct answer, script inspection, a new script, or an authorized script run. Use when script choice or execution should be evidence-based rather than automatic.
compatibility: Created for Zo Computer; requires Bun and an AI_GATEWAY_API_KEY secret.
metadata:
  author: etok.zo.computer
---

# Situational script work with Jev

Use Jev as a typed planning signal, not as an authorization system. The local policy always protects private data and requires explicit authorization for publishing, sending, deleting, financial actions, or other irreversible changes.

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

## Credential setup

Set `AI_GATEWAY_API_KEY` in Zo's [Settings > Advanced](/?t=settings&s=advanced) Secrets area. Never put the key in the repository, command arguments, source files, or committed `.env` files. The script uses the Vercel AI SDK Gateway provider and the `typesafe-ai/jev` evaluation model.

## Local commands

```sh
bun install
bun run scripts/jev-evaluate.ts --request "Summarize these CSV files" --context "Read-only local analysis" --json
bun test
```

The evaluator accepts a request and optional context, then returns the typed Jev answers, a normalized action, risk and side-effect estimates, and token usage. The normalized policy fails closed to `ask_clarification` for unknown actions, high risk, or likely external side effects.
