import type { HttpTransport } from "./transport";
import type { ModelBenchmarksResponse } from "./types";

export class ModelsModule {
  constructor(private readonly http: HttpTransport) {}

  /** Public model catalogue with live benchmark metrics (no auth required). */
  async benchmarks(): Promise<ModelBenchmarksResponse> {
    return this.http.request<ModelBenchmarksResponse>(
      "GET",
      "/models/benchmarks",
      { auth: false },
    );
  }

  /** Org-scoped model benchmarks (auth required). */
  async orgBenchmarks(): Promise<ModelBenchmarksResponse> {
    return this.http.request<ModelBenchmarksResponse>(
      "GET",
      "/models/benchmarks/org",
    );
  }
}
