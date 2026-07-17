import type { HttpTransport } from "./transport";
import type {
  MarketplaceAuthorConfigResponse,
  MarketplaceBalanceResponse,
  MarketplaceCatalogResponse,
  MarketplaceEarningsResponse,
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
