# Type Reference — SDK Types by Method

**Index mapping exported TypeScript types to the client methods that produce or consume them.**

**Module:** `teardrop-sdk` (root export)

All request/response types are exported from `teardrop-sdk`.

| Type(s) | Method |
|---------|--------|
| `TokenResponse`, `RegisterRequest`, `MeResponse` | `auth.login()`, `auth.register()`, `auth.me()` |
| `SseEvent`, `EVENT_*` constants | `agent.run()` yields |
| `CreditBalance` / `BillingBalance` | `billing.balance()` |
| `BillingPricingResponse`, `ToolPricing` | `billing.pricing()` |
| `BillingHistoryEntry` | `billing.history()` |
| `Invoice`, `InvoiceListResponse` | `billing.invoices()` (paginated), `billing.invoice()` |
| `CreditHistoryEntry`, `CreditHistoryResponse` | `billing.creditHistory()` (paginated) |
| `StripeTopupRequest`, `StripeTopupResponse`, `StripeTopupStatusResponse` | `billing.topupStripe()`, `billing.topupStripeStatus()` |
| `UsdcTopupRequirements`, `UsdcTopupRequest` | `billing.topupUsdcRequirements()`, `billing.topupUsdc()` |
| `UsageSummary` | `usage.me()` |
| `OrgLlmConfig`, `SetLlmConfigRequest`, `ProviderType`, `RoutingPreference` | `llm.*` |
| `ModelBenchmarksResponse`, `ModelInfo`, `ModelPricing`, `ModelRunBenchmarks` | `models.benchmarks()`, `models.orgBenchmarks()` |
| `Wallet`, `LinkWalletRequest` | `wallets.list()`, `wallets.link()` |
| `AgentCard` | `getAgentCard()`, `TeardropClient.fromAgentCard()` |
| `RunOutcomeRequest`, `RunOutcomeResponse`, `RunOutcomeRating` | `agent.setOutcome()` |
| `OrgTool`, `CreateOrgToolRequest`, `UpdateOrgToolRequest` | `tools.*` |
| `TestWebhookRequest`, `TestWebhookResponse` | `tools.testWebhook()` |
| `OrgMcpServer`, `CreateMcpServerRequest`, `UpdateMcpServerRequest`, `DiscoverMcpToolsResponse`, `McpToolDefinition`, `TestMcpToolRequest`, `TestMcpToolResponse` | `mcp.*` |
| `MemoryEntry`, `StoreMemoryRequest` | `memory.*` |
| `MarketplaceTool`, `MarketplaceSubscription`, `AuthorConfig`, `EarningsEntry`, `WithdrawRequest` | `marketplace.*` |
| Marketplace author, catalog, earnings, import, and feedback types | `marketplace.*` |
| `AddTrustedAgentRequest`, `TrustedAgent` | `a2a.*` |
| `AgentWallet` | `agentWallets.*` |
| `OrgCredentialsEntry`, `OrgCredentialsResponse`, `RegenerateCredentialsResponse` | `credentials.*` |
| `TokenManager`, `HttpTransport` | Advanced: direct token control |
| `HealthResponse` | `client.health()` |
| Admin request/response types, including `TelemetryCompletenessBySource`, `TelemetryCompletenessResponse` | `client.admin.*` (server-enforced admin role) |

Import any type directly:

```typescript
import type { OrgLlmConfig, ModelBenchmarksResponse, CreditBalance } from "teardrop-sdk";
```

For full request/response JSON Schemas, see the canonical
[../spec/openapi.json](../spec/openapi.json) and [../spec/events.schema.json](../spec/events.schema.json).

## Deliberate Scope Boundaries

The SDK covers the authenticated and public resource operations, the agent-card
helper, health checks, and the SSE agent-run stream. These OpenAPI operations are
intentionally outside this package because they are server metadata, protocol
servers, or inbound receiver surfaces:

- `GET /.well-known/jwks.json` and `GET /.well-known/x402` are deployment
	metadata for external JWT verification and x402 registries.
- `GET /.well-known/mcp/server-card.json`, `GET /.well-known/oauth-protected-resource`,
	and `GET /.well-known/oauth-protected-resource/{resource_path}` are MCP
	registry/auth metadata served by the API.
- `POST /mcp/v1` is the server-side MCP Streamable HTTP JSON-RPC handler; use
	`client.mcp` for Teardrop's authenticated server registration and diagnostics.
- `POST /message:send` is the inbound A2A blocking message endpoint; `client.a2a`
	only calls the Teardrop REST delegation endpoints. The async counterpart
	`GET /message:status/{task_id}` is covered by `client.a2a.messageStatus()`.

Webhook receiver hosting and signature verification, admin authorization,
settlement execution, and other server-side policy also remain server concerns.
`eventTriggers.fire()` sends the server-defined trigger-secret header, and
`client.admin` uses the shared transport while the API enforces permissions.
Live integration behavior requires the environment variables described in
[the README](../README.md).

---

**See also:** [../README.md](../README.md)
