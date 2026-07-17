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

## Documentation

Detailed guides live in [docs/](docs/), one file per resource module:

| Topic | Module | Covers |
|-------|--------|--------|
| [Authentication](docs/authentication.md) | `client.auth`, `client.credentials` | Login methods, SIWE, registration, invites, token refresh, M2M credentials |
| [Agent Runs](docs/agent-runs.md) | `client.agent` | SSE streaming, tool policy, event types, `collectText`, agent card |
| [Memory](docs/memory.md) | `client.memory` | Org-scoped persistent memory read during runs |
| [Marketplace](docs/marketplace.md) | `client.marketplace` | Browse, subscribe, publish, and earn on shared agent tools |
| [Tools & MCP Servers](docs/tools-and-mcp.md) | `client.tools`, `client.mcp` | Org-private webhook tools and external MCP server registration |
| [Billing & Usage](docs/billing-and-usage.md) | `client.billing`, `client.usage` | Balance, pricing, invoices, Stripe/USDC top-ups, usage summaries |
| [LLM Configuration & Models](docs/llm-and-models.md) | `client.llm`, `client.models` | Provider/model routing, BYOK, benchmark-driven model selection |
| [Automation](docs/automation.md) | `client.schedules`, `client.eventTriggers` | Interval-based scheduled runs and inbound event triggers |
| [Wallets & Delegation](docs/wallets-and-delegation.md) | `client.wallets`, `client.agentWallets`, `client.a2a` | SIWE wallets, CDP agent wallets, cross-org A2A delegation |
| Administration | `client.admin` | Organization, user, billing, settlement, and platform administration endpoints |
| [Error Handling](docs/error-handling.md) | cross-cutting | `TeardropError` hierarchy and retry patterns |
| [Type Reference](docs/type-reference.md) | `teardrop-sdk` | Exported TypeScript types indexed by method |

## API Reference

The [docs/](docs/) guides describe SDK usage; the canonical API contracts are:

- [spec/openapi.json](spec/openapi.json) — full REST endpoint schemas
- [spec/events.schema.json](spec/events.schema.json) — SSE event schema for `client.agent.run()`

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
