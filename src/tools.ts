import type { HttpTransport } from "./transport";
import type { CreateOrgToolRequest, OrgTool, UpdateOrgToolRequest } from "./types";

export class ToolsModule {
  constructor(private readonly http: HttpTransport) {}

  async create(data: CreateOrgToolRequest): Promise<OrgTool> {
    return this.http.request<OrgTool>("POST", "/tools", { body: data });
  }

  async list(): Promise<OrgTool[]> {
    return this.http.request<OrgTool[]>("GET", "/tools");
  }

  async get(id: string): Promise<OrgTool> {
    return this.http.request<OrgTool>("GET", `/tools/${encodeURIComponent(id)}`);
  }

  async update(id: string, data: UpdateOrgToolRequest): Promise<OrgTool> {
    return this.http.request<OrgTool>("PATCH", `/tools/${encodeURIComponent(id)}`, {
      body: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.http.request<void>("DELETE", `/tools/${encodeURIComponent(id)}`);
  }
}
