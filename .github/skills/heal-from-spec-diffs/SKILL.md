---
name: heal-from-spec-diffs
argument-hint: "Optionally give the base ref to diff against (default origin/main), or paste known backend release notes."
description: "Use when spec/openapi.json and/or spec/events.schema.json changed relative to main branch -- typically after .github/workflows/update-spec.yml opens/updates the actions/spec-update PR -- to diff the spec, summarize what changed, research SDK impact, formulate a plan, and align the TypeScript SDK's types/client methods/docs/tests with the new contract (patch existing shapes or add new features). Final step of the spec pass-thru workflow: backend spec change -> automated PR -> this skill heals the SDK. Always ends with a single summary (spec changes, what was implemented, business value) under 600 tokens."
disable-model-invocation: true
metadata: teardrop-sdk-ts, spec sync, openapi, spec diff, spec pass-thru, actions/spec-update, contract healing, breaking change detection, types, client parity, sse events, changelog, backward compatibility
user-invocable: true
---

You are the coordinator for healing the `teardrop-sdk-ts` codebase after its remote API contract (`spec/openapi.json`, `spec/events.schema.json`) changes. You are the **last** stage of the spec pass-thru workflow:

```
Backend `teardrop` repo main changes
  -> repository_dispatch (backend_spec_updated)
  -> .github/workflows/update-spec.yml pulls spec/openapi.json + spec/events.schema.json,
     opens/updates the `actions/spec-update` PR with a raw type-level diff
  -> heal-from-spec-diffs (this skill): DIFF -> SUMMARIZE -> RESEARCH -> PLAN -> IMPLEMENT -> VERIFY -> REPORT
```

Reuse existing repo skills instead of recreating their logic:
- `deep-researcher` for mapping spec changes to affected SDK surface
- `speedy-coder` for implementation
- `ruthless-critic-verifier` for strict review

This skill differs from `dev-cycle` in that it always starts from a concrete, mechanically-detected diff (not a free-form user request) and always ends in a fixed-format, token-capped report.

## When to Use
- The `actions/spec-update` branch/PR exists or `spec/openapi.json`/`spec/events.schema.json` otherwise differ from `main`.
- Asked to "heal", "sync", or "align" the SDK with a new/updated spec.
- Before merging a spec-update PR, to confirm hand-written types/client methods/docs/tests still match the contract.

## Hard Rule: Never Read the Full Spec File
`spec/openapi.json` is large (300+ KB, ~12k lines). Never load it whole via file reads. Always go through [scripts/diff-openapi.js](./scripts/diff-openapi.js) first, and only fall back to a `git diff` scoped/grepped around one schema name for the rare case the script can't resolve (e.g. `allOf`/`$ref`-composed schemas with no inline `properties`).

## Phase 0: Locate the Diff Base

- Resolve the base ref: default `origin/main`. Run `git fetch origin main --quiet` first if a remote exists; fall back to local `main` if there is no remote.
- Confirm there is actually something to heal: `git diff --stat <base_ref> -- spec/openapi.json spec/events.schema.json`. If empty, stop and report nothing to do.

## Phase 1: Diff & Summarize

Run the bundled script (pure Node builtins, no `npm install` needed -- only the Node already required to work on this repo, per `engines.node >= 18` in `package.json`):

```
node .github/skills/heal-from-spec-diffs/scripts/diff-openapi.js <base_ref> --events
```

It reports, deterministically and cheaply:
- added/removed paths+operations (method, path)
- added/removed component schemas
- changed common schemas: added/removed properties, added/removed required fields (flags newly-required fields as breaking-for-responses)
- with `--events`: added/removed SSE event names in `events.schema.json`

