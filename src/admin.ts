import type { HttpTransport } from "./transport";
import type {
  AdminA2AAgentDeletedResponse,
  AdminA2AAgentListItem,
  AdminA2AAgentResponse,
  AdminCreateA2AAgentRequest,
  AdminMemoryListResponse,
  AdminMemoryPurgeResponse,
  AdminTopupResponse,
  AdminWithdrawalActionResponse,
  AdminWithdrawalListResponse,
  CompleteWithdrawalRequest,
  CompleteWithdrawalResponse,
  CreateClientCredentialsRequest,
  CreateClientCredentialsResponse,
  CreateOrgRequest,
  CreateOrgResponse,
  CreateUserRequest,
  CreateUserResponse,
  OrgSpendingConfigResponse,
  OrgToolResponse,
  MarketplaceSweepResponse,
  PendingSettlementsResponse,
  RevenueSummaryResponse,
  SettlementBalanceResponse,
  SettlementRetryResponse,
  SpendingConfigUpdate,
  SweepStatusResponse,
  ToolPricingDeleteResponse,
  ToolPricingOverrideRequest,
  ToolPricingOverrideResponse,
  TopupRequest,
  UsageSummary,
  WithdrawalResetResponse,
  McpServerResponse,
} from "./types";

/** Administrative API operations using the same bearer-authenticated transport. */
export class AdminModule {
  constructor(private readonly http: HttpTransport) {}

  async createOrg(data: CreateOrgRequest): Promise<CreateOrgResponse> {
    return this.http.request<CreateOrgResponse>("POST", "/admin/orgs", {
      body: data,
    });
  }

  async getOrgSpending(orgId: string): Promise<OrgSpendingConfigResponse> {
    return this.http.request<OrgSpendingConfigResponse>(
      "GET",
      `/admin/orgs/${encodeURIComponent(orgId)}/spending`,
    );
  }

  async updateOrgSpending(
    orgId: string,
    data: SpendingConfigUpdate,
  ): Promise<OrgSpendingConfigResponse> {
    return this.http.request<OrgSpendingConfigResponse>(
      "PATCH",
      `/admin/orgs/${encodeURIComponent(orgId)}/spending`,
      { body: data },
    );
  }

