import type { HttpTransport } from "./transport";
import type { MemoryEntry, StoreMemoryRequest } from "./types";

export class MemoryModule {
  constructor(private readonly http: HttpTransport) {}

  async list(params?: { limit?: number }): Promise<MemoryEntry[]> {
    return this.http.request<MemoryEntry[]>("GET", "/memories", {
      params: { limit: params?.limit },
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
