# teardrop-sdk-ts

TypeScript SDK for the [Teardrop](https://teardrop.dev) AI agent API.

> Fully typed streaming agent runs, automatic token refresh, x402 payment support, and namespaced resource modules.

## Requirements

- Node.js ≥ 18
- TypeScript ≥ 5 (optional — the package ships `.d.ts` declarations)

## Install

```bash
npm install teardrop-sdk
```

## Quick Start

```typescript
import { TeardropClient } from "teardrop-sdk";

const client = new TeardropClient({
  baseUrl: "https://api.teardrop.dev",
  email: "you@example.com",
  secret: "your-password",
});

for await (const event of client.agent.run({ message: "What is 2 + 2?" })) {
  if (event.event === "TEXT_MESSAGE_CONTENT") {
    process.stdout.write(event.data.delta);
  }
}
```

## Authentication

Credentials are passed to the constructor. The `TokenManager` acquires a JWT
automatically on the first request and refreshes it before expiry (5-minute
pre-expiry window).

| Method | Constructor / call |
|--------|-------------------|
| Email + password | `email: "...", secret: "..."` |
| Client credentials (M2M) | `client_id: "...", client_secret: "..."` |
| Pre-authenticated static token | `token: "..."` |
| SIWE (Sign-In with Ethereum) | Call `client.auth.login({ siwe_message, siwe_signature })` |

### SIWE Login Flow

```typescript
// 1. Fetch a single-use nonce
const { nonce } = await client.auth.siweNonce();

// 2. Build and sign an EIP-4361 message client-side
const message = buildSiweMessage({ nonce, ... });
const signature = wallet.signMessage(message);

// 3. Exchange for a JWT — stored automatically for subsequent calls
await client.auth.login({ siwe_message: message, siwe_signature: signature });
```

### Email Registration

```typescript
const tokens = await client.auth.register({
  org_name: "My Company",
  email: "you@example.com",
  password: "...",
});
```

### Invite-based Registration

```typescript
// Org admin creates an invite link
const invite = await client.auth.invite({ email: "colleague@example.com", role: "member" });
// → { token, invite_url, expires_at }

// Invitee registers
await client.auth.registerInvite({ token: invite.token, email: "...", password: "..." });
```

### Verify Email

```typescript
// Verify email before first login
await client.auth.verifyEmail(emailToken);

// Resend verification email
await client.auth.resendVerification("you@example.com");
```

### Token Refresh / Logout

```typescript
const newTokens = await client.auth.refresh(refreshToken);
await client.auth.logout(refreshToken);
```

### Inspect Identity

```typescript
const me = await client.auth.me();
// → { sub, user_id, org_id, org_name, role, auth_method, email, ... }
```

## Marketplace

Discover, subscribe to, and monetize tools on the Teardrop marketplace. The
marketplace is a curated catalogue of reusable agent tools built and published
by the Teardrop community and core team.

### Three Core Workflows

1. **Browsing** (public, no auth) — Discover tools in the marketplace catalogue
2. **Subscriptions** (auth required) — Subscribe to and use marketplace tools in your agent runs
3. **Publishing & Earnings** (auth required) — Publish your own tools and track revenue

### Browsing Tools (Public)

```typescript
// Browse full catalogue
const catalog = await client.marketplace.catalog({ limit: 20 });
const tools = catalog.tools;     // MarketplaceTool[]

// Filter by author org
const acmeCatalog = await client.marketplace.catalog({ org_slug: "acme", limit: 20 });

// Sort and paginate
const sorted = await client.marketplace.catalog({
  sort: "price_asc",             // "name" | "price_asc" | "price_desc"
  limit: 50,
  cursor: "next_page_token",     // from previous response
});

// Each tool includes metadata:
for (const tool of catalog.tools) {
  console.log(`${tool.name}: ${tool.description}`);
  console.log(`  Price: $${tool.cost_usdc / 1_000_000}`);
  console.log(`  Author: ${tool.author} (@${tool.author_slug})`);
}
```

### Subscriptions & Integration

```typescript
// Subscribe to a tool
const sub = await client.marketplace.subscribe("acme/web_search");
// Tool is now available to your agent during runs

// List subscriptions
const subs = await client.marketplace.subscriptions();
// → MarketplaceSubscription[]

// Unsubscribe
await client.marketplace.unsubscribe(sub.id);
```

**Integration in Agent Runs:** After subscribing to a marketplace tool, the
agent automatically discovers and can call it during `client.agent.run()`
without any additional configuration.

### Publishing & Earnings

#### Author Setup

```typescript
// Configure payout wallet for earnings
const config = await client.marketplace.setAuthorConfig({
  settlement_wallet: "0xYourWalletAddress",
});
const current = await client.marketplace.getAuthorConfig();
// → { org_id, settlement_wallet, created_at, updated_at }
```

#### Earnings & Revenue Tracking

```typescript
// Check total balance
const balance = await client.marketplace.balance();
// → { balance_usdc, pending_usdc }

// Fetch earnings history (paginated)
const { earnings, next_cursor } = await client.marketplace.earnings({ limit: 50 });
// Each entry tracks: tool_name, total_cost_usdc, author_share_usdc, platform_share_usdc

// Filter earnings by tool
const filtered = await client.marketplace.earnings({
  tool_name: "web_search",
  limit: 100,
  cursor: "next_page",
});
```

#### Withdrawals

```typescript
// Request payout
const result = await client.marketplace.withdraw({ amount_usdc: 1_000_000 });
// → { id, org_id, amount_usdc, wallet, status, created_at }

// Withdrawal history
const { withdrawals, next_cursor } = await client.marketplace.withdrawals({ limit: 20 });
```

### Using Marketplace Tools in Agent Runs

Once subscribed to a marketplace tool, it becomes available to the agent and
can be called during runs. The agent sees the tool schema and calls it
transparently.

```typescript
import { parseMarketplaceToolName } from "teardrop-sdk";

// 1. Subscribe to a tool
await client.marketplace.subscribe("acme/web_search");

// 2. Use it in agent runs (no explicit config needed)
for await (const event of client.agent.run("Find the latest ETH price")) {
  if (event.event === "TOOL_CALL_START") {
    console.log(`Agent called: ${event.data.tool_name}`);
    // → "acme/web_search" (marketplace tools use / namespacing)
  }
}
```

#### Tool Naming

```typescript
import { parseMarketplaceToolName } from "teardrop-sdk";

const parsed = parseMarketplaceToolName("acme/web_search");
// → { orgSlug: "acme", toolName: "web_search" }
```

#### Error Handling

```typescript
import { PaymentRequiredError } from "teardrop-sdk";

try {
  for await (const event of client.agent.run("Query subscribed tool")) { ... }
} catch (e) {
  if (e instanceof PaymentRequiredError) {
    // Insufficient balance for tool call — top up and retry
    console.log("Payment required:", e.message);
  }
}
```

### Marketplace vs. Custom Tools vs. MCP Servers

Teardrop offers three ways to extend agent capabilities:

| | Marketplace | Custom Webhook Tools | MCP Servers |
|---|---|---|---|
| Scope | Shared across orgs; discoverable catalogue | Org-private webhooks | External protocol servers |
| Discovery | Public browsing, subscriptions | Manual registration | Manual registration |
| Monetization | Built-in revenue sharing | Base pricing only | Not supported |
| Maintenance | Author owns; Teardrop supplies framework | You manage webhooks | You manage server |
| Best for | Sharing tools, generating revenue | Internal integrations | Legacy systems, stdio tools |

**Decision Tree:**
- Publishing a tool for community use or revenue? → **Marketplace**
- Internal tool for your org's agent? → **Custom Webhook Tool**
- Integrating external services (Stripe, Slack, etc.)? → **MCP Server or Custom Webhook Tool**
- Need stdio-based tool protocol? → **MCP Server**

## Agent Runs

```typescript
for await (const event of client.agent.run({
  message: "Summarise the top DeFi news today",
  thread_id: "conv-abc123",          // optional; auto-generated if omitted
  context: { user_timezone: "Europe/Berlin" },  // optional extra context
  emit_ui: true,                     // optional; default: true. Controls SURFACE_UPDATE emission.
})) {
  console.log(event.event, event.data);
}
```

`client.agent.run()` is an async generator that yields `SseEvent` objects.

**Available Tools:** The agent automatically discovers and can call:
- Built-in Teardrop tools
- Marketplace tools you're subscribed to (see Subscriptions & Integration)
- Custom webhook tools registered in your org (see Custom Webhook Tools)
- MCP servers you've registered (see MCP Servers)

### x402 On-chain Payments

If the agent returns `402 Payment Required`, the SDK throws `PaymentRequiredError`.
Resolve the payment externally and retry with the payment header:

```typescript
import { PaymentRequiredError } from "teardrop-sdk";

try {
  for await (const event of client.agent.run({ message: "..." })) { ... }
} catch (e) {
  if (e instanceof PaymentRequiredError) {
    // Sign the payment externally, then retry
    for await (const event of client.agent.run(
      { message: "..." },
      { paymentHeader: signedPayload },
    )) { ... }
  }
}
```

### Event Types

| Event | Key Fields | Description |
|-------|-----------|-------------|
| `RUN_STARTED` | `run_id`, `thread_id` | First event of every run |
| `TEXT_MESSAGE_START` | `message_id` | Streaming text turn begins |
| `TEXT_MESSAGE_CONTENT` | `delta` | Streaming text chunk |
| `TEXT_MESSAGE_END` | `message_id` | Streaming text turn ends |
| `TOOL_CALL_START` | `tool_call_id`, `tool_name`, `args` | Agent is calling a tool |
| `TOOL_CALL_END` | `tool_call_id`, `tool_name`, `output` | Tool returned |
| `Custom` (`TOOL_OUTPUT`) | `name`, `value` | Structured tool output |
| `SURFACE_UPDATE` | `surface_id`, `components` | UI surface payload |
| `USAGE_SUMMARY` | `tokens_in`, `tokens_out`, `cost_usdc` | Per-run token usage |
| `BILLING_SETTLEMENT` | `run_id`, `amount_usdc`, `tx_hash` | Credit deducted |
| `ERROR` | `error` | Non-fatal error during run |
| `DONE` | `run_id` | Stream complete |

### Collecting Text

Use the `collectText` helper to assemble all `TEXT_MESSAGE_CONTENT` deltas:

```typescript
import { collectText } from "teardrop-sdk";

const text = await collectText(client.agent.run({ message: "Say hi" }));
// → "Hi there!"
```

### Persistent Memory

Semantic memory per org. Entries are automatically extracted from runs or added via API.

```typescript
// List memories with cursor pagination
const { memories, next_cursor } = await client.memory.list({ limit: 50 });
for (const entry of memories) {
  console.log(`${entry.content} (from run: ${entry.source_run_id})`);
}

// Store a manual memory
await client.memory.create({ content: "The user prefers dark mode." });

// Delete a memory
await client.memory.delete("mem-123");
```

## Error Handling

All exceptions inherit from `TeardropError`.

```typescript
import {
  TeardropError,
  AuthenticationError,    // 401
  PaymentRequiredError,   // 402 — .requirements, .accepts, .paymentHeader
  ForbiddenError,         // 403
  NotFoundError,          // 404
  ConflictError,          // 409
  ValidationError,        // 422
  RateLimitError,         // 429 — .retryAfter (seconds)
  GatewayError,           // 502 / 504
  TeardropApiError,       // all other non-2xx
} from "teardrop-sdk";

try {
  for await (const event of client.agent.run({ message: "..." })) { ... }
} catch (e) {
  if (e instanceof RateLimitError) {
    await new Promise(r => setTimeout(r, e.retryAfter * 1000));
  }
}
```

## Billing

### Balance

```typescript
const balance = await client.billing.balance();
// → { org_id, balance_usdc, spending_limit_usdc, is_paused, daily_spend_usdc }
```

USDC amounts are in atomic units (6 decimals). Use `formatUsdc()` / `parseUsdc()` helpers:

```typescript
import { formatUsdc, parseUsdc } from "teardrop-sdk";

formatUsdc(5_000_000);  // → "5.000000"
parseUsdc("1.50");      // → 1500000
```

### Pricing

```typescript
const pricing = await client.billing.pricing();  // no auth required
for (const tool of pricing.tools) {
  console.log(tool.tool_name, tool.price_usdc);
}
```

### Billing History & Invoices

```typescript
const history = await client.billing.history({ limit: 50 });
const invoices = await client.billing.invoices({ limit: 20 });
const invoice = await client.billing.invoice(runId);
// → { run_id, tokens_in, tokens_out, tool_calls, total_usdc, settled_at }

const credits = await client.billing.creditHistory({ operation: "topup" });
```

### Stripe Top-up

```typescript
const resp = await client.billing.topupStripe({
  amount_cents: 1000,                            // $10.00 in cents
  return_url: "https://app.example.com/billing",
});
// resp.client_secret — pass to Stripe.js to confirm payment
// resp.session_id   — use to poll status

const status = await client.billing.topupStripeStatus(resp.session_id);
// → { status: "complete" | "open" | "expired", new_balance_fmt: "$15.00" }
```

### USDC Top-up (on-chain x402)

```typescript
// Fetch payment requirements for a given amount
const reqs = await client.billing.topupUsdcRequirements(5_000_000);
// → { accepts: [...], x402Version: 2 }

const result = await client.billing.topupUsdc({
  amount_usdc: 5_000_000,
  payment_header: "...",   // x402 payment header value
});
```

### Usage Summary

```typescript
const summary = await client.usage.me({
  start: "2026-04-01",
  end: "2026-04-30",
});
// → { total_runs, total_tokens_in, total_tokens_out, total_tool_calls, total_duration_ms }
```

## LLM Configuration

Customize which LLM provider and model the agent uses, enable bring-your-own-key
(BYOK), or route to self-hosted endpoints. Configuration is org-scoped and
persists across runs.

### Get Current Config

```typescript
const config = await client.llm.get();
// → {
//     org_id, provider: "anthropic", model: "claude-haiku-4-5-20251001",
//     has_api_key: false, api_base: null, max_tokens: 4096, temperature: 0.0,
//     routing_preference: "default", is_byok: false, created_at, updated_at
//   }
```

### Set LLM Config

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

### Delete LLM Config

```typescript
await client.llm.reset();
// Reverts the org to the global default LLM config.
```

### Supported Providers & Models

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

## Wallets

Link Ethereum wallets to a user account for USDC payments and SIWE authentication.

```typescript
const wallet = await client.wallets.link({
  siwe_message: "...",
  siwe_signature: "...",
});

const wallets = await client.wallets.list();
await client.wallets.delete(wallet.id);
```

## Custom Webhook Tools

Register custom webhook-backed tools for your org that the agent can call during
runs. These are private to your organization and not shared on the marketplace
(unless explicitly published). For comparison with marketplace tools and MCP
servers, see [Marketplace vs. Custom Tools vs. MCP Servers](#marketplace-vs-custom-tools-vs-mcp-servers) above.

```typescript
// Register
const tool = await client.tools.create({
  name: "send_email",                     // lowercase, a-z0-9_
  description: "Send an email via Sendgrid",
  input_schema: {
    type: "object",
    properties: {
      to: { type: "string" },
      subject: { type: "string" },
      body: { type: "string" },
    },
    required: ["to", "subject", "body"],
  },
  webhook_url: "https://hooks.example.com/email",
  webhook_method: "POST",                 // optional, default POST
  auth_header_name: "X-Webhook-Secret",  // optional auth header
  auth_header_value: "whsec_...",
  timeout_seconds: 10,
});

const tools = await client.tools.list();
const fetched = await client.tools.get(tool.id);

// Partial update — only provided fields are sent
const updated = await client.tools.update(tool.id, { is_active: false });
await client.tools.delete(tool.id);
```

## MCP Servers

Register external MCP (Model Context Protocol) servers. The agent auto-discovers
their tools at run time and namespaces them as `{server_name}__{tool_name}`.

```typescript
import { parseMcpToolName } from "teardrop-sdk";

// Register
const server = await client.mcp.create({
  name: "stripe",                                   // becomes tool prefix
  url: "https://your-stripe-mcp.example.com/sse",
  auth_type: "bearer",                              // "none" | "bearer" | "header"
  auth_token: "sk-...",                             // write-only; never returned
  timeout_seconds: 15,
});

const servers = await client.mcp.list();
const fetched = await client.mcp.get(server.id);

// Partial update
await client.mcp.update(server.id, { auth_token: "sk-new-...", timeout_seconds: 30 });

// Live probe — bypasses agent TTL cache, does not mutate state
const discovery = await client.mcp.discover(server.id);
for (const tool of discovery.tools) {
  console.log(tool.name, tool.description);
}

await client.mcp.delete(server.id);
```

### MCP Tool Names in Events

```typescript
for await (const event of client.agent.run("Issue a refund for ch_abc123")) {
  if (event.event === "TOOL_CALL_START") {
    const parsed = parseMcpToolName(event.data.tool_name);
    if (parsed.isMcp) {
      console.log(`MCP → ${parsed.serverName}.${parsed.toolName}`);
    }
  }
}

parseMcpToolName("stripe__create_refund");
// → { isMcp: true, serverName: "stripe", toolName: "create_refund" }

parseMcpToolName("web_search");
// → { isMcp: false }
```

### MCP Behavioural Notes

| | |
|---|---|
| Quota | 5 active servers per org by default; 422 on breach |
| Cache lag | New/updated servers are live within ~5 min (TTL 300 s); `/discover` bypasses cache |
| Auth write-only | `auth_token` is write-only; only `has_auth: boolean` is returned |
| Transport | Streamable HTTP only — stdio MCP servers are not supported |
| SSRF | Server-side URL validation blocks private IPs and localhost |

## Memory

Store and retrieve persistent memory entries scoped to the org. The agent can
read these during runs.

```typescript
const entry = await client.memory.create({ content: "User prefers responses in Spanish." });
// content: 1–500 characters

const entries = await client.memory.list({ limit: 50 });

await client.memory.delete(entry.id);
```

## A2A Delegation

Allow other organisations' agents to call your agent on behalf of their users.

```typescript
// Grant delegation rights to an org
const agent = await client.a2a.addAgent({
  agent_url: "https://partner-agent.example.com",
  label: "Partner Agent",
  permissions: ["run"],
});

const agents = await client.a2a.listAgents();

await client.a2a.removeAgent(agent.id);

// View delegation event history
const delegations = await client.a2a.delegations({ limit: 20 });
```

## Agent Wallets

Provision a CDP smart wallet for the org's agent, enabling it to sign
transactions autonomously.

```typescript
const wallet = await client.agentWallets.provision();
// → AgentWallet { id, address: "0x...", network: "base", status: "active" }

// Fetch with live on-chain balance
const info = await client.agentWallets.get({ includeBalance: true });

// Deactivate (admin only)
await client.agentWallets.deactivate();
```

## Agent Card

Fetch the A2A agent card from `/.well-known/agent-card.json`. Result is cached
for 5 minutes.

```typescript
const card = await client.getAgentCard();
// → { name, description, url, skills: [...] }
```

Alternatively, create a client and pre-warm the cache atomically:

```typescript
const client = await TeardropClient.fromAgentCard(
  "https://api.teardrop.dev",
  { email: "...", secret: "..." },
);
```

## Org Credentials

Manage machine-to-machine API credentials for your organization.

```typescript
// List existing credentials
const creds = await client.credentials.list();
// → OrgCredentialsEntry[]

// Rotate credentials (returns new client_id + client_secret)
const newCreds = await client.credentials.regenerate();
// → { client_id, client_secret }
// Store client_secret securely — it is not stored server-side
```

## Models Reference

All request/response types are exported from `teardrop-sdk`.

| Type(s) | Method |
|---------|--------|
| `TokenResponse`, `MeResponse` | `auth.login()`, `auth.me()` |
| `SseEvent`, `EVENT_*` constants | `agent.run()` yields |
| `CreditBalance` / `BillingBalance` | `billing.balance()` |
| `BillingPricingResponse`, `ToolPricing` | `billing.pricing()` |
| `BillingHistoryEntry` | `billing.history()` |
| `Invoice` | `billing.invoices()`, `billing.invoice()` |
| `CreditHistoryEntry` | `billing.creditHistory()` |
| `StripeTopupRequest`, `StripeTopupResponse`, `StripeTopupStatusResponse` | `billing.topupStripe()`, `billing.topupStripeStatus()` |
| `UsdcTopupRequirements`, `UsdcTopupRequest` | `billing.topupUsdcRequirements()`, `billing.topupUsdc()` |
| `UsageSummary` | `usage.me()` |
| `OrgLlmConfig`, `SetLlmConfigRequest`, `ProviderType`, `RoutingPreference` | `llm.*` |
| `ModelBenchmarksResponse`, `ModelInfo`, `ModelPricing`, `ModelRunBenchmarks` | `models.benchmarks()`, `models.orgBenchmarks()` |
| `Wallet`, `LinkWalletRequest` | `wallets.list()`, `wallets.link()` |
| `AgentCard` | `getAgentCard()`, `TeardropClient.fromAgentCard()` |
| `OrgTool`, `CreateOrgToolRequest`, `UpdateOrgToolRequest` | `tools.*` |
| `OrgMcpServer`, `CreateMcpServerRequest`, `UpdateMcpServerRequest`, `DiscoverMcpToolsResponse`, `McpToolDefinition` | `mcp.*` |
| `MemoryEntry`, `StoreMemoryRequest` | `memory.*` |
| `MarketplaceTool`, `MarketplaceSubscription`, `AuthorConfig`, `EarningsEntry`, `WithdrawRequest` | `marketplace.*` |
| `AddTrustedAgentRequest`, `TrustedAgent` | `a2a.*` |
| `AgentWallet` | `agentWallets.*` |
| `OrgCredentialsEntry`, `OrgCredentialsResponse`, `RegenerateCredentialsResponse` | `credentials.*` |
| `TokenManager`, `HttpTransport` | Advanced: direct token control |

Import any type directly:

```typescript
import type { OrgLlmConfig, ModelBenchmarksResponse, CreditBalance } from "teardrop-sdk";
```

## Development

```bash
# Install dependencies
npm install

# Type-check
npm run lint

# Build
npm run build

# Run tests
npm test
```

### Integration Tests

Integration tests make real HTTP requests against the Teardrop API. Set the
following environment variables to enable them:

```bash
export TEARDROP_TEST_URL="https://api.teardrop.dev"
export TEARDROP_TEST_EMAIL="you@example.com"
export TEARDROP_TEST_SECRET="your-password"

npx vitest run tests/integration
```

Without those variables set, all integration tests are skipped automatically.

## License

MIT
