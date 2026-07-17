# Type Reference — SDK Types by Method

**Index mapping exported TypeScript types to the client methods that produce or consume them.**

**Module:** `teardrop-sdk` (root export)

All request/response types are exported from `teardrop-sdk`.

| Type(s) | Method |
|---------|--------|
| `TokenResponse`, `MeResponse` | `auth.login()`, `auth.me()` |
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

For full request/response JSON Schemas, see the canonical
[../spec/openapi.json](../spec/openapi.json) and [../spec/events.schema.json](../spec/events.schema.json).

---

**See also:** [../README.md](../README.md)
