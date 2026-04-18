# teardrop-sdk

TypeScript SDK for the [Teardrop](https://github.com/teardrop-ai/teardrop) AI agent API.

> Stream agent responses with full type safety, SSE streaming, and x402 payment support.

## Install

```bash
npm install teardrop-sdk
```

## Quick Start

```typescript
import { TeardropClient } from "teardrop-sdk";

const client = new TeardropClient({
  baseUrl: "https://api.teardrop.dev",
});

// Authenticate
await client.auth.login({ email: "you@example.com", secret: "your-password" });

// Stream an agent run
for await (const event of client.agent.run({ message: "What is 2 + 2?" })) {
  if (event.event === "TEXT_MESSAGE_CONTENT") {
    process.stdout.write(event.data.delta);
  }
}
```

### Pre-authenticated Token

```typescript
const client = new TeardropClient({
  baseUrl: "https://api.teardrop.dev",
  token: "your-jwt-token",
});
```

## Authentication

Credentials are exchanged via `client.auth.login()`. The JWT is stored automatically for subsequent requests.

| Method | Code |
|--------|------|
| Email + password | `client.auth.login({ email: "...", secret: "..." })` |
| Client credentials (M2M) | `client.auth.login({ client_id: "...", client_secret: "..." })` |
| SIWE (Sign-In with Ethereum) | `client.auth.login({ siwe_message: "...", siwe_signature: "..." })` |
| Pre-authenticated token | `new TeardropClient({ baseUrl, token: "..." })` |

### SIWE Login Flow

```typescript
// 1. Fetch a single-use nonce
const { nonce } = await client.auth.siweNonce();

// 2. Build and sign an EIP-4361 message client-side
const message = buildSiweMessage({ nonce, ... });
const signature = wallet.signMessage(message);

// 3. Exchange for a JWT — stored automatically
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

### Token Refresh / Logout

```typescript
const newTokens = await client.auth.refresh(refreshToken);
await client.auth.logout(refreshToken);
```

### Inspect Identity

```typescript
const me = await client.auth.me();
// → { sub, org_id, role, auth_method, email, ... }
```

## Agent Runs

```typescript
for await (const event of client.agent.run({
  message: "Summarise the top DeFi news today",
  thread_id: "conv-abc123",        // optional; auto-generated if omitted
  context: { user_timezone: "Europe/Berlin" },  // optional extra context
})) {
  console.log(event.event, event.data);
}
```

### x402 On-chain Payments

If the agent returns `402 Payment Required`, the SDK throws `PaymentRequiredError`. Resolve the payment and retry with the payment header:

```typescript
import { PaymentRequiredError } from "teardrop-sdk";

try {
  for await (const event of client.agent.run({ message: "..." })) { ... }
} catch (e) {
  if (e instanceof PaymentRequiredError) {
    // Sign the payment, then retry
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
| `TOOL_CALL_END` | `tool_call_id`, `result` | Tool returned |
| `SURFACE_UPDATE` | `surface`, `content` | UI surface payload |
| `USAGE_SUMMARY` | `tokens_in`, `tokens_out`, `tool_calls` | Per-run token usage |
| `BILLING_SETTLEMENT` | `run_id`, `cost_usdc` | Credit deducted |
| `ERROR` | `error` | Non-fatal error during run |
| `DONE` | — | Stream complete |

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
const credits = await client.billing.creditHistory({ operation: "topup" });
```

### Stripe Top-up

```typescript
const resp = await client.billing.topupStripe({
  amount_cents: 1000,  // $10.00
  return_url: "https://app.example.com/billing",
});
// resp.client_secret — pass to Stripe.js
// resp.session_id — poll for status

const status = await client.billing.topupStripeStatus(resp.session_id);
```

### USDC Top-up (on-chain x402)

```typescript
const reqs = await client.billing.topupUsdcRequirements(5_000_000);
const result = await client.billing.topupUsdc({
  amount_usdc: 5_000_000,
  payment_header: "...",
});
```

## Usage

```typescript
const summary = await client.usage.me({
  start: "2026-04-01",
  end: "2026-04-30",
});
// → { total_runs, total_tokens_in, total_tokens_out, total_tool_calls, total_duration_ms }
```

## LLM Configuration

```typescript
// Get current config
const config = await client.llm.get();

// Set LLM config
await client.llm.set({
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  routing_preference: "cost",
  max_tokens: 4096,
  temperature: 0.0,
});

// Delete custom config (revert to default)
await client.llm.reset();

// Client-side constants
const providers = client.llm.listSupportedProviders();
const models = client.llm.listModelsForProvider("anthropic");
```

## Model Benchmarks

```typescript
const benchmarks = await client.models.benchmarks();        // public, no auth
const orgBenchmarks = await client.models.orgBenchmarks();  // org-scoped, auth required
```

## Wallets

```typescript
const wallet = await client.wallets.link({
  siwe_message: "...",
  siwe_signature: "...",
});
const wallets = await client.wallets.list();
await client.wallets.delete(wallet.id);
```

## Org Webhook Tools

```typescript
const tool = await client.tools.create({
  name: "send_email",
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
});

const tools = await client.tools.list();
const updated = await client.tools.update(tool.id, { is_active: false });
await client.tools.delete(tool.id);
```

## MCP Servers

```typescript
import { parseMcpToolName } from "teardrop-sdk";

const server = await client.mcp.create({
  name: "stripe",
  url: "https://your-stripe-mcp.example.com/sse",
  auth_type: "bearer",
  auth_token: "sk-...",
});

const servers = await client.mcp.list();
const discovery = await client.mcp.discover(server.id);

// Parse MCP tool names from events
const parsed = parseMcpToolName("stripe__create_refund");
// → { isMcp: true, serverName: "stripe", toolName: "create_refund" }

parseMcpToolName("web_search");
// → { isMcp: false }
```

## Memory

```typescript
const entry = await client.memory.create({ content: "User prefers Spanish." });
const entries = await client.memory.list({ limit: 50 });
await client.memory.delete(entry.id);
```

## Marketplace

```typescript
import { parseMarketplaceToolName } from "teardrop-sdk";

const catalog = await client.marketplace.catalog({ limit: 20 });
const sub = await client.marketplace.subscribe("acme/web_search");
const subs = await client.marketplace.subscriptions();
await client.marketplace.unsubscribe(sub.id);

parseMarketplaceToolName("acme/web_search");
// → { orgSlug: "acme", toolName: "web_search" }
```

### Author Configuration & Earnings

```typescript
await client.marketplace.setAuthorConfig({ settlement_wallet: "0x..." });
const balance = await client.marketplace.balance();
const earnings = await client.marketplace.earnings({ limit: 50 });
const result = await client.marketplace.withdraw({ amount_usdc: 1_000_000 });
```

## A2A Delegation

```typescript
const agent = await client.a2a.addAgent({
  agent_url: "https://partner-agent.example.com",
  label: "Partner Agent",
  permissions: ["run"],
});

const agents = await client.a2a.listAgents();
await client.a2a.removeAgent(agent.id);
const delegations = await client.a2a.delegations({ limit: 20 });
```

## Agent Wallets

```typescript
const wallet = await client.agentWallets.provision();
const info = await client.agentWallets.get({ includeBalance: true });
await client.agentWallets.deactivate();
```

## Agent Card

```typescript
const card = await client.getAgentCard();
// → { name, description, url, skills, ... }
```

## Publishing to npm

### Manual publish

```bash
npm run build
npm publish --access public
```

### Automated (GitHub Actions)

The repo includes a GitHub Actions workflow at `.github/workflows/publish.yml` that automatically publishes to npm when a GitHub Release is created.

**Setup:**

1. Generate an npm access token at [npmjs.com](https://www.npmjs.com/settings/~/tokens)
2. Add it as a repository secret named `NPM_TOKEN`
3. Create a GitHub Release (the workflow publishes on the `release` event)

### Version bumping

```bash
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0
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

## License

MIT
