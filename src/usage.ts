import type { HttpTransport } from "./transport";
import type { UsageSummary } from "./types";

export class UsageModule {
  constructor(private readonly http: HttpTransport) {}

  /** Aggregated usage statistics for the current user. */
  async me(params?: { start?: string; end?: string }): Promise<UsageSummary> {
    return this.http.request<UsageSummary>("GET", "/usage/me", {
      params: { start: params?.start, end: params?.end },
    });
  }
}
