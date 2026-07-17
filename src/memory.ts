import type { HttpTransport } from "./transport";
import type {
  MemoryCreatedResponse,
  MemoryDeletedResponse,
  MemoryListResponse,
  StoreMemoryRequest,
} from "./types";

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

  async create(data: StoreMemoryRequest): Promise<MemoryCreatedResponse> {
    return this.http.request<MemoryCreatedResponse>("POST", "/memories", { body: data });
  }

  async delete(id: string): Promise<MemoryDeletedResponse> {
    return this.http.request<MemoryDeletedResponse>(
      "DELETE",
      `/memories/${encodeURIComponent(id)}`,
    );
  }
}
