import type { HttpTransport } from "./transport";
import type {
  AgentWalletResponse,
  AgentWalletDeactivatedResponse,
} from "./types";

export class AgentWalletsModule {
  constructor(private readonly http: HttpTransport) {}

  /** Provision a CDP agent wallet for the org. */
  async provision(): Promise<AgentWalletResponse> {
    return this.http.request<AgentWalletResponse>("POST", "/wallets/agent");
  }

  /** Get org agent wallet. */
  async get(params?: { includeBalance?: boolean }): Promise<AgentWalletResponse> {
    return this.http.request<AgentWalletResponse>("GET", "/wallets/agent", {
      params: params?.includeBalance ? { include_balance: "true" } : undefined,
    });
  }

  /** Deactivate agent wallet (admin only). */
  async deactivate(): Promise<AgentWalletDeactivatedResponse> {
    return this.http.request<AgentWalletDeactivatedResponse>("DELETE", "/wallets/agent");
  }
}
