import type { HttpTransport } from "./transport";
import type {
  MarketplaceAgentDirectoryResponse,
  MarketplaceAgentRegistrationRequest,
  MarketplaceAgentRegistrationResponse,
  MarketplaceAuthorConfigResponse,
  MarketplaceAuthorIndexResponse,
  MarketplaceAuthorProfileResponse,
  MarketplaceBalanceResponse,
  MarketplaceCatalogResponse,
  MarketplaceCatalogDetailResponse,
  MarketplaceEarningsByToolResponse,
  MarketplaceEarningsResponse,
  MarketplaceImportPreviewRequest,
  MarketplaceImportPreviewResponse,
  MarketplaceImportPublishRequest,
  MarketplaceImportPublishResponse,
  MarketplaceQuoteResponse,
  RunFeedbackRequest,
  RunFeedbackResponse,
  MarketplaceSubscriptionListResponse,
  MarketplaceSubscriptionResponse,
  MarketplaceWithdrawalResponse,
  MarketplaceWithdrawalsListResponse,
  PublicReputationResponse,
  UnsubscribeResponse,
  WithdrawRequest,
} from "./types";

export class MarketplaceModule {
  constructor(private readonly http: HttpTransport) {}

  /** Browse published marketplace tools (no auth required). */
  async catalog(params?: {
    org_slug?: string;
    sort?: "name" | "price_asc" | "price_desc";
    limit?: number;
    cursor?: string;
  }): Promise<MarketplaceCatalogResponse> {
    return this.http.request<MarketplaceCatalogResponse>(
      "GET",
      "/marketplace/catalog",
      {
        params: {
          org_slug: params?.org_slug,
          sort: params?.sort,
          limit: params?.limit,
          cursor: params?.cursor,
        },
        auth: false,
      },
    );
  }

  /** Browse one author's published marketplace tools (no auth required). */
  async getAuthorProfile(
    orgSlug: string,
    params?: { sort?: string; limit?: number; cursor?: string | null },
  ): Promise<MarketplaceAuthorProfileResponse> {
    return this.http.request<MarketplaceAuthorProfileResponse>(
      "GET",
      `/marketplace/authors/${encodeURIComponent(orgSlug)}`,
      {
        params: {
          sort: params?.sort,
          limit: params?.limit,
          cursor: params?.cursor ?? undefined,
        },
        auth: false,
      },
    );
  }

  /** Get one published marketplace tool (no auth required). */
  async getCatalogDetail(
    orgSlug: string,
    toolName: string,
  ): Promise<MarketplaceCatalogDetailResponse> {
    return this.http.request<MarketplaceCatalogDetailResponse>(
      "GET",
      `/marketplace/catalog/${encodeURIComponent(orgSlug)}/${encodeURIComponent(toolName)}`,
      { auth: false },
    );
  }

  /**
   * Fetch public aggregate quality metrics for active marketplace tools
   * from `/.well-known/reputation.json` (no auth required).
   */
  async getPublicReputation(): Promise<PublicReputationResponse> {
    return this.http.request<PublicReputationResponse>(
      "GET",
      "/.well-known/reputation.json",
      { auth: false },
    );
  }

  /** Create or update author payout config. */
  async setAuthorConfig(data: {
    settlement_wallet: string;
  }): Promise<MarketplaceAuthorConfigResponse> {
    return this.http.request<MarketplaceAuthorConfigResponse>(
      "POST",
      "/marketplace/author-config",
      { body: data },
    );
  }

  /** Get author payout config. */
  async getAuthorConfig(): Promise<MarketplaceAuthorConfigResponse> {
    return this.http.request<MarketplaceAuthorConfigResponse>(
      "GET",
      "/marketplace/author-config",
    );
  }

  /** Author earnings balance. */
  async balance(): Promise<MarketplaceBalanceResponse> {
    return this.http.request<MarketplaceBalanceResponse>("GET", "/marketplace/balance");
  }

  /** Earnings history (cursor-paginated). */
  async earnings(params?: {
    limit?: number;
    tool_name?: string;
    cursor?: string;
  }): Promise<MarketplaceEarningsResponse> {
    return this.http.request<MarketplaceEarningsResponse>(
      "GET",
      "/marketplace/earnings",
      {
        params: {
          limit: params?.limit,
          tool_name: params?.tool_name,
          cursor: params?.cursor,
        },
      },
    );
  }

  /** Return aggregate earnings by tool. */
  async earningsByTool(): Promise<MarketplaceEarningsByToolResponse> {
    return this.http.request<MarketplaceEarningsByToolResponse>(
      "GET",
      "/marketplace/earnings/by-tool",
    );
  }

  /** Preview MCP tools before publishing them to the marketplace. */
  async previewImport(
    data: MarketplaceImportPreviewRequest,
  ): Promise<MarketplaceImportPreviewResponse> {
    return this.http.request<MarketplaceImportPreviewResponse>(
      "POST",
      "/marketplace/import/preview",
      { body: data },
    );
  }