  async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
    return this.http.request<CreateUserResponse>("POST", "/admin/users", {
      body: data,
    });
  }

  async getOrgUsage(
    orgId: string,
    params?: { start?: string; end?: string },
  ): Promise<UsageSummary> {
    return this.http.request<UsageSummary>(
      "GET",
      `/admin/usage/org/${encodeURIComponent(orgId)}`,
      { params: { start: params?.start, end: params?.end } },
    );
  }

  async getUserUsage(
    userId: string,
    params?: { start?: string; end?: string },
  ): Promise<UsageSummary> {
    return this.http.request<UsageSummary>(
      "GET",
      `/admin/usage/${encodeURIComponent(userId)}`,
      { params: { start: params?.start, end: params?.end } },
    );
  }

  async upsertToolPricing(
    data: ToolPricingOverrideRequest,
  ): Promise<ToolPricingOverrideResponse> {
    return this.http.request<ToolPricingOverrideResponse>(
      "POST",
      "/admin/pricing/tools",
      { body: data },
    );
  }

  async deleteToolPricing(toolName: string): Promise<ToolPricingDeleteResponse> {
    return this.http.request<ToolPricingDeleteResponse>(
      "DELETE",
      `/admin/pricing/tools/${encodeURIComponent(toolName)}`,
    );
  }

  async listOrgTools(orgId: string): Promise<OrgToolResponse[]> {
    return this.http.request<OrgToolResponse[]>(
      "GET",
      `/admin/tools/${encodeURIComponent(orgId)}`,
    );
  }

  async createClientCredentials(
    data: CreateClientCredentialsRequest,
  ): Promise<CreateClientCredentialsResponse> {
    return this.http.request<CreateClientCredentialsResponse>(
      "POST",
      "/admin/client-credentials",
      { body: data },
    );
  }

  async topUpCredits(data: TopupRequest): Promise<AdminTopupResponse> {
    return this.http.request<AdminTopupResponse>(
      "POST",
      "/admin/credits/topup",
      { body: data },
    );
  }

  async addA2AAgent(
    data: AdminCreateA2AAgentRequest,
  ): Promise<AdminA2AAgentResponse> {
    return this.http.request<AdminA2AAgentResponse>(
      "POST",
      "/admin/a2a/agents",
      { body: data },
    );
  }

  async deleteA2AAgent(agentId: string): Promise<AdminA2AAgentDeletedResponse> {
    return this.http.request<AdminA2AAgentDeletedResponse>(
      "DELETE",
      `/admin/a2a/agents/${encodeURIComponent(agentId)}`,
    );
  }

  async listA2AAgents(orgId: string): Promise<AdminA2AAgentListItem[]> {
    return this.http.request<AdminA2AAgentListItem[]>(
      "GET",
      `/admin/a2a/agents/${encodeURIComponent(orgId)}`,
    );
  }

  async listPendingSettlements(params?: {
    status?: string;
    limit?: number;
  }): Promise<PendingSettlementsResponse> {
    return this.http.request<PendingSettlementsResponse>(
      "GET",
      "/admin/billing/pending",
      { params: { status: params?.status, limit: params?.limit } },
    );
  }

  async retrySettlement(settlementId: string): Promise<SettlementRetryResponse> {
    return this.http.request<SettlementRetryResponse>(
      "POST",
      `/admin/billing/pending/${encodeURIComponent(settlementId)}/retry`,
    );
  }

  async getRevenue(params?: {
    start?: string;
    end?: string;
  }): Promise<RevenueSummaryResponse> {
    return this.http.request<RevenueSummaryResponse>(
      "GET",
      "/admin/billing/revenue",
      { params: { start: params?.start, end: params?.end } },
    );
  }

  async completeWithdrawal(
    withdrawalId: string,
    data: CompleteWithdrawalRequest,
  ): Promise<CompleteWithdrawalResponse> {
    return this.http.request<CompleteWithdrawalResponse>(
      "POST",
      `/admin/marketplace/complete-withdrawal/${encodeURIComponent(withdrawalId)}`,
      { body: data },
    );
  }

  async processWithdrawal(
    withdrawalId: string,
  ): Promise<AdminWithdrawalActionResponse> {
    return this.http.request<AdminWithdrawalActionResponse>(
      "POST",
      `/admin/marketplace/process-withdrawal/${encodeURIComponent(withdrawalId)}`,
    );
  }

  async resetWithdrawal(withdrawalId: string): Promise<WithdrawalResetResponse> {
    return this.http.request<WithdrawalResetResponse>(
      "POST",
      `/admin/marketplace/reset-withdrawal/${encodeURIComponent(withdrawalId)}`,
    );
  }

  async getSettlementBalance(): Promise<SettlementBalanceResponse> {
    return this.http.request<SettlementBalanceResponse>(
      "GET",
      "/admin/marketplace/settlement-balance",
    );
  }

  async sweepMarketplace(): Promise<MarketplaceSweepResponse> {
    return this.http.request<MarketplaceSweepResponse>(
      "POST",
      "/admin/marketplace/sweep",
    );
  }

  async retrySweep(withdrawalId: string): Promise<WithdrawalResetResponse> {
    return this.http.request<WithdrawalResetResponse>(
      "POST",
      `/admin/marketplace/sweep-retry/${encodeURIComponent(withdrawalId)}`,
    );
  }

  async getSweepStatus(): Promise<SweepStatusResponse> {
    return this.http.request<SweepStatusResponse>(
      "GET",
      "/admin/marketplace/sweep-status",
    );
  }

  async listWithdrawals(params?: {
    org_id?: string;
  }): Promise<AdminWithdrawalListResponse> {
    return this.http.request<AdminWithdrawalListResponse>(
      "GET",
      "/admin/marketplace/withdrawals",
      { params: { org_id: params?.org_id } },
    );
  }

  async listOrgMcpServers(orgId: string): Promise<McpServerResponse[]> {
    return this.http.request<McpServerResponse[]>(
      "GET",
      `/admin/mcp/servers/${encodeURIComponent(orgId)}`,
    );
  }

  async listOrgMemories(
    orgId: string,
    params?: { limit?: number },
  ): Promise<AdminMemoryListResponse> {
    return this.http.request<AdminMemoryListResponse>(
      "GET",
      `/admin/memories/org/${encodeURIComponent(orgId)}`,
      { params: { limit: params?.limit } },
    );
  }

  async purgeOrgMemories(orgId: string): Promise<AdminMemoryPurgeResponse> {
    return this.http.request<AdminMemoryPurgeResponse>(
      "DELETE",
      `/admin/memories/org/${encodeURIComponent(orgId)}`,
    );
  }
}