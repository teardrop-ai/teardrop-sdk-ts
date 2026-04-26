import type { HttpTransport } from "./transport";
import type {
  AuthorConfig,
  EarningsEntry,
  MarketplaceSubscription,
  MarketplaceTool,
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
  }): Promise<{ tools: MarketplaceTool[]; next_cursor: string | null }> {
    return this.http.request<{ tools: MarketplaceTool[]; next_cursor: string | null }>(
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
  }): Promise<AuthorConfig> {
    return this.http.request<AuthorConfig>(
      "POST",
      "/marketplace/author-config",
      { body: data },
    );
  }

  /** Get author payout config. */
  async getAuthorConfig(): Promise<AuthorConfig> {
    return this.http.request<AuthorConfig>(
      "GET",
      "/marketplace/author-config",
    );
  }

  /** Author earnings balance. */
  async balance(): Promise<{ balance_usdc: number; pending_usdc: number }> {
    return this.http.request("GET", "/marketplace/balance");
  }

  /** Earnings history (cursor-paginated). */
  async earnings(params?: {
    limit?: number;
    tool_name?: string;
    cursor?: string;
  }): Promise<{ earnings: EarningsEntry[]; next_cursor: string | null }> {
    return this.http.request<{ earnings: EarningsEntry[]; next_cursor: string | null }>(
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
  ): Promise<{ id: string; org_id: string; amount_usdc: number; wallet: string; status: string; created_at: string }> {
    return this.http.request("POST", "/marketplace/withdraw", { body: data });
  }

  /** Withdrawal history (cursor-paginated). */
  async withdrawals(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ withdrawals: unknown[]; next_cursor: string | null }> {
    return this.http.request<{ withdrawals: unknown[]; next_cursor: string | null }>(
      "GET",
      "/marketplace/withdrawals",
      { params: { limit: params?.limit, cursor: params?.cursor } },
    );
  }

  /** Subscribe to a marketplace tool by qualified name (org_slug/tool_name). */
  async subscribe(
    qualifiedToolName: string,
  ): Promise<MarketplaceSubscription> {
    return this.http.request<MarketplaceSubscription>(
      "POST",
      "/marketplace/subscriptions",
      { body: { qualified_tool_name: qualifiedToolName } },
    );
  }

  /** List active subscriptions. */
  async subscriptions(): Promise<MarketplaceSubscription[]> {
    return this.http.request<MarketplaceSubscription[]>(
      "GET",
      "/marketplace/subscriptions",
    );
  }

  /** Unsubscribe from a marketplace tool. */
  async unsubscribe(subscriptionId: string): Promise<void> {
    await this.http.request<void>(
      "DELETE",
      `/marketplace/subscriptions/${encodeURIComponent(subscriptionId)}`,
    );
  }
}
