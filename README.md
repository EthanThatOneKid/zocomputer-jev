# zocomputer-jev

A Zo skill for choosing the right level of scripting for a request: answer directly, inspect an existing script, write a focused script, run an inspected script, or ask for clarification. It uses TypeSafe AI Jev through the Vercel AI Gateway's AI SDK integration, while keeping authorization and safety decisions deterministic.

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

The user does not need to know Jev exists. Zo invokes it internally when a task is repeated, data-heavy, custom, or ambiguous enough that choosing between answering, inspecting, writing, running, or asking deserves evidence. Jev makes the typed judgment; Zo still inspects the real files, writes the task-specific script, obtains authorization, runs it safely, and verifies the result.

When the action is `write_script`, Zo creates the smallest useful custom script for the user's actual files and goal rather than blindly running a generic helper. This repository can also compose with `zocomputer-subagent`: Jev chooses or validates the automation path, while bounded child Zo agents handle independent implementation or research work. Neither Jev nor a child agent is allowed to authorize irreversible side effects.

## Development

```sh
bun test
```

The tests cover the decision policy without making a Gateway request. Live evaluation requires a valid `AI_GATEWAY_API_KEY` and may incur Gateway usage.

## References

- [TypeSafe AI Jev on AI Gateway](https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway)
- [AI Gateway API keys](https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys)
- [AI Gateway evaluation](https://vercel.com/docs/ai-gateway/modalities/evaluation)
- [AI SDK Gateway provider](https://ai-sdk.dev/providers/ai-sdk-providers/vercel-gateway)
