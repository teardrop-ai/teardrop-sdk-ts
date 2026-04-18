import type { HttpTransport } from "./transport";
import type { LinkWalletRequest, Wallet } from "./types";

export class WalletsModule {
  constructor(private readonly http: HttpTransport) {}

  /** Link a wallet via SIWE proof. */
  async link(data: LinkWalletRequest): Promise<Wallet> {
    return this.http.request<Wallet>("POST", "/wallets/link", { body: data });
  }

  /** List all wallets linked to the current user. */
  async list(): Promise<Wallet[]> {
    return this.http.request<Wallet[]>("GET", "/wallets/me");
  }

  /** Unlink a wallet. */
  async delete(walletId: string): Promise<void> {
    await this.http.request<void>(
      "DELETE",
      `/wallets/${encodeURIComponent(walletId)}`,
    );
  }
}
