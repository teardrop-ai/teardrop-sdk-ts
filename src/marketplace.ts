import type { HttpTransport } from "./transport";
import type {
  MarketplaceAuthorConfigResponse,
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
  RunFeedbackRequest,
  RunFeedbackResponse,
  MarketplaceSubscriptionListResponse,
  MarketplaceSubscriptionResponse,
  MarketplaceWithdrawalResponse,
  MarketplaceWithdrawalsListResponse,
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
}