  /** Publish selected MCP tools as marketplace-visible tools. */
  async publishImport(
    data: MarketplaceImportPublishRequest,
  ): Promise<MarketplaceImportPublishResponse> {
    return this.http.request<MarketplaceImportPublishResponse>(
      "POST",
      "/marketplace/import/publish",
      { body: data },
    );
  }

  /** Submit a quality rating for a marketplace tool call. */
  async submitToolFeedback(
    orgSlug: string,
    toolName: string,
    data: RunFeedbackRequest,
  ): Promise<RunFeedbackResponse> {
    return this.http.request<RunFeedbackResponse>(
      "POST",
      `/marketplace/tools/${encodeURIComponent(orgSlug)}/${encodeURIComponent(toolName)}/feedback`,
      { body: data },
    );
  }

  /** Request a marketplace earnings payout. */
  async withdraw(
    data: WithdrawRequest,
  ): Promise<MarketplaceWithdrawalResponse> {
    return this.http.request<MarketplaceWithdrawalResponse>("POST", "/marketplace/withdraw", { body: data });
  }

  /** Withdrawal history (cursor-paginated). */
  async withdrawals(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<MarketplaceWithdrawalsListResponse> {
    return this.http.request<MarketplaceWithdrawalsListResponse>(
      "GET",
      "/marketplace/withdrawals",
      { params: { limit: params?.limit, cursor: params?.cursor } },
    );
  }

  /** Subscribe to a marketplace tool by qualified name (org_slug/tool_name). */
  async subscribe(
    qualifiedToolName: string,
  ): Promise<MarketplaceSubscriptionResponse> {
    return this.http.request<MarketplaceSubscriptionResponse>(
      "POST",
      "/marketplace/subscriptions",
      { body: { qualified_tool_name: qualifiedToolName } },
    );
  }

  /** List active subscriptions. */
  async subscriptions(): Promise<MarketplaceSubscriptionListResponse> {
    return this.http.request<MarketplaceSubscriptionListResponse>(
      "GET",
      "/marketplace/subscriptions",
    );
  }

  /** Unsubscribe from a marketplace tool. */
  async unsubscribe(subscriptionId: string): Promise<UnsubscribeResponse> {
    return this.http.request<UnsubscribeResponse>(
      "DELETE",
      `/marketplace/subscriptions/${encodeURIComponent(subscriptionId)}`,
    );
  }

  /** Get the org's marketplace agent registration (publishes your A2A endpoint). */
  async getAgentRegistration(): Promise<MarketplaceAgentRegistrationResponse> {
    return this.http.request<MarketplaceAgentRegistrationResponse>(
      "GET",
      "/marketplace/agent-registration",
    );
  }

  /** Register (or update) the org's A2A agent endpoint for marketplace discovery. */
  async setAgentRegistration(
    data: MarketplaceAgentRegistrationRequest,
  ): Promise<MarketplaceAgentRegistrationResponse> {
    return this.http.request<MarketplaceAgentRegistrationResponse>(
      "PUT",
      "/marketplace/agent-registration",
      { body: data },
    );
  }

  /** Unpublish the org's A2A agent from the marketplace. */
  async deleteAgentRegistration(): Promise<void> {
    await this.http.request<void>("DELETE", "/marketplace/agent-registration");
  }

  /**
   * Browse the public agent directory (no auth required).
   * Cursor-paginated; `sort` is `name` | `reputation`, `stale` is `all` | `active` | `stale`.
   */
  async agents(params?: {
    q?: string | null;
    sort?: "name" | "reputation";
    stale?: "all" | "active" | "stale";
    limit?: number;
    cursor?: string | null;
  }): Promise<MarketplaceAgentDirectoryResponse> {
    return this.http.request<MarketplaceAgentDirectoryResponse>(
      "GET",
      "/marketplace/agents",
      {
        params: {
          q: params?.q ?? undefined,
          sort: params?.sort,
          stale: params?.stale,
          limit: params?.limit,
          cursor: params?.cursor ?? undefined,
        },
        auth: false,
      },
    );
  }

  /** Browse the public author index (no auth required). */
  async authors(params?: {
    q?: string | null;
    limit?: number;
    cursor?: string | null;
  }): Promise<MarketplaceAuthorIndexResponse> {
    return this.http.request<MarketplaceAuthorIndexResponse>(
      "GET",
      "/marketplace/authors",
      {
        params: {
          q: params?.q ?? undefined,
          limit: params?.limit,
          cursor: params?.cursor ?? undefined,
        },
        auth: false,
      },
    );
  }

  /** Fetch an atomic-USDC price quote for a marketplace tool (no auth required). */
  async quote(qualifiedToolName: string): Promise<MarketplaceQuoteResponse> {
    return this.http.request<MarketplaceQuoteResponse>(
      "GET",
      "/marketplace/quote",
      { params: { tool: qualifiedToolName }, auth: false },
    );
  }
}
