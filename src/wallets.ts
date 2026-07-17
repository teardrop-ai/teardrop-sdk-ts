import type { HttpTransport } from "./transport";
import type {
  LinkWalletRequest,
  WalletItem,
  WalletDeletedResponse,
} from "./types";
import { parseListResponse } from "./utils/parseListResponse";

export class WalletsModule {
  constructor(private readonly http: HttpTransport) {}

  /** Link a wallet via SIWE proof. */
  async link(data: LinkWalletRequest): Promise<WalletItem> {
    return this.http.request<WalletItem>("POST", "/wallets/link", { body: data });
  }

  /** List all wallets linked to the current user. */
  async list(): Promise<WalletItem[]> {
    const data = await this.http.request<unknown>("GET", "/wallets/me");
    return parseListResponse<WalletItem>(data).items;
  }

  /** Unlink a wallet. */
  async delete(walletId: string): Promise<WalletDeletedResponse> {
    return this.http.request<WalletDeletedResponse>(
      "DELETE",
      `/wallets/${encodeURIComponent(walletId)}`,
    );
  }
}
