// ── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_token?: string;
}

export interface RegisterRequest {
  org_name: string;
  email: string;
  password: string;
  /** Optional attribution source, max 64 chars. */
  acquisition_source?: string;
  captcha_token?: string | null;
}

export interface JwtPayloadBase {
  /** User ID — may be under `sub` or `user_id` depending on token generation. */
  sub?: string;
  user_id?: string;
  org_id: string;
  role: "admin" | "member";
  auth_method: string;
  email?: string;
  iss: string;
  exp: number;
  iat: number;
}

/** Response from GET /auth/me — JWT claims plus org_name resolved from the database. */
export interface MeResponse extends JwtPayloadBase {
  /** Org display name; empty string for config-based client_credentials tokens with no org row. */
  org_name: string;
}

export interface AuthMeResponse {
  user_id: string;
  org_id: string;
  role: string;
  auth_method: string;
  email: string;
  address?: string | null;
  chain_id?: number | null;
  org_name?: string | null;
  /** Present when org_id is set. */
  org_slug?: string | null;
}

/** Request body for POST /token — one of the four grant modes. */
export interface TokenRequest {
  email?: string | null;
  secret?: string | null;
  client_id?: string | null;
  client_secret?: string | null;
  siwe_message?: string | null;
  siwe_signature?: string | null;
  /** `x402` selects payment-first org bootstrap (requires the X-Payment header). */
  grant_type?: "x402" | null;
}

/** Response from POST /token with grant_type=x402 — JWT plus one-time client credential. */
export interface X402BootstrapResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  org_id: string;
  client_id: string;
  /** One-time secret on first bootstrap; omitted when the existing credential is reused. */
  client_secret?: string | null;
}

