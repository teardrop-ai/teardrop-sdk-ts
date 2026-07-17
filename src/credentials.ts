import type { HttpTransport } from "./transport";
import type {
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

  /**
   * Atomically rotate org M2M credentials: deletes all existing credentials
   * and issues a new client_id / client_secret pair.
   *
   * **The client_secret is returned exactly once — store it immediately.**
   */
  async regenerate(): Promise<OrgCredentialRegenerateResponse> {
    return this.http.request<OrgCredentialRegenerateResponse>(
      "POST",
      "/org/credentials/regenerate",
    );
  }
}
