# LLM Configuration & Model Benchmarks — Provider Routing and Model Selection

**Customize the agent's LLM provider/model, bring-your-own-key (BYOK), and compare model cost/latency benchmarks.**

**Module:** `client.llm`, `client.models`

Customize which LLM provider and model the agent uses, enable bring-your-own-key
(BYOK), or route to self-hosted endpoints. Configuration is org-scoped and
persists across runs.

## Get Current Config

```typescript
const config = await client.llm.get();
// → {
//     org_id, provider: "anthropic", model: "claude-haiku-4-5-20251001",
//     has_api_key: false, api_base: null, max_tokens: 4096, temperature: 0.0,
//     routing_preference: "default", is_byok: false, created_at, updated_at
//   }
```

## Set LLM Config

```typescript
await client.llm.set({
  provider: "anthropic",           // "anthropic" | "openai" | "google" | "openrouter"
  model: "claude-sonnet-4-20250514",
  routing_preference: "cost",      // "default" | "cost" | "speed" | "quality"
  api_key: "sk-...",               // optional BYOK key (TLS-only, never logged)
  api_base: null,                  // optional self-hosted endpoint (vLLM / Ollama)
  max_tokens: 4096,                // 1 – 200,000
  temperature: 0.0,                // 0.0 – 2.0
  timeout_seconds: 120,
});
```

Notes:
- Pass `api_key: null` (or omit) to preserve an existing stored key.
- Use `client.llm.clearApiKey()` to remove a stored key without changing other settings.
- When `api_key` is provided, it is encrypted at rest and never returned (only `has_api_key: true` is visible).
- `api_base` is validated for SSRF; private IPs are rejected unless the backend explicitly allows them.

## Delete LLM Config

```typescript
await client.llm.reset();
// Reverts the org to the global default LLM config.
```

## Supported Providers & Models

```typescript
const providers = client.llm.listSupportedProviders();
// → ["anthropic", "openai", "google", "openrouter"]

const models = client.llm.listModelsForProvider("anthropic");
// → ["claude-haiku-4-5-20251001", "claude-sonnet-4-20250514"]

// Inspect the constant directly
import { MODELS_BY_PROVIDER } from "teardrop-sdk";
console.log(MODELS_BY_PROVIDER);
```

## Model Benchmarks

Browse model capabilities and operational metrics (latency, cost, throughput)
across your org's usage.

```typescript
const benchmarks = await client.models.benchmarks();        // public, no auth
// → {
//     models: [{
//       provider: "anthropic",
//       model: "claude-haiku-4-5-20251001",
//       display_name: "Claude Haiku 4.5",
//       context_window: 200000,
//       supports_tools: true,
//       pricing: { tokens_in_cost_per_1k: 0.08, tokens_out_cost_per_1k: 0.24 },
//       benchmarks: { total_runs_7d: 1250, avg_latency_ms: 485.5, ... },
//     }, ...],
//     updated_at: "2026-04-16T12:00:00Z"
//   }

const orgBenchmarks = await client.models.orgBenchmarks();  // org-scoped, auth required
```

### Use Case: Choosing Models

```typescript
const benchmarks = await client.models.benchmarks();

// Find cheapest
const cheapest = benchmarks.models
  .filter(m => m.benchmarks)
  .reduce((a, b) =>
    (a.pricing.tokens_in_cost_per_1k + a.pricing.tokens_out_cost_per_1k) <
    (b.pricing.tokens_in_cost_per_1k + b.pricing.tokens_out_cost_per_1k) ? a : b
  );

// Find fastest
const fastest = benchmarks.models
  .filter(m => m.benchmarks)
  .reduce((a, b) => a.benchmarks!.avg_latency_ms < b.benchmarks!.avg_latency_ms ? a : b);

// Configure agent to use cheapest
await client.llm.set({ provider: cheapest.provider, model: cheapest.model, routing_preference: "cost" });
```

---

**See also:** [Billing & Usage](billing-and-usage.md) for per-run token cost tracking ·
[Agent Runs](agent-runs.md) for `USAGE_SUMMARY` events · [../README.md](../README.md)
