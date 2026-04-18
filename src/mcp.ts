import type { HttpTransport } from "./transport";
import type {
  CreateMcpServerRequest,
  DiscoverMcpToolsResponse,
  OrgMcpServer,
  UpdateMcpServerRequest,
} from "./types";

export class McpModule {
  constructor(private readonly http: HttpTransport) {}

  async create(data: CreateMcpServerRequest): Promise<OrgMcpServer> {
    return this.http.request<OrgMcpServer>("POST", "/mcp/servers", { body: data });
  }

  async list(): Promise<OrgMcpServer[]> {
    return this.http.request<OrgMcpServer[]>("GET", "/mcp/servers");
  }

  async get(id: string): Promise<OrgMcpServer> {
    return this.http.request<OrgMcpServer>(
      "GET",
      `/mcp/servers/${encodeURIComponent(id)}`,
    );
  }

  async update(id: string, data: UpdateMcpServerRequest): Promise<OrgMcpServer> {
    return this.http.request<OrgMcpServer>(
      "PATCH",
      `/mcp/servers/${encodeURIComponent(id)}`,
      { body: data },
    );
  }

  async delete(id: string): Promise<void> {
    await this.http.request<void>(
      "DELETE",
      `/mcp/servers/${encodeURIComponent(id)}`,
    );
  }

  /** Live-probe the MCP server to discover its tools. Bypasses cache. */
  async discover(id: string): Promise<DiscoverMcpToolsResponse> {
    return this.http.request<DiscoverMcpToolsResponse>(
      "POST",
      `/mcp/servers/${encodeURIComponent(id)}/discover`,
    );
  }
}
