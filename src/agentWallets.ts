import type { HttpTransport } from "./transport";
import type { AgentWallet } from "./types";

export class AgentWalletsModule {
  constructor(private readonly http: HttpTransport) {}

  /** Provision a CDP agent wallet for the org. */
  async provision(): Promise<AgentWallet> {
    return this.http.request<AgentWallet>("POST", "/wallets/agent");
  }

  /** Get org agent wallet. */
  async get(params?: { includeBalance?: boolean }): Promise<AgentWallet> {
    return this.http.request<AgentWallet>("GET", "/wallets/agent", {
      params: params?.includeBalance ? { include_balance: "true" } : undefined,
    });
  }

  /** Deactivate agent wallet (admin only). */
  async deactivate(): Promise<void> {
    await this.http.request<void>("DELETE", "/wallets/agent");
  }
}
