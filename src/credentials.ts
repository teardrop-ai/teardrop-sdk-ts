import type { HttpTransport } from "./transport";
import type {
  OrgCredentialsEntry,
  OrgCredentialsResponse,
  RegenerateCredentialsResponse,
} from "./types";

export class CredentialsModule {
  constructor(private readonly http: HttpTransport) {}

  /** List org's M2M client credentials (client_id + created_at only; secrets never returned). */
  async list(): Promise<OrgCredentialsEntry[]> {
    const data = await this.http.request<OrgCredentialsResponse>(
      "GET",
      "/org/credentials",
    );
    return data.credentials;
  }

  /**
   * Atomically rotate org M2M credentials: deletes all existing credentials
   * and issues a new client_id / client_secret pair.
   *
   * **The client_secret is returned exactly once — store it immediately.**
   */
  async regenerate(): Promise<RegenerateCredentialsResponse> {
    return this.http.request<RegenerateCredentialsResponse>(
      "POST",
      "/org/credentials/regenerate",
    );
  }
}
