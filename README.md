# zocomputer-jev

A Zo skill for outsourcing bounded, typed situational judgments to TypeSafe AI Jev through Vercel AI Gateway. Jev can help Zo classify, route, score, verify, and choose among tools, scripts, subagents, retries, or review paths; Zo retains implementation, authorization, and verification.

The tracked Zo Rule lives in `rule.md`. Keep that file as the versioned source of truth for the live rule installed in Zo's Rules settings; never put an API key or other secret in it.

## Setup

1. Create a Vercel AI Gateway API key.
2. Store it in Zo's [Settings > Advanced](/?t=settings&s=advanced) Secrets area as `AI_GATEWAY_API_KEY`, or export that variable for local development.
3. Install dependencies:

   ```sh
   bun install
   ```

The key is read from the environment by `@ai-sdk/gateway`; it is never committed or passed as a command-line argument.

## Use

```sh
bun run scripts/jev-evaluate.ts \\
  --request "Turn these meeting transcripts into structured notes" \\
  --context "Local files only; produce Markdown artifacts; do not send anything" \\
  --json
```

The evaluator asks Jev four typed questions:

- the safest useful next action;
- whether the action has an external side effect;
- how much scripting improves repeatability; and
- how risky execution is without another confirmation.

The local policy converts those answers into an action. It fails closed to `ask_clarification` when the request is likely external or irreversible, risk is high, or Jev returns an unknown action. Jev's recommendation never replaces explicit authorization.

## How Zo uses it

The user does not need to know Jev exists. Zo invokes it internally whenever a small, structured judgment can reduce uncertainty or make a recurring decision consistent: triage, routing, prioritization, risk or quality scoring, continue/retry/ask/stop decisions, output verification, or choosing the right automation path.

Jev is a specialized decision delegate, not a general-purpose coding or execution agent. Zo gathers the relevant state, asks Jev typed questions, treats the answers and probabilities as evidence, applies local safety thresholds, and continues the work. When the result is `write_script`, Zo creates the smallest useful custom script for the user's actual files and goal. When substantial independent implementation or research is needed, Zo can separately compose this skill with `zocomputer-subagent`.

The included evaluator is a concrete implementation for situational script decisions; the delegation pattern is intentionally broader than scripting.

## Development

```sh
bun test
```

The tests cover the decision policy without making a Gateway request. Live evaluation requires a valid `AI_GATEWAY_API_KEY` and may incur Gateway usage.

## References

- [TypeSafe AI Jev on AI Gateway](https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway)
- [Jev model page](https://vercel.com/ai-gateway/models/jev)
- [AI SDK evaluation](https://ai-sdk.dev/docs/ai-sdk-core/evaluation)
- [AI SDK with AI Gateway](https://vercel.com/docs/ai-gateway/sdks-and-apis/ai-sdk)
- [AI Gateway API keys](https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys)
- [AI Gateway evaluation](https://vercel.com/docs/ai-gateway/modalities/evaluation)
