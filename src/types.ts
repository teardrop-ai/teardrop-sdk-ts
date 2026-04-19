// ── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_token?: string;
}

export interface JwtPayloadBase {
  sub: string;
  org_id: string;
  role: "admin" | "member";
  auth_method: string;
  email?: string;
  iss: string;
  exp: number;
  iat: number;
}

export interface JwtPayloadSiwe extends JwtPayloadBase {
  auth_method: "siwe";
  address: string;
  chain_id: number;
}

// ── Agent ────────────────────────────────────────────────────────────────────

export interface AgentRunRequest {
  message: string;
  thread_id?: string;
  context?: Record<string, unknown>;
}

export interface RunStartedEvent {
  event: "RUN_STARTED";
  data: { run_id: string; thread_id: string };
}

export interface TextMessageStartEvent {
  event: "TEXT_MESSAGE_START";
  data: { message_id: string };
}

export interface TextMessageContentEvent {
  event: "TEXT_MESSAGE_CONTENT";
  data: { message_id: string; delta: string };
}

export interface TextMessageEndEvent {
  event: "TEXT_MESSAGE_END";
  data: { message_id: string };
}

export interface ToolCallStartEvent {
  event: "TOOL_CALL_START";
  data: {
    tool_call_id: string;
    tool_name: string;
    args: Record<string, unknown>;
  };
}

export interface ToolCallEndEvent {
  event: "TOOL_CALL_END";
  data: {
    tool_call_id: string;
    tool_name: string;
    output: string;
  };
}

export interface SurfaceUpdateEvent {
  event: "SURFACE_UPDATE";
  data: {
    surface_id: string;
    components: unknown[];
  };
}

export interface UsageSummaryEvent {
  event: "USAGE_SUMMARY";
  data: {
    run_id: string;
    tokens_in: number;
    tokens_out: number;
    tool_calls: number;
    duration_ms: number;
    cost_usdc: number;
    platform_fee_usdc: number;
    delegation_cost_usdc: number;
  };
}

export interface BillingSettlementEvent {
  event: "BILLING_SETTLEMENT";
  data: {
    run_id: string;
    amount_usdc: number;
    tx_hash: string;
    network: string;
    delegation_cost_usdc: number;
    platform_fee_usdc: number;
  };
}

export interface RunFinishedEvent {
  event: "RUN_FINISHED";
  data: { run_id: string };
}

export interface ErrorEvent {
  event: "ERROR";
  data: { run_id: string; error: string };
}

export interface DoneEvent {
  event: "DONE";
  data: { run_id: string };
}

export type SseEvent =
  | RunStartedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallEndEvent
  | SurfaceUpdateEvent
  | UsageSummaryEvent
  | BillingSettlementEvent
  | RunFinishedEvent
  | ErrorEvent
  | DoneEvent;

// ── Org Webhook Tools ────────────────────────────────────────────────────────