Classify every reported change as one of:
- **additive** -- new optional field/endpoint/event (safe, no compat risk)
- **tightening** -- new required field on a request or response schema (needs an SDK type update; breaking for the SDK if it's a response the client already parses without that field)
- **removal** -- path/schema/field disappeared (needs deprecation handling, not a silent drop)
- **rename** -- looks like add+remove of similarly-shaped fields; confirm with a scoped `git diff` before treating as two unrelated changes

Record the classified diff in session memory capped at ~300 tokens -- do not carry the raw JSON or script output forward verbatim.

## Session Memory Schema

Maintain these fields in `/memories/session/` and update only what the current phase needs:

```text
task: heal-from-spec-diffs invocation context (base ref, PR if known)
spec_versions: old -> new (openapi.json / events.schema.json)
spec_diff_summary: <= 300 tokens, classified additive/tightening/removal/rename entries
research_summary: <= 400 tokens
plan_ref: /memories/session/plan.md
verify_status: PENDING | PASS | BLOCK
block_findings: empty or concrete blocking findings
```

## Phase 2: Research

Delegate to `deep-researcher` to map each classified change to affected SDK surface:
- changed component schema -> matching request/response interface(s) in [types.ts](src/types.ts) (this SDK is a single flat types file, not per-domain model modules)
- changed/added operation (method+path) -> matching resource module in `src/*.ts` (e.g. `billing.ts`, `marketplace.ts`, `mcp.ts`) and its constructor wiring in [client.ts](src/client.ts) -- there is no sync/async split to check both sides of, just one `Promise`-returning method
- changed/added SSE event name -> `EVENT_*` constants and the `SseEvent` union in [types.ts](src/types.ts), plus [utils/parseSseStream.ts](src/utils/parseSseStream.ts) if the parsing/dispatch logic itself needs to change

There is no automated spec-contract test file in this repo (unlike the Python SDK's `tests/test_spec_contract.py`) -- treat [spec/openapi.json](spec/openapi.json) and [spec/events.schema.json](spec/events.schema.json) directly as ground truth instead. For bulk field-by-field verification across many schemas at once (faster than one-by-one `read_file` diffs), write a disposable Node script that parses `spec/openapi.json` as JSON and compares its `components.schemas.<Name>.properties`/`.required` against the corresponding `types.ts` interface fields -- this is the technique used for the 2026-07-17 full spec-parity audit (see `/memories/repo/sdk-conventions.md`). Delete the disposable script when done; do not commit it.

Also note any change implied only by a field's `description` (e.g. "True when X changed") that needs a doc note or behavior change, not just a type edit.

Hard limits (mirrors `dev-cycle`): no more than 2 research rounds, 4 targeted searches, 5 file reads unless a real ambiguity remains.

## Phase 3: Plan

Use the same discipline as `dev-cycle`'s PLAN phase. Name the exact types/methods/modules/docs/tests to touch; keep the plan additive and minimal; write it to `/memories/session/plan.md`.

Explicitly plan for, as applicable:
- interface field additions/changes in [types.ts](src/types.ts) matching the new spec properties and required-ness
- new resource-module method(s) for new operations in the owning `src/*.ts` file, wired into `TeardropClient` in [client.ts](src/client.ts) (constructor property) and exported from [index.ts](src/index.ts)
- new `EVENT_*` constants and `SseEvent` union member for new SSE events, exported from [index.ts](src/index.ts)
- new list/paginated endpoints routed through `parseListResponse()` ([utils/parseListResponse.ts](src/utils/parseListResponse.ts)) with the correct `container` key
- doc updates to the matching `docs/<topic>.md` (see the Documentation table in `README.md`); add a new table row if a new doc file is created
- new/updated unit tests in `tests/<module>.test.ts` using the local `makeMockHttp()` pattern, plus a new/updated integration smoke test under `tests/integration/` if it wraps a real, previously uncovered endpoint

If a change is a **removal** or **rename**, plan a backward-compatible SDK approach (keep the old field/method working, or clearly deprecated) instead of a silent breaking change. If a true breaking removal on a published field/method is unavoidable, flag it explicitly for human sign-off rather than implementing it silently -- this is a published npm package (see [notes/PUBLISH-NPM.md](notes/PUBLISH-NPM.md)).

## Phase 4: Implement

Delegate to `speedy-coder`. Follow its Operating Map, Do-Not-Conflate Rules, and Required Co-Changes exactly (barrel exports, `throwForStatus` mapping, `undefined`-vs-`null` partial-update semantics, no client-side TTL caches, docs).

- Prefer additive/patch changes (new optional fields, new methods) over rewriting existing shapes; only change existing required-ness/types when the classified diff actually demands it.
- After the first substantive edit, run the narrowest relevant test file before continuing further edits.

## Phase 5: Verify

Always run, in this order (Node/npm scripts only -- no venv or interpreter selection needed):
1. `npm run lint` (`tsc --noEmit`) -- catches any type-shape mismatch immediately.
2. `npm test -- tests/<module>.test.ts` for every touched domain module.
3. If the public surface changed (new/renamed method, interface, error, or event constant): the full unit suite `npm test` plus `npm run build` (`tsc`, catches anything `tsc --noEmit` alone might miss in the emitted `.d.ts` output). Only run `npm run test:integration` if the user has integration credentials configured (`TEARDROP_TEST_URL`/`EMAIL`/`SECRET`) -- otherwise those tests skip cleanly (`describe.skipIf`) and prove nothing.

Delegate to `ruthless-critic-verifier` for a strict pass using its Teardrop SDK Review Checklist, with extra attention to the Correctness/public-API-contract and Testing sections. Output one of `PASS` / `BLOCK` / `PENDING` exactly as `dev-cycle` does; on `BLOCK`, retry PLAN once with the findings, then stop and ask the user if it blocks again.

## Phase 6: Final Report (always, capped under 600 tokens)

End every run with exactly this three-section Markdown report, regardless of how large the diff was. Keep it tight -- no raw JSON, no full test output, no full plan (those already live in session memory / test output if the user wants detail):

```markdown
## Spec Sync: <old-version> -> <new-version>

### Spec Changes
- <one line per classified change: additive/tightening/removal/rename>

### What Was Implemented
- <one line per concrete SDK edit: file/type/method/doc/test>
- <anything intentionally deferred/flagged for human sign-off, if any>

### Business Value
<1-3 sentences: what capability this unlocks, what breakage or drift it prevents, why it matters to SDK consumers>
```

If a PR (e.g. `actions/spec-update`) is open for this change, you may suggest posting this report as a PR comment, but do not post it yourself -- commenting on PRs requires explicit user confirmation.

## Token Economy Rules

- Never load the full `spec/openapi.json` into context; always go through [scripts/diff-openapi.js](./scripts/diff-openapi.js) or a `git diff` scoped with `grep -n` around one schema name.
- Carry the classified diff summary forward, not the raw script output or JSON.
- Prefer one narrow validation command over broad test sweeps until the touched domain stabilizes.
- Do not re-run full-repo exploration after RESEARCH unless the current mapping (schema -> type, operation -> client method) is proven wrong.
