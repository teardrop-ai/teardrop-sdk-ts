import type { HttpTransport } from "./transport";
import type { MemoryEntry, MemoryListResponse, StoreMemoryRequest } from "./types";

export class MemoryModule {
  constructor(private readonly http: HttpTransport) {}

  async list(params?: { limit?: number; cursor?: string }): Promise<MemoryListResponse> {
    return this.http.request<MemoryListResponse>("GET", "/memories", {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
      },
    });
  }

  async create(data: StoreMemoryRequest): Promise<MemoryEntry> {
    return this.http.request<MemoryEntry>("POST", "/memories", { body: data });
  }

  async delete(id: string): Promise<void> {
    await this.http.request<void>(
      "DELETE",
      `/memories/${encodeURIComponent(id)}`,
    );
  }
}