export interface OrgTool {
  id: string;
  org_id: string;
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  webhook_url: string;
  webhook_method: string;
  has_auth: boolean;
  is_active: boolean;
  publish_as_mcp: boolean;
  marketplace_description: string | null;
  base_price_usdc: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrgToolRequest {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  webhook_url: string;
  webhook_method?: string;
  auth_header_name?: string;
  auth_header_value?: string;
  timeout_seconds?: number;
  publish_as_mcp?: boolean;
  marketplace_description?: string;
  base_price_usdc?: number;
}

export interface UpdateOrgToolRequest {
  description?: string;
  input_schema?: Record<string, unknown>;
  webhook_url?: string;
  webhook_method?: string;
  auth_header_name?: string;
  auth_header_value?: string;
  timeout_seconds?: number;
  is_active?: boolean;
  publish_as_mcp?: boolean;
  marketplace_description?: string;
  base_price_usdc?: number;
}

// ── MCP Servers ──────────────────────────────────────────────────────────────

export type McpServerAuthType = "none" | "bearer" | "header";

export interface OrgMcpServer {
  id: string;
  org_id: string;
  name: string;
  url: string;
  auth_type: McpServerAuthType;
  has_auth: boolean;
  auth_header_name: string | null;
  is_active: boolean;
  timeout_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMcpServerRequest {
  name: string;
  url: string;
  auth_type?: McpServerAuthType;
  auth_token?: string;
  auth_header_name?: string;
  timeout_seconds?: number;
}

export interface UpdateMcpServerRequest {
  name?: string;
  url?: string;
  auth_type?: McpServerAuthType;
  auth_token?: string;
  auth_header_name?: string;
  timeout_seconds?: number;
  is_active?: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface DiscoverMcpToolsResponse {
  server_id: string;
  server_name?: string;
  tools: McpToolDefinition[];
  discovered_at?: string;
}

// ── Memory ───────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  content: string;
  created_at: string;
}

export interface StoreMemoryRequest {
  content: string;
}

// ── Wallets ──────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  org_id: string;
  user_id: string;
  address: string;
  chain_id: number;
  is_primary: boolean;
  created_at: string;
}

export interface LinkWalletRequest {
  siwe_message: string;
  siwe_signature: string;
}

// ── Billing ──────────────────────────────────────────────────────────────────

export interface ToolPricing {
  tool_name: string;
  price_usdc: number;
  description: string;
}

export interface BillingPricingResponse {
  tools: ToolPricing[];
  base_cost_usdc: number;
  updated_at: string;
}

export interface CreditBalance {
  org_id: string;
  balance_usdc: number;
  spending_limit_usdc: number;
  is_paused: boolean;
  daily_spend_usdc: number;
}

export interface BillingHistoryEntry {
  run_id: string;
  user_id: string;
  amount_usdc: number;
  method: "credit" | "x402";
  status: "pending" | "settled" | "failed";
  created_at: string;
}

export interface Invoice {
  run_id: string;
  tokens_in: number;
  tokens_out: number;
  tool_calls: number;
  total_usdc: number;
  breakdown: Array<{ item: string; amount_usdc: number }>;
  settled_at: string;
}

export interface CreditHistoryEntry {
  id: string;
  amount_usdc: number;
  method: "stripe" | "usdc" | "admin";
  reference: string | null;
  created_at: string;
}

export interface StripeTopupRequest {
  amount_cents: number;
  return_url: string;
}

export interface StripeTopupResponse {
  client_secret: string;
  session_id: string;
}

export interface StripeTopupStatusResponse {
  status: "open" | "complete" | "expired";
  new_balance_fmt?: string;
}

export interface UsdcTopupRequirements {
  accepts: Record<string, unknown>[];
  x402Version: number;
}

export interface UsdcTopupRequest {
  amount_usdc: number;
  payment_header: string;
}

// ── Usage ────────────────────────────────────────────────────────────────────

export interface UsageSummary {
  total_runs: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_tool_calls: number;
  total_duration_ms: number;
}

// ── Marketplace ──────────────────────────────────────────────────────────────

export interface MarketplaceTool {
  name: string;
  qualified_name: string;
  description: string;
  marketplace_description: string | null;
  input_schema: Record<string, unknown>;
  cost_usdc: number;
  author_org_name: string;
  author_org_slug: string;
}

export interface AuthorConfig {
  org_id: string;
  settlement_wallet: string;
  created_at: string;
  updated_at: string;
}

export interface EarningsEntry {
  id: string;
  tool_name: string;
  amount_usdc: number;
  caller_org_id: string;
  author_share_usdc: number;
  platform_share_usdc: number;
  status: string;
  created_at: string;
}

export interface WithdrawRequest {
  amount_usdc: number;
}

export interface MarketplaceSubscription {
  id: string;
  org_id: string;
  qualified_tool_name: string;
  is_active: boolean;
  subscribed_at: string;
}

// ── LLM Config ───────────────────────────────────────────────────────────────

export type ProviderType = "anthropic" | "openai" | "google" | "openrouter";
export type RoutingPreference = "default" | "cost" | "speed" | "quality";

export interface OrgLlmConfig {
  org_id: string;
  provider: string;
  model: string;
  has_api_key: boolean;
  api_base: string | null;
  max_tokens: number;
  temperature: number;
  timeout_seconds: number;
  routing_preference: string;
  is_byok: boolean;
  created_at: string;
  updated_at: string;
}

export interface SetLlmConfigRequest {
  provider: ProviderType;
  model: string;
  /**
   * - `undefined` (omit) — preserve existing key
   * - `null` — clear BYOK, revert to shared platform key
   * - `string` — set a new BYOK key
   */
  api_key?: string | null;
  api_base?: string;
  max_tokens?: number;
  temperature?: number;
  timeout_seconds?: number;
  routing_preference?: RoutingPreference;
}

// ── Model Benchmarks ─────────────────────────────────────────────────────────

export interface ModelPricing {
  tokens_in_cost_per_1k: number;
  tokens_out_cost_per_1k: number;
  tool_call_cost: number;
}

export interface ModelRunBenchmarks {
  total_runs_7d: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  avg_cost_usdc_per_run: number;
  avg_tokens_per_sec: number;
}

export interface ModelInfo {
  provider: string;
  model: string;
  display_name: string;
  context_window: number;
  supports_tools: boolean;
  supports_streaming: boolean;
  quality_tier: number;
  pricing: ModelPricing;
  benchmarks: ModelRunBenchmarks | null;
}

export interface ModelBenchmarksResponse {
  models: ModelInfo[];
  updated_at: string;
}

// ── A2A Delegation ───────────────────────────────────────────────────────────

export interface AddTrustedAgentRequest {
  agent_url: string;
  label?: string;
  max_cost_usdc?: number;
  require_x402?: boolean;
  jwt_forward?: boolean;
}

export interface TrustedAgent {
  id: string;
  org_id: string;
  agent_url: string;
  label: string | null;
  max_cost_usdc: number | null;
  require_x402: boolean;
  jwt_forward: boolean;
  is_active: boolean;
  created_at: string;
}

// ── Agent Wallets ────────────────────────────────────────────────────────────

export interface AgentWallet {
  id: string;
  org_id: string;
  address: string;
  network: string;
  is_active: boolean;
  created_at: string;
}

// ── Agent Card ───────────────────────────────────────────────────────────────

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  skills: Record<string, unknown>[];
  [key: string]: unknown;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const MODELS_BY_PROVIDER: Record<string, string[]> = {
  anthropic: ["claude-haiku-4-5-20251001", "claude-sonnet-4-20250514"],
  openai: ["gpt-4o-mini", "gpt-4o"],
  google: ["gemini-2.0-flash", "gemini-2.5-pro"],
  openrouter: [],
};

// ── SSE Event Type Constants ─────────────────────────────────────────────────

export const EVENT_RUN_STARTED = "RUN_STARTED" as const;
export const EVENT_RUN_FINISHED = "RUN_FINISHED" as const;
export const EVENT_TEXT_MSG_START = "TEXT_MESSAGE_START" as const;
export const EVENT_TEXT_MSG_CONTENT = "TEXT_MESSAGE_CONTENT" as const;
export const EVENT_TEXT_MSG_END = "TEXT_MESSAGE_END" as const;
export const EVENT_TOOL_CALL_START = "TOOL_CALL_START" as const;
export const EVENT_TOOL_CALL_END = "TOOL_CALL_END" as const;
export const EVENT_SURFACE_UPDATE = "SURFACE_UPDATE" as const;
export const EVENT_USAGE_SUMMARY = "USAGE_SUMMARY" as const;
export const EVENT_BILLING_SETTLEMENT = "BILLING_SETTLEMENT" as const;
export const EVENT_ERROR = "ERROR" as const;
export const EVENT_DONE = "DONE" as const;
