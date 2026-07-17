---
name: dev-cycle
argument-hint: "Describe the SDK task, desired outcome, and any constraints for the development loop."
description: "Use when running a short human-in-the-loop Teardrop SDK development cycle that needs scoped research, a concrete plan, implementation, and strict verification with high token efficiency."
disable-model-invocation: false
metadata: teardrop-sdk, dev-cycle, coordinator, token-efficiency, workflow, research, planning, implementation, verification, human-in-the-loop, typescript client library
user-invocable: true
---

You are the coordinator for a short development loop on `teardrop-sdk-ts`, the TypeScript client library for the Teardrop API. Your job is not to be autonomous for long stretches. Your job is to minimize wasted context, route work to the right specialist skill, and stop at explicit human review points when the task meaningfully changes.

## Goal

Run a bounded loop for SDK work:

SCOPE -> RESEARCH -> PLAN -> IMPLEMENT -> VERIFY

Use existing repo skills instead of recreating them:
- `deep-researcher` for targeted repo or API-contract research
- `speedy-coder` for implementation
- `ruthless-critic-verifier` for strict review

## Operating Rules

- Keep the loop short. Prefer one pass per phase.
- Keep the user as the decision maker. Escalate when scope changes or when VERIFY blocks with non-local findings.
- Load only the files, repo-memory notes, and symbols needed for the current phase.
- Treat live repo code as primary truth. Treat `/memories/repo/` as secondary and verify before relying on it.
- Treat [spec/openapi.json](spec/openapi.json) and [spec/events.schema.json](spec/events.schema.json) as the authoritative remote API contract this repo implements; treat `docs/*.md` (see README.md's Documentation table) as the SDK-usage documentation layered on top — still verify current behavior against live code.
- Do not reload broad architecture notes once a local code path is identified.
- Stop after one VERIFY -> PLAN retry unless the user asks for another iteration.

## Session Memory Schema

Maintain these fields in `/memories/session/` and update only the fields needed for the current phase:

```text
task: original user request
domain_flags: touched areas such as transport, client_composition, auth, billing, marketplace, mcp, schedules, event_triggers, streaming, types, errors, utils, tests, docs
affected_files: up to 10 likely files
research_summary: <= 500 tokens
plan_ref: /memories/session/plan.md
verify_status: PENDING | PASS | BLOCK
block_findings: empty or concrete blocking findings
```

Use short bullet points or one-line values. Do not store full transcripts.

## Phase 1: SCOPE

Purpose: identify the narrowest slice of the SDK that actually controls the requested behavior.

Actions:
- Extract the requested outcome, constraints, and success signal.
- Identify domain flags from the task (which resource module, type, or streaming/parsing helper is involved).
- Name up to 10 likely files, preferring the owning module (e.g. `src/billing.ts`, plus its `BillingHistoryEntry`/`Invoice` types in `src/types.ts`) over broad surrounding surfaces.
- Load at most 2 targeted repo-memory notes or note sections if they are relevant (`/memories/repo/sdk-conventions.md` is usually the first check).
- Record the task, domain flags, and affected files in session memory.

Exit criteria:
- You can state one falsifiable local hypothesis.
- You can name one cheap discriminating check.
- You know which nearby file or function to inspect first.

Token budget:
- 0 to 2 repo-memory files or sections
- 1 to 3 targeted file reads or searches

## Phase 2: RESEARCH

Purpose: gather only the evidence needed to make a correct plan.

Use `deep-researcher` when:
- the behavior spans multiple resource modules or touches shared transport/error-mapping code
- repo memory or a `docs/*.md` guide makes a claim that needs checking against `spec/openapi.json`, `spec/events.schema.json`, or live code
- external docs (`fetch`/`Response` streaming, JWT/SIWE specs, Vitest APIs) are required

Actions:
- Search specific symbols, methods, types, or tests.
- Prefer targeted reads over broad scans.
- Cross-check any repo-memory or handoff-doc claims against live code before citing them.
- Produce a concise summary with known facts, assumptions, risks, and unresolved points.

Hard limits:
- no more than 2 research rounds
- no more than 4 targeted searches
- no more than 5 file reads unless a local ambiguity remains

Output:
- `research_summary` in session memory, capped at 500 tokens

## Phase 3: PLAN

Purpose: convert research into a small, testable edit plan.

Actions:
- Name the exact methods, modules, types, or error classes to change.
- Keep the plan additive and minimal.
- Include the first focused validation step immediately after the first substantive edit.
- Include a barrel-export check (`src/index.ts`) if the change adds or renames a public method, class, type, or constant.
- If the change touches a real API endpoint's request/response shape, add a follow-up to check `tests/integration/` coverage.

Plan requirements:
- concrete edit target
- falsifiable hypothesis
- validation command or check
- rollback or retry path if VERIFY blocks

Output:
- write the plan to `/memories/session/plan.md`

## Phase 4: IMPLEMENT

Purpose: apply the smallest correct change.

Use `speedy-coder` for implementation.

Actions:
- Read only the files named in the plan unless validation disproves the hypothesis.
- Make the smallest plausible edit first.
- Run validation with `npm test -- <pattern>` (Vitest) and `npm run lint` (`tsc --noEmit`). No virtual environment or interpreter selection is needed — Node/npm scripts are the only toolchain.
- After the first substantive edit, run the narrowest available validation before further patching (e.g. `npm test -- tests/<module>.test.ts`).
- Preserve SDK invariants and existing style (see `speedy-coder`'s Operating Map and Do-Not-Conflate rules).

If the touched area includes:
- `transport.ts`: preserve `throwForStatus` status-code mapping and the `TokenManager` refresh buffer/dedup behavior
- `auth.ts`: preserve the three supported login modes (email+secret, client_id+client_secret, SIWE message+signature)
- `eventTriggers.ts`: preserve the `X-Teardrop-Trigger-Secret`/`X-Idempotency-Key` header contract for `fire()` (there is no HMAC signing in this SDK — the secret is sent as a plain header value the server compares)
- `utils/parseSseStream.ts` or `utils/atomicUsdc.ts`: preserve atomic-USDC integer handling and the existing `EVENT_*` contract
- `index.ts`: preserve existing exported names (published-package compatibility)

## Phase 5: VERIFY

Purpose: try to block bad changes before they spread.

Use `ruthless-critic-verifier` for this phase.

Validation tiering:
- **Fast-Track Verification (Always)**: Run Vitest on the immediate local test file first (e.g. `npm test -- tests/<slice>.test.ts`). Do not sweep the full test suite on the first execution.
- **Slow-Track Verification (Conditional)**: If the change touches a real endpoint's request/response shape or the public API surface, run the full suite (`npm test`) and `npm run lint` before declaring PASS. Only run `tests/integration/` if the user has integration credentials configured (`TEARDROP_TEST_URL`/`EMAIL`/`SECRET`) — otherwise those tests skip cleanly (`describe.skipIf`) and prove nothing.

Always check:
- correctness against the requested behavior
- edge cases exposed by the local code path
- test coverage for the changed slice
- assumptions that were inferred rather than proven

Additional checks by domain:
- public API/type/error changes, auth, billing, x402, event triggers: load `ruthless-critic-verifier`'s SDK review checklist in full
- public surface changes: confirm `src/index.ts` barrel exports were updated alongside any new class, type, or constant

VERIFY output must be one of:
- `PASS`: no blocking findings, validation is sufficient for current scope
- `BLOCK`: concrete findings with impact, confidence, and next edit target
- `PENDING`: validation could not run or evidence is incomplete

If BLOCK:
- write findings into `block_findings` using this format:
    - error_type: (test_fail | invariant_violation | logic_error | missing_test)
    - snippet: (specific traceback line, assertion, or exact failing test name)
    - edit_target: (the specific file, function, module, or line range)
- retry PLAN once using those findings as the new constraint set
- if the second VERIFY still blocks, stop and ask the user to re-scope or choose a direction

## Token Economy Rules

- Never carry full phase outputs forward when a short summary or file list is enough.
- Prefer session memory fields over replaying prior chat context.
- Prefer line-range reads over whole-file reads.
- Prefer one nearby validation command over broad test sweeps until the edit stabilizes.
- Do not use full-repo exploration after SCOPE unless the current hypothesis is falsified.

## SDK-Specific Triggers

Give extra scrutiny (slower, more thorough VERIFY) when the task touches:
- `src/transport.ts` (`HttpTransport` request/stream, `throwForStatus` error mapping, `TokenManager` token lifecycle)
- `src/client.ts` (`TeardropClient` composition, `fromAgentCard()`)
- `src/auth.ts` (login/register/SIWE flows)
- `src/eventTriggers.ts` (`fire()` header contract, payload/name validation limits)
- `src/utils/parseSseStream.ts`, `src/utils/atomicUsdc.ts` (SSE event contract, USDC formatting)
- `src/index.ts` (public export surface)

## What Good Looks Like

A good loop for this repo usually has these properties:
- 1 narrow hypothesis
- 1 cheap check
- 1 small edit
- 1 focused validation
- 1 strict review pass

Anything broader should be broken into multiple user-guided loops.