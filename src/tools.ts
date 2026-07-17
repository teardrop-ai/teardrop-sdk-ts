import type { HttpTransport } from "./transport";
import type {
  CreateOrgToolRequest,
  OrgToolResponse,
  UpdateOrgToolRequest,
  ToolDeletedResponse,
} from "./types";
import { parseListResponse } from "./utils/parseListResponse";

export class ToolsModule {
  constructor(private readonly http: HttpTransport) {}

  async create(data: CreateOrgToolRequest): Promise<OrgToolResponse> {
    return this.http.request<OrgToolResponse>("POST", "/tools", { body: data });
  }

  async list(params?: { active_only?: boolean }): Promise<OrgToolResponse[]> {
    const data = await this.http.request<unknown>("GET", "/tools", {
      params: { active_only: params?.active_only },
    });
    return parseListResponse<OrgToolResponse>(data).items;
  }

  async get(id: string): Promise<OrgToolResponse> {
    return this.http.request<OrgToolResponse>("GET", `/tools/${encodeURIComponent(id)}`);
  }

  async update(id: string, data: UpdateOrgToolRequest): Promise<OrgToolResponse> {
    return this.http.request<OrgToolResponse>("PATCH", `/tools/${encodeURIComponent(id)}`, {
      body: data,
    });
  }

  async delete(id: string): Promise<ToolDeletedResponse> {
    return this.http.request<ToolDeletedResponse>("DELETE", `/tools/${encodeURIComponent(id)}`);
  }
}
