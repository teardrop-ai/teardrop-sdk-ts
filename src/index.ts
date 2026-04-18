// Client
export { TeardropClient } from "./client";
export type { TeardropClientOptions } from "./client";

// Resource modules
export { AuthModule } from "./auth";
export { AgentModule } from "./agent";
export type { AgentRunOptions } from "./agent";
export { ToolsModule } from "./tools";
export { McpModule } from "./mcp";
export { MemoryModule } from "./memory";
export { WalletsModule } from "./wallets";
export { AgentWalletsModule } from "./agentWallets";
export { BillingModule } from "./billing";
export { UsageModule } from "./usage";
export { MarketplaceModule } from "./marketplace";
export { LlmModule } from "./llmConfig";
export { ModelsModule } from "./models";
export { A2AModule } from "./a2a";

// Errors
export {
  TeardropError,
  TeardropApiError,
  AuthenticationError,
  PaymentRequiredError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  GatewayError,
} from "./errors";

// Types
export type {
  TokenResponse,
  JwtPayloadBase,
  JwtPayloadSiwe,
  AgentRunRequest,
  SseEvent,
  RunStartedEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  ToolCallStartEvent,
  ToolCallEndEvent,
  SurfaceUpdateEvent,
  UsageSummaryEvent,
  BillingSettlementEvent,
  RunFinishedEvent,
  ErrorEvent,
  DoneEvent,
  OrgTool,
  CreateOrgToolRequest,
  UpdateOrgToolRequest,
  McpServerAuthType,
  OrgMcpServer,
  CreateMcpServerRequest,
  UpdateMcpServerRequest,
  McpToolDefinition,
  DiscoverMcpToolsResponse,
  MemoryEntry,
  StoreMemoryRequest,
  Wallet,
  LinkWalletRequest,
  ToolPricing,
  BillingPricingResponse,
  CreditBalance,
  BillingHistoryEntry,
  Invoice,
  CreditHistoryEntry,
  StripeTopupRequest,
  StripeTopupResponse,
  StripeTopupStatusResponse,
  UsdcTopupRequirements,
  UsdcTopupRequest,
  UsageSummary,
  MarketplaceTool,
  AuthorConfig,
  EarningsEntry,
  WithdrawRequest,
  MarketplaceSubscription,
  ProviderType,
  RoutingPreference,
  OrgLlmConfig,
  SetLlmConfigRequest,
  ModelPricing,
  ModelRunBenchmarks,
  ModelInfo,
  ModelBenchmarksResponse,
  AddTrustedAgentRequest,
  TrustedAgent,
  AgentWallet,
  AgentCard,
} from "./types";

// Constants
export {
  MODELS_BY_PROVIDER,
  EVENT_RUN_STARTED,
  EVENT_RUN_FINISHED,
  EVENT_TEXT_MSG_START,
  EVENT_TEXT_MSG_CONTENT,
  EVENT_TEXT_MSG_END,
  EVENT_TOOL_CALL_START,
  EVENT_TOOL_CALL_END,
  EVENT_SURFACE_UPDATE,
  EVENT_USAGE_SUMMARY,
  EVENT_BILLING_SETTLEMENT,
  EVENT_ERROR,
  EVENT_DONE,
} from "./types";

// Utilities
export { parseSseStream, collectText, collectTextSync } from "./utils/parseSseStream";
export { parseMcpToolName } from "./utils/parseMcpToolName";
export { parseMarketplaceToolName } from "./utils/parseMarketplaceToolName";
export { formatUsdc, parseUsdc } from "./utils/atomicUsdc";
