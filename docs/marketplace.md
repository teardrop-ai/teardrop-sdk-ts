# Marketplace — Discover, Subscribe, and Monetize Agent Tools

**Public tool catalogue with browsing, subscriptions, and author publishing/earnings workflows.**

**Module:** `client.marketplace`

Discover, subscribe to, and monetize tools on the Teardrop marketplace. The
marketplace is a curated catalogue of reusable agent tools built and published
by the Teardrop community and core team.

## Three Core Workflows

1. **Browsing** (public, no auth) — Discover tools in the marketplace catalogue
2. **Subscriptions** (auth required) — Subscribe to and use marketplace tools in your agent runs
3. **Publishing & Earnings** (auth required) — Publish your own tools and track revenue

## Browsing Tools (Public)

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

// Browse one author's profile and inspect a single published tool
const author = await client.marketplace.getAuthorProfile("acme", { limit: 20 });
const detail = await client.marketplace.getCatalogDetail("acme", "web_search");
console.log(author.org_name, author.tool_count, detail.tool.qualified_name);
```

## Subscriptions & Integration

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

## Publishing & Earnings

### Author Setup

```typescript
// Configure payout wallet for earnings
const config = await client.marketplace.setAuthorConfig({
  settlement_wallet: "0xYourWalletAddress",
});
const current = await client.marketplace.getAuthorConfig();
// → { org_id, settlement_wallet, created_at, updated_at }
```

### Earnings & Revenue Tracking

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

// View aggregate totals for each tool
const byTool = await client.marketplace.earningsByTool();
for (const tool of byTool.tools) {
  console.log(tool.tool_name, tool.total_author_share_usdc);
}
```

### Import MCP Tools

Preview registered MCP tools before publishing them, then publish the selected
tools with marketplace metadata and pricing:

```typescript
const preview = await client.marketplace.previewImport({
  server_id: "mcp-server-id",
  tool_names: ["search"],
});

if (preview.can_publish) {
  await client.marketplace.publishImport({
    server_id: preview.server_id,
    tools: [{
      remote_tool_name: "search",
      name: "search",
      description: "Search the web",
      category: "search",
      base_price_usdc: 100,
    }],
  });
}
```

### Tool Feedback

Submit a ground-truth quality signal for a tool call from one of your runs:

```typescript
await client.marketplace.submitToolFeedback("acme", "web_search", {
  run_id: "run-id",
  rating: 1, // -1 = bad, 0 = neutral, 1 = good
  comment: "Returned useful results",
});
```

### Withdrawals

```typescript
// Request payout
const result = await client.marketplace.withdraw({ amount_usdc: 1_000_000 });
// → { id, org_id, amount_usdc, wallet, status, created_at }

// Withdrawal history
const { withdrawals, next_cursor } = await client.marketplace.withdrawals({ limit: 20 });
```

## Using Marketplace Tools in Agent Runs

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

### Tool Naming

```typescript
import { parseMarketplaceToolName } from "teardrop-sdk";

const parsed = parseMarketplaceToolName("acme/web_search");
// → { orgSlug: "acme", toolName: "web_search" }
```

### Payment Errors

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

## Marketplace vs. Custom Tools vs. MCP Servers

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
- Internal tool for your org's agent? → **Custom Webhook Tool** (see [Tools & MCP Servers](tools-and-mcp.md))
- Integrating external services (Stripe, Slack, etc.)? → **MCP Server or Custom Webhook Tool**
- Need stdio-based tool protocol? → **MCP Server** (see [Tools & MCP Servers](tools-and-mcp.md))

---

**See also:** [Tools & MCP Servers](tools-and-mcp.md) for org-private alternatives ·
[Billing & Usage](billing-and-usage.md) for `formatUsdc()` / `parseUsdc()` atomic-unit
helpers · [Error Handling](error-handling.md) for `PaymentRequiredError` ·
[../README.md](../README.md)
