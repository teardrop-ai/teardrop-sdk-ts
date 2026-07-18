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
# Optional: use a pre-authenticated JWT and avoid login rate limits.
# export TEARDROP_TEST_TOKEN="eyJ..."
# Agent run tests require explicit opt-in and organization credit.
# export TEARDROP_TEST_ALLOW_BILLABLE_RUNS="1"
# A2A trusted-agent mutation requires an admin test organization.
# export TEARDROP_TEST_ALLOW_A2A_MUTATION="1"
# Use TEARDROP_TEST_A2A_AGENT_URL with an org-admin token, or provide a
# platform-admin token and target organization for the admin endpoint.
# export TEARDROP_TEST_A2A_AGENT_URL="https://agent.example.com"
# export TEARDROP_TEST_A2A_ORG_ADMIN_TOKEN="..."
# Or use the platform-admin endpoint with an explicit target organization.
# export TEARDROP_TEST_A2A_PLATFORM_ADMIN_TOKEN="..."
# export TEARDROP_TEST_A2A_ORG_ID="..."
# Optional: verify a normal member receives the expected 403.
# export TEARDROP_TEST_A2A_MEMBER_TOKEN="..."
# Agent-wallet mutation requires a supported configured chain.
# export TEARDROP_TEST_ALLOW_AGENT_WALLET_MUTATION="1"
# export TEARDROP_TEST_AGENT_WALLET_CHAIN_ID="84532"
# Marketplace subscription tests require an external healthy community tool.
# export TEARDROP_TEST_MARKETPLACE_COMMUNITY_TOOL="author/tool_name"
# export TEARDROP_TEST_MARKETPLACE_OWN_AUTHOR_SLUG="your-org"
# Optional: assert the expected external author slug.
# export TEARDROP_TEST_MARKETPLACE_AUTHOR_SLUG="other-org"
# MCP tests require a real reachable Streamable HTTP endpoint.
# export TEARDROP_TEST_MCP_URL="https://mcp.example.com/mcp"
# export TEARDROP_TEST_MCP_TOOL="tool_name"
# export TEARDROP_TEST_ALLOW_MCP_UNAVAILABLE="1"  # explicitly allow 502 skips
# Credential rotation additionally requires a disposable test organization.
# export TEARDROP_TEST_ALLOW_CREDENTIAL_ROTATION="1"
# export TEARDROP_TEST_CREDENTIAL_ROTATION_DISPOSABLE_ORG="1"

npm run test:integration
```

Without the URL set, all integration tests are skipped automatically. The
token, billable-run, and credential-rotation variables are optional.

## License

MIT
