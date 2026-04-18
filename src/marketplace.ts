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
    limit?: number;
  }): Promise<{ tools: MarketplaceTool[] }> {
    return this.http.request<{ tools: MarketplaceTool[] }>(
      "GET",
      "/marketplace/catalog",
      { params: { limit: params?.limit }, auth: false },
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

  /** Earnings history. */
  async earnings(params?: { limit?: number }): Promise<EarningsEntry[]> {
    return this.http.request<EarningsEntry[]>("GET", "/marketplace/earnings", {
      params: { limit: params?.limit },
    });
  }

  /** Request a marketplace earnings payout. */
  async withdraw(
    data: WithdrawRequest,
  ): Promise<{ withdrawal_id: string; amount_usdc: number; status: "pending" }> {
    return this.http.request("POST", "/marketplace/withdraw", { body: data });
  }

  /** Withdrawal history. */
  async withdrawals(params?: { limit?: number }): Promise<unknown[]> {
    return this.http.request<unknown[]>("GET", "/marketplace/withdrawals", {
      params: { limit: params?.limit },
    });
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
