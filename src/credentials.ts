import type { HttpTransport } from "./transport";
import type {
  OrgCredentialDisableResponse,
  OrgCredentialItem,
  OrgCredentialRegenerateResponse,
} from "./types";
import { parseListResponse } from "./utils/parseListResponse";

export class CredentialsModule {
  constructor(private readonly http: HttpTransport) {}

  /** List org's M2M client credentials (client_id + created_at only; secrets never returned). */
  async list(): Promise<OrgCredentialItem[]> {
    const data = await this.http.request<unknown>(
      "GET",
      "/org/credentials",
    );
    return parseListResponse<OrgCredentialItem>(data).items;
  }

  /** Disable an org M2M credential without revealing its secret. */
  async disable(clientId: string): Promise<OrgCredentialDisableResponse> {
    return this.http.request<OrgCredentialDisableResponse>(
      "POST",
      `/org/credentials/${encodeURIComponent(clientId)}/disable`,
    );
  }

  /**
   * Atomically rotate org M2M credentials: deletes all existing credentials
   * and issues a new client_id / client_secret pair.
   *
   * **The client_secret is returned exactly once — store it immediately.**
   */
  async regenerate(
    scope?: "read" | "publish" | "withdraw",
  ): Promise<OrgCredentialRegenerateResponse> {
    if (scope === undefined) {
      return this.http.request<OrgCredentialRegenerateResponse>(
        "POST",
        "/org/credentials/regenerate",
      );
    }
    return this.http.request<OrgCredentialRegenerateResponse>(
      "POST",
      "/org/credentials/regenerate",
      { params: { scope } },
    );
  }
}