export interface SiweNonceResponse {
  nonce: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export interface VerifyEmailResponse {
  verified: true;
}

export interface CreateInviteRequest {
  email?: string | null;
  role?: string;
}

export interface CreateInviteResponse {
  expires_at: string;
  invite_url: string | null;
  token: string;
}

export interface JwtPayloadSiwe extends JwtPayloadBase {
  auth_method: "siwe";
  address: string;
  chain_id: number;
}

// ── Agent ────────────────────────────────────────────────────────────────────

export interface ToolPolicy {
  /** Qualified tool names to exclude from this run (e.g. "platform/web_search", "org/my_tool"). */
  exclude_names: string[];
}

export interface AgentRunRequest {
  message: string;
  thread_id?: string;
  context?: Record<string, unknown>;
  /** Controls whether UI surface events are emitted. Default: true. */
  emit_ui?: boolean;
  /** Per-run tool exclusions. */
  tool_policy?: ToolPolicy;
}

export interface AgentTool {
  /** Qualified tool name (e.g. "platform/web_search" or "org/my_tool"). */
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  /** Origin of the tool. */
  source: "platform" | "org" | "marketplace";
  /** How the tool is made available to the agent. */
  access_mode: "included" | "subscribed";
}

export interface AgentDecisionRecord {
  id: string;
  run_id: string;
  outcome: number;
  created_at: string;
  action?: string;
  confidence?: number | null;
  outcome_source?: string;
  reasoning?: string;
  task_class?: string;
  tool_names?: string[];
}

export interface AgentDecisionListResponse {
  items: AgentDecisionRecord[];
  next_cursor?: string | null;
}

export type RunOutcomeRating = -1 | 0 | 1;

export interface RunOutcomeRequest {
  rating: RunOutcomeRating;
}

export interface RunOutcomeResponse {
  status: "recorded";
}

export interface ToolExclusionRequest {
  tool_name: string;
}

export interface ToolExclusionActionResponse {
  status: "added";
  tool_name: string;
}

export interface ToolExclusionListResponse {
  tool_names: string[];
}

export interface ToolExclusionRemovedResponse {
  status: "removed";
  tool_name: string;
}

// ── Envelope responses ────────────────────────────────────────────────────────

/** Response from GET /agent/tools. */
export interface AgentToolsResponse {
  tools: AgentTool[];
}

/**
 * Generic cursor-paginated page returned by list endpoints.
 * Matches the backend pattern in `shared/pagination.py`.
 */
export interface Page<T> {
  items: T[];
  /** Opaque pagination cursor; `null` = last page. */
  next_cursor: string | null;
}

/** Response from GET /billing/invoices (cursor-paginated). */
export type InvoiceListResponse = Page<Invoice>;

/** Response from GET /billing/credit-history (cursor-paginated). */
export type CreditHistoryResponse = Page<CreditHistoryEntry>;

/** Response from GET /marketplace/subscriptions (flat envelope, not paginated). */
export interface SubscriptionsResponse {
  subscriptions: MarketplaceSubscription[];
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
    /** Cache read tokens consumed during the run. */
    cache_read_tokens?: number;
    /** Cache creation tokens consumed during the run. */
    cache_creation_tokens?: number;
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

/**
 * Emitted immediately after each TOOL_CALL_END with structured output.
 * `data` is the parsed tool output object (or plain string for text tools).
 * Consumers that do not need structured output can safely ignore this event.
 */
export interface CustomToolOutputEvent {
  event: "Custom";
  data: {
    name: "TOOL_OUTPUT";
    value: {
      tool_call_id: string;
      tool_name: string;
      data: unknown;
    };
  };
}

export type SseEvent =
  | RunStartedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallEndEvent
  | CustomToolOutputEvent
  | SurfaceUpdateEvent
  | UsageSummaryEvent
  | BillingSettlementEvent
  | RunFinishedEvent
  | ErrorEvent
  | DoneEvent;

// ── Schedules & Event Triggers ─────────────────────────────────────────────

export interface CreateScheduledRunRequest {
  name: string;
  prompt: string;
  interval_seconds: number;
  callback_url?: string | null;
  callback_format?: "json" | "text";
  first_run_at?: string | null;
}

export interface UpdateScheduledRunRequest {
  name?: string | null;
  prompt?: string | null;
  interval_seconds?: number | null;
  enabled?: boolean | null;
  callback_url?: string | null;
  callback_format?: "json" | "text" | null;
}

export interface ScheduledRunItem {
  id: string;
  org_id: string;
  user_id: string;
  name: string;
  prompt: string;
  schedule_kind: string;
  interval_seconds: number;
  enabled: boolean;
  callback_url: string | null;
  callback_format?: "json" | "text";
  next_run_at: string;
  last_run_at: string | null;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledRunListResponse {
  items: ScheduledRunItem[];
}

export interface ScheduleDeletedResponse {
  status: "deleted";
}

export interface ScheduledRunResultItem {
  id: string;
  schedule_id: string;
  org_id: string;
  run_id: string;
  status: string;
  output_text: string | null;
  cost_usdc: number;
  error: string | null;
  created_at: string;
}

export interface ScheduledRunResultsResponse {
  items: ScheduledRunResultItem[];
  next_cursor: string | null;
}

export type ScheduledRun = ScheduledRunItem;
export type ScheduledRunResult = ScheduledRunResultItem;

export interface CreateEventTriggerRequest {
  name: string;
  prompt: string;
  callback_url?: string | null;
}

export interface UpdateEventTriggerRequest {
  name?: string | null;
  prompt?: string | null;
  enabled?: boolean | null;
  callback_url?: string | null;
}

export interface EventTriggerItem {
  id: string;
  org_id: string;
  user_id: string;
  name: string;
  prompt: string;
  schedule_kind: string;
  enabled: boolean;
  callback_url: string | null;
  consecutive_failures: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
  trigger_token: string | null;
  event_path: string | null;
}

export interface EventTriggerCreatedResponse {
  id: string;
  org_id: string;
  user_id: string;
  name: string;
  prompt: string;
  schedule_kind: string;
  enabled: boolean;
  callback_url: string | null;
  consecutive_failures: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
  trigger_token: string | null;
  event_path: string | null;
  secret: string;
}

export interface EventTriggerListResponse {
  items: EventTriggerItem[];
}

export interface EventDispatchResponse {
  run_id: string;
  status: "accepted" | "duplicate";
  schedule_id: string;
  result_path: string;
}

export type EventTrigger = EventTriggerItem;
export type EventTriggerWithSecret = EventTriggerCreatedResponse;
export type EventDispatchAccepted = EventDispatchResponse;

export interface RotateEventTriggerSecretResponse {
  id: string;
  secret: string;
}

export interface EventTaskArtifactPart {
  text: string;
}

export interface EventTaskArtifact {
  artifactId: string;
  name: string;
  parts: EventTaskArtifactPart[];
}

export interface EventTaskStatus {
  state:
    | "TASK_STATE_SUBMITTED"
    | "TASK_STATE_COMPLETED"
    | "TASK_STATE_FAILED"
    | "TASK_STATE_REJECTED";
  timestamp: string;
}

export interface EventTaskResponse {
  id: string;
  contextId: string;
  status: EventTaskStatus;
  artifacts?: EventTaskArtifact[];
  metadata?: Record<string, string>;
}

export interface ScheduleRunNowResponse {
  schedule_id: string;
  status: "queued";
  next_run_at: string;
}

export interface LabelingBindingRequest {
  schedule_id: string;
  definition_key: string;
  definition_version: number;
}

export interface LabelingBindingResponse {
  id: string;
  schedule_id: string;
  definition_key: string;
  definition_version: number;
  status: "created";
}

export interface LabelingDefinitionItem {
  definition_key: string;
  definition_version: number;
  prediction_schema: Record<string, unknown>;
  target_schema: Record<string, unknown>;
  outcome_schema: Record<string, unknown>;
  active: boolean;
  created_at: string;
}

export interface LabelingDefinitionListResponse {
  items: LabelingDefinitionItem[];
}

export interface LabelingOverrideResponse {
  status: "recorded";
}

export interface LabelingPredictionItem {
  id: string;
  source_kind: string;
  source_id: string;
  run_id: string;
  schedule_id: string;
  definition_key: string;
  definition_version: number;
  predictions: Record<string, unknown>;
  payload_sha256: string;
  prediction_at: string;
  status: string;
  parse_error: string;
  created_at: string;
}

export interface LabelingPredictionListResponse {
  items: LabelingPredictionItem[];
}

export interface LabelingResultItem {
  id: string;
  target_id: string;
  scorer_key: string;
  scorer_version: string;
  observation_id: string | null;
  actual: Record<string, unknown> | null;
  label: string;
  score: number | null;
  status: string;
  source: string;
  rationale: string;
  created_at: string;
}

export interface LabelingResultListResponse {
  items: LabelingResultItem[];
}

export interface ScoreResult {
  actual?: Record<string, unknown> | null;
  label: string;
  rationale?: string;
  score?: number | null;
  source?: "automatic" | "external" | "manual";
  status:
    | "correct"
    | "incorrect"
    | "neutral"
    | "inconclusive"
    | "unavailable"
    | "invalid";
}

// ── Org Webhook Tools ────────────────────────────────────────────────────────

export interface OrgToolResponse {
  id: string;
  org_id: string;
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown> | null;
  webhook_url: string | null;
  webhook_method: string;
  mcp_server_id: string | null;
  mcp_tool_name: string | null;
  has_auth: boolean;
  timeout_seconds: number;
  is_active: boolean;
  publish_as_mcp: boolean;
  marketplace_description: string | null;
  base_price_usdc: number | null;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type OrgTool = OrgToolResponse;

export interface ToolDeletedResponse {
  status: "deleted";
}

export interface CreateOrgToolRequest {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  /** Optional JSON Schema Draft7 for response structure (for SDK type inference). */
  output_schema?: Record<string, unknown>;
  webhook_url: string;
  webhook_method?: string;
  auth_header_name?: string;
  auth_header_value?: string;
  timeout_seconds?: number;
  publish_as_mcp?: boolean;
  marketplace_description?: string;
  base_price_usdc?: number;
  tags?: string[];
}

export interface UpdateOrgToolRequest {
  description?: string;
  input_schema?: Record<string, unknown>;
  /** Optional JSON Schema Draft7 for response structure. */
  output_schema?: Record<string, unknown>;
  webhook_url?: string;
  webhook_method?: string;
  auth_header_name?: string;
  auth_header_value?: string;
  timeout_seconds?: number;
  is_active?: boolean;
  publish_as_mcp?: boolean;
  marketplace_description?: string;
  base_price_usdc?: number;
  tags?: string[] | null;
}

export interface TestWebhookRequest {
  webhook_url: string;
  webhook_method?: "GET" | "POST" | "PUT";
  auth_header_name?: string | null;
  auth_header_value?: string | null;
  payload?: Record<string, unknown>;
  timeout_seconds?: number;
}

export interface TestWebhookResponse {
  success: boolean;
  status_code: number | null;
  latency_ms: number;
  response_body: Record<string, unknown> | null;
  error: string | null;
}

export type HealthResponse = Record<string, unknown>;

// ── MCP Servers ──────────────────────────────────────────────────────────────

export type McpServerAuthType = "none" | "bearer" | "header";

export interface McpServerResponse {
  id: string;
  org_id: string;
  name: string;
  url: string;
  auth_type: string;
  has_auth: boolean;
  auth_header_name: string | null;
  is_active: boolean;
  timeout_seconds: number;
  created_at: string;
  updated_at: string;
  schema_hash?: string | null;
  last_schema_changed_at?: string | null;
}

export interface TestMcpToolRequest {
  tool_name: string;
  args?: Record<string, unknown>;
}

export interface TestMcpToolResponse {
  success: boolean;
  latency_ms: number;
  result: Record<string, unknown> | null;
  error: string | null;
}

export type OrgMcpServer = McpServerResponse;

export interface McpServerDeletedResponse {
  status: "deleted";
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

export interface McpDiscoverResponse {
  server_id: string;
  schema_changed: boolean;
  tools: Record<string, unknown>[];
}

export type DiscoverMcpToolsResponse = McpDiscoverResponse;

// ── Memory ───────────────────────────────────────────────────────────────────

export interface MemoryListItem {
  id: string;
  content: string;
  source_run_id: string | null;
  created_at: string;
}

export interface MemoryCreatedResponse {
  id: string;
  content: string;
  created_at: string;
}

export interface MemoryDeletedResponse {
  status: "deleted";
}

export interface StoreMemoryRequest {
  content: string;
}

export interface MemoryListResponse {
  items: MemoryListItem[];
  next_cursor: string | null;
  total: number;
}

/** @deprecated Use MemoryListItem instead. */
export interface MemoryEntry {
  id: string;
  content: string;
  source_run_id?: string;
  created_at: string;
}

// ── Wallets ──────────────────────────────────────────────────────────────────

export interface WalletItem {
  id: string;
  address: string;
  chain_id: number;
  is_primary: boolean;
  created_at: string;
}

export type Wallet = WalletItem;

export interface WalletDeletedResponse {
  status: "deleted";
}

export interface LinkWalletRequest {
  siwe_message: string;
  siwe_signature: string;
}

// ── Agent Wallets ────────────────────────────────────────────────────────────

export interface AgentWalletResponse {
  id: string;
  address: string;
  chain_id: number;
  wallet_type: string;
  is_active: boolean;
  balance_usdc?: number | null;
  balance_error?: string | null;
  created_at: string;
}

export type AgentWallet = AgentWalletResponse;

export interface AgentWalletDeactivatedResponse {
  status: "deactivated";
}

// ── Billing ──────────────────────────────────────────────────────────────────

export interface ToolPricing {
  tool_name: string;
  price_usdc: number;
  description: string;
}

export interface PricingRuleWithOverrides {
  id: string;
  name: string;
  run_price_usdc: number;
  created_at?: string;
  effective_from?: string;
  tokens_in_cost_per_1k?: number;
  tokens_out_cost_per_1k?: number;
  tool_call_cost?: number;
  tool_overrides?: Record<string, number>;
}

export interface BillingPricingResponse {
  billing_enabled: boolean;
  network?: string | null;
  pricing?: PricingRuleWithOverrides | null;
}

export interface BillingBalanceResponse {
  org_id: string;
  balance_usdc: number;
  spending_limit_usdc: number;
  spending_limit_active: boolean;
  is_paused: boolean;
  daily_spend_usdc: number;
}

export type CreditBalance = BillingBalanceResponse;

export interface BillingHistoryItem {
  id: string;
  run_id: string;
  tokens_in: number;
  tokens_out: number;
  tool_calls: number;
  tool_names: string[];
  duration_ms: number;
  cost_usdc: number;
  platform_fee_usdc: number;
  settlement_tx: string;
  settlement_status: string;
  created_at: string;
}

export type BillingHistoryEntry = BillingHistoryItem;

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
  operation: "debit" | "topup";
  balance_usdc_after: number;
  reason: string | null;
  created_at: string;
}

export interface StripeTopupRequest {
  amount_cents: number;
  return_url: string;
}

export interface StripeTopupSessionResponse {
  client_secret: string;
  session_id: string;
}

export type StripeTopupResponse = StripeTopupSessionResponse;

export interface StripeSessionStatusResponse {
  status: string;
  new_balance_fmt?: string | null;
}

export type StripeTopupStatusResponse = StripeSessionStatusResponse;

export interface UsdcTopupRequirementsResponse {
  accepts: Record<string, unknown>[];
  x402Version: number;
}

export type UsdcTopupRequirements = UsdcTopupRequirementsResponse;

export interface UsdcTopupRequest {
  amount_usdc: number;
  payment_header: string;
}

export interface UsdcTopupResponse {
  amount_usdc: number;
  balance_usdc: number;
  status: "credited";
  tx_hash: string;
}

// ── Principal Spend Limits ──────────────────────────────────────────────────

export interface PrincipalSpendLimitRequest {
  daily_limit_usdc: number;
  is_paused?: boolean;
}

export interface PrincipalSpendLimitResponse {
  principal_id: string;
  daily_limit_usdc: number;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
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

export interface MarketplaceToolSummary {
  name: string;
  qualified_name: string;
  tool_name: string;
  display_name: string;
  description: string;
  short_description: string;
  input_schema: Record<string, unknown>;
  cost_usdc: number;
  tool_type: string;
  category: string;
  total_calls: number;
  reputation_score: number;
  success_rate: number;
  unique_caller_count?: number | null;
  health_status: string;
  is_healthy: boolean;
  author: string;
  author_slug: string;
}

export type MarketplaceTool = MarketplaceToolSummary;

/** Per-tool public quality metrics served from `/.well-known/reputation.json`. */
export interface PublicToolReputation {
  qualified_tool_name: string;
  reputation_score: number;
  success_rate: number;
  sample_size: number;
  confidence: number;
  freshness: number;
  average_latency_ms: number;
  unique_caller_count?: number | null;
}

/** Public aggregate quality metrics for active marketplace tools. */
export interface PublicReputationResponse {
  schema_version: string;
  generated_at: string | null;
  methodology_url: string;
  tools: PublicToolReputation[];
}

export interface MarketplaceCatalogResponse {
  tools: MarketplaceToolSummary[];
  next_cursor: string | null;
}

export interface MarketplaceAuthorProfileResponse {
  org_slug: string;
  org_name: string;
  tool_count: number;
  total_calls: number;
  tools: MarketplaceToolSummary[];
  next_cursor?: string | null;
}

export interface MarketplaceCatalogDetailResponse {
  tool: MarketplaceToolSummary;
}

export interface MarketplaceAuthorConfigResponse {
  org_id: string;
  settlement_wallet: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type AuthorConfig = MarketplaceAuthorConfigResponse;

export interface MarketplaceBalanceResponse {
  org_id: string;
  balance_usdc: number;
  pending_usdc?: number;
}

export interface MarketplaceEarningEntry {
  id: string;
  tool_name: string;
  total_cost_usdc: number;
  caller_org_id: string;
  author_share_usdc: number;
  platform_share_usdc: number;
  status: string;
  created_at: string;
}

export type EarningsEntry = MarketplaceEarningEntry;

export interface MarketplaceEarningsResponse {
  earnings: MarketplaceEarningEntry[];
  next_cursor: string | null;
}

export interface MarketplaceEarningsByToolEntry {
  tool_name: string;
  total_calls: number;
  total_amount_usdc: number;
  total_author_share_usdc: number;
  pending_author_share_usdc: number;
  settled_author_share_usdc: number;
  total_platform_share_usdc: number;
}

export interface MarketplaceEarningsByToolResponse {
  tools: MarketplaceEarningsByToolEntry[];
}

export interface MarketplaceImportPreviewRequest {
  server_id: string;
  tool_names?: string[] | null;
}

export interface MarketplaceImportPreviewError {
  remote_tool_name: string;
  status_code: number;
  error: string;
}

export interface ImportPreviewSchemaStatus {
  input: string;
  output: string;
}

export interface ImportPreviewDroppedFeatures {
  input?: string[];
  output?: string[];
}

export interface MarketplaceImportPreviewTool {
  remote_tool_name: string;
  proposed_name: string;
  description: string;
  marketplace_description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  schema_status: ImportPreviewSchemaStatus;
  dropped_schema_features: ImportPreviewDroppedFeatures;
  name_adjusted: boolean;
  name_collision_resolved: boolean;
  quota_exceeded: boolean;
  publishable: boolean;
  suggested_base_price_usdc: number;
  category?: string;
  warnings?: string[];
}

export interface MarketplaceImportPreviewResponse {
  server_id: string;
  slots_remaining: number;
  can_publish: boolean;
  tools: MarketplaceImportPreviewTool[];
  errors: MarketplaceImportPreviewError[];
  blockers?: string[];
}

export type MarketplaceToolCategory =
  | ""
  | "defi"
  | "search"
  | "data"
  | "communication"
  | "utility";

export interface MarketplaceImportPublishToolRequest {
  remote_tool_name: string;
  name: string;
  description: string;
  category?: MarketplaceToolCategory;
  base_price_usdc?: number;
  marketplace_description?: string | null;
  input_schema?: Record<string, unknown> | null;
  output_schema?: Record<string, unknown> | null;
}

export interface MarketplaceImportPublishRequest {
  server_id: string;
  tools: MarketplaceImportPublishToolRequest[];
}

export interface MarketplaceImportPublishedTool {
  id: string;
  name: string;
  org_id: string;
  publish_as_mcp: boolean;
  base_price_usdc: number;
  mcp_server_id?: string | null;
  mcp_tool_name?: string | null;
}

export interface MarketplaceImportPublishCreatedItem {
  remote_tool_name: string;
  tool: MarketplaceImportPublishedTool;
}

export interface MarketplaceImportPublishError {
  remote_tool_name: string;
  name: string;
  status_code: number;
  error: string;
}

export interface MarketplaceImportPublishResponse {
  server_id: string;
  created: MarketplaceImportPublishCreatedItem[];
  errors: MarketplaceImportPublishError[];
}

export interface RunFeedbackRequest {
  run_id: string;
  rating: RunOutcomeRating;
  comment?: string;
}

export interface RunFeedbackResponse {
  id: string;
  run_id: string;
  qualified_tool_name: string;
  rating: RunOutcomeRating;
  created_at: string;
}

// ── Marketplace Agent Directory & Quotes ────────────────────────────────────

/** Register (or update) the org's A2A agent endpoint for marketplace discovery. */
export interface MarketplaceAgentRegistrationRequest {
  agent_url: string;
}

export interface MarketplaceAgentRegistrationResponse {
  org_id: string;
  agent_url: string;
  created_at: string;
  updated_at: string;
}

/** Public summary of a registered marketplace agent. */
export interface MarketplaceAgentSummary {
  org_slug: string;
  org_name: string;
  agent_url: string;
  agent_card_url: string;
  message_endpoint: string;
  catalog_endpoint: string;
  tool_count: number;
  reputation_score?: number | null;
  success_rate?: number | null;
  sample_size?: number | null;
  confidence?: number | null;
  unique_caller_count?: number | null;
  is_stale?: boolean | null;
  last_event_at?: string | null;
}

/** Cursor-paginated public agent directory. */
export interface MarketplaceAgentDirectoryResponse {
  agents: MarketplaceAgentSummary[];
  next_cursor?: string | null;
}

/** Public summary of a marketplace author org. */
export interface MarketplaceAuthorSummary {
  org_slug: string;
  org_name: string;
  tool_count: number;
  total_calls: number;
}

/** Cursor-paginated public author index. */
export interface MarketplaceAuthorIndexResponse {
  authors: MarketplaceAuthorSummary[];
  next_cursor?: string | null;
}

/** Atomic-USDC price quote for a marketplace tool. */
export interface MarketplaceQuoteResponse {
  qualified_name: string;
  price_usdc: number;
  source: "override" | "marketplace";
  /** ISO 8601 advisory expiry matching the active pricing-cache TTL. */
  expires_at: string;
  currency?: "USDC";
}

// ── Admin ───────────────────────────────────────────────────────────────────

export interface CreateOrgRequest {
  name: string;
}

export interface CreateOrgResponse {
  id: string;
  name: string;
}

export interface CreateUserRequest {
  email: string;
  secret: string;
  org_id: string;
  role?: string;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  org_id: string;
  role: string;
}

export interface CreateClientCredentialsRequest {
  org_id: string;
}

export interface CreateClientCredentialsResponse {
  client_id: string;
  client_secret: string;
  org_id: string;
  created_at: string;
}

export interface OrgSpendingConfigResponse {
  org_id: string;
  balance_usdc: number;
  spending_limit_usdc: number;
  is_paused: boolean;
  daily_spend_usdc: number;
}

export interface SpendingConfigUpdate {
  spending_limit_usdc?: number | null;
  is_paused?: boolean | null;
}

export interface ToolPricingOverrideRequest {
  tool_name: string;
  cost_usdc: number;
  description?: string;
}

export interface ToolPricingOverrideResponse {
  tool_name: string;
  cost_usdc: number;
  description: string;
  updated: boolean;
}

export interface ToolPricingDeleteResponse {
  deleted: boolean;
  tool_name: string;
}

export interface TopupRequest {
  org_id: string;
  amount_usdc: number;
}

export interface AdminTopupResponse {
  org_id: string;
  new_balance_usdc: number;
}

export interface AdminCreateA2AAgentRequest {
  org_id: string;
  agent_url: string;
  label?: string | null;
  max_cost_usdc?: number;
  require_x402?: boolean;
  jwt_forward?: boolean;
}

export interface AdminA2AAgentResponse {
  id: string;
  org_id: string;
  agent_url: string;
  max_cost_usdc: number;
  require_x402: boolean;
  jwt_forward: boolean;
  label?: string | null;
}

export interface AdminA2AAgentListItem {
  id: string;
  org_id: string;
  agent_url: string;
  max_cost_usdc: number;
  require_x402: boolean;
  jwt_forward: boolean;
  label?: string | null;
  created_at?: string | null;
}

export interface AdminA2AAgentDeletedResponse {
  deleted: string;
}

export interface PendingSettlementItem {
  id: string;
  usage_event_id: string;
  org_id: string;
  run_id: string;
  billing_method: string;
  amount_usdc: number;
  retry_count: number;
  max_retries: number;
  status: string;
  created_at: string;
  last_error?: string | null;
  next_retry_at?: string | null;
}

export interface PendingSettlementsResponse {
  items: PendingSettlementItem[];
}

export interface SettlementRetryResponse {
  settlement_id: string;
  status: "pending";
}

export interface RevenueSummaryResponse {
  total_settlements: number;
  total_revenue_usdc: number;
}

export interface AdminWithdrawalItem {
  id: string;
  org_id: string;
  amount_usdc: number;
  wallet: string;
  status: string;
  created_at: string;
  settled_at?: string | null;
}

export interface AdminWithdrawalListResponse {
  withdrawals: AdminWithdrawalItem[];
}

export interface AdminWithdrawalActionResponse {
  id: string;
  org_id: string;
  amount_usdc: number;
  status: string;
}

export interface CompleteWithdrawalRequest {
  tx_hash: string;
}

export interface CompleteWithdrawalResponse {
  status: "completed";
  tx_hash: string;
}

export interface WithdrawalResetResponse {
  status: "pending";
  id: string;
}

export interface SettlementBalanceResponse {
  account: string;
  address: string;
  chain_id: number;
  balance_usdc: number;
}

export interface MarketplaceSweepResponse {
  processed: number;
}

export interface SweepStatusItem {
  id: string;
  org_id: string;
  amount_usdc: number;
  status: string;
  sweep_attempt_count: number;
  created_at: string;
  last_sweep_error?: string | null;
  next_sweep_at?: string | null;
}

export interface SweepStatusResponse {
  pending: SweepStatusItem[];
  in_flight: SweepStatusItem[];
  exhausted: SweepStatusItem[];
}

export interface AdminMemoryItem {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  source_run_id?: string | null;
}

export interface AdminMemoryListResponse {
  items: AdminMemoryItem[];
  total: number;
}

export interface AdminMemoryPurgeResponse {
  status: "purged";
  deleted: number;
}

export interface TelemetryCompletenessBySource {
  source: "api" | "schedule" | "trigger" | "a2a";
  total_runs?: number;
  tool_eligible_runs?: number;
  usage_event_coverage?: number;
  decision_coverage?: number;
  outcome_label_coverage?: number;
  tool_event_coverage?: number | null;
}

export interface TelemetryCompletenessResponse {
  window_days: number;
  sources: TelemetryCompletenessBySource[];
}

export interface WithdrawRequest {
  amount_usdc: number;
}

export interface MarketplaceWithdrawalResponse {
  id: string;
  org_id: string;
  amount_usdc: number;
  wallet: string;
  status: string;
  created_at: string;
}

export interface MarketplaceWithdrawalHistoryItem {
  id: string;
  amount_usdc: number;
  wallet: string;
  status: string;
  tx_hash: string | null;
  settled_at: string | null;
  created_at: string;
}

export interface MarketplaceWithdrawalsListResponse {
  withdrawals: MarketplaceWithdrawalHistoryItem[];
  next_cursor: string | null;
}

export interface MarketplaceSubscriptionItem {
  id: string;
  qualified_tool_name: string;
  subscribed_at: string;
}

export interface MarketplaceSubscriptionResponse {
  id: string;
  org_id: string;
  qualified_tool_name: string;
  is_active: boolean;
  subscribed_at: string;
}

export type MarketplaceSubscription = MarketplaceSubscriptionResponse;

export interface MarketplaceSubscriptionListResponse {
  subscriptions: MarketplaceSubscriptionItem[];
}

export interface UnsubscribeResponse {
  status: "unsubscribed";
  subscription_id: string;
}

// ── LLM Config ───────────────────────────────────────────────────────────────

export type ProviderType = "anthropic" | "openai" | "google" | "openrouter";
export type RoutingPreference = "default" | "cost" | "speed" | "quality";

export interface LlmConfigDeletedResponse {
  status: "deleted";
}

export interface LlmConfigResponse {
  org_id: string | null;
  provider: string;
  model: string;
  configured: boolean;
  has_api_key: boolean | null;
  api_base: string | null;
  max_tokens: number | null;
  temperature: number | null;
  timeout_seconds: number | null;
  routing_preference: string | null;
  is_byok: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export type OrgLlmConfig = LlmConfigResponse;

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
  /** Model training data cutoff date (e.g. "2025-10") or "Unknown". */
  knowledge_cutoff?: string;
  /** Human-readable description of training cutoff (e.g. "Training data through October 2025"). */
  training_cutoff_note?: string;
  pricing: ModelPricing;
  benchmarks: ModelRunBenchmarks | null;
}

export interface ModelBenchmarksResponse {
  models: ModelInfo[];
  updated_at: string;
}

// ── A2A Delegation ───────────────────────────────────────────────────────────

export interface OrgCreateA2AAgentRequest {
  agent_url: string;
  label?: string | null;
  max_cost_usdc?: number;
  require_x402?: boolean;
  jwt_forward?: boolean;
}

export interface OrgA2AAgentResponse {
  id: string;
  org_id: string;
  agent_url: string;
  label: string | null;
  max_cost_usdc: number;
  require_x402: boolean;
  jwt_forward: boolean;
}

export interface OrgA2AAgentListItem {
  id: string;
  agent_url: string;
  label: string | null;
  max_cost_usdc: number;
  require_x402: boolean;
  jwt_forward: boolean;
  created_at: string | null;
}

export interface OrgA2AAgentDeletedResponse {
  deleted: string;
}

export interface A2ADelegationEvent {
  id: string;
  run_id: string;
  agent_url: string;
  agent_name: string | null;
  task_status: string;
  task_type: string;
  cost_usdc: number;
  billing_method: string;
  settlement_tx: string | null;
  error: string | null;
  created_at: string | null;
  /** Delivery tracking — present once the delegation enters delivery. */
  delivery_status?: string;
  delivery_error?: string | null;
  /** ISO 8601 timestamp; null while unresolved. */
  delivery_resolved_at?: string | null;
  delivery_settlement_tx?: string | null;
}

/** Admin view of a delegation that may have been delivered despite a failed response. */
export interface PossiblyDeliveredDelegationItem {
  id: string;
  org_id: string;
  run_id: string;
  amount_usdc: number;
  refund_status: string;
  delivery_status: "possibly_delivered";
  agent_name?: string | null;
  agent_url?: string | null;
  billing_method?: string | null;
  created_at?: string | null;
  delivery_error?: string | null;
  delivery_settlement_tx?: string | null;
  delivery_started_at?: string | null;
  settlement_tx?: string | null;
  task_status?: string | null;
  task_type?: string | null;
}

export interface ResolveA2ADelegationRequest {
  org_id: string;
  outcome: "confirmed" | "failed";
  reason?: string;
  settlement_tx?: string | null;
}

export interface ResolveA2ADelegationResponse {
  id: string;
  org_id: string;
  outcome: string;
  refund_status: string;
}

/** @deprecated Use OrgCreateA2AAgentRequest instead. */
export type AddTrustedAgentRequest = OrgCreateA2AAgentRequest;

/** @deprecated Use OrgA2AAgentResponse or OrgA2AAgentListItem instead. */
export interface TrustedAgent {
  id: string;
  org_id?: string;
  agent_url: string;
  label: string | null;
  max_cost_usdc: number;
  require_x402: boolean;
  jwt_forward: boolean;
  created_at?: string;
}

// ── Agent Wallets ────────────────────────────────────────────────────────────

// ── Org Credentials ─────────────────────────────────────────────────────────

export interface OrgCredentialItem {
  client_id: string;
  created_at: string;
}

export interface OrgCredentialRegenerateResponse {
  client_id: string;
  client_secret: string;
  created_at: string;
}

export type OrgCredentialsEntry = OrgCredentialItem;
export type RegenerateCredentialsResponse = OrgCredentialRegenerateResponse;

export interface OrgCredentialsResponse {
  credentials: OrgCredentialsEntry[];
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

// ── Backward-compat aliases ──────────────────────────────────────────────────

/** @deprecated Use `CreditBalance` instead. */
export type BillingBalance = CreditBalance;
/** @deprecated Use `BillingPricingResponse` instead. */
export type PricingInfo = BillingPricingResponse;
/** @deprecated Use `CreateOrgToolRequest` instead. */
export type CreateCustomToolRequest = CreateOrgToolRequest;
/** @deprecated Use `OrgTool` instead. */
export type CustomTool = OrgTool;

// ── SSE event type constants ──────────────────────────────────────────────────

export const EVENT_CUSTOM = "Custom" as const;
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
