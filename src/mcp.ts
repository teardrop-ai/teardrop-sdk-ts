import type { HttpTransport } from "./transport";
import type {
  CreateMcpServerRequest,
  McpDiscoverResponse,
  McpServerResponse,
  UpdateMcpServerRequest,
  McpServerDeletedResponse,
  TestMcpToolRequest,
  TestMcpToolResponse,
} from "./types";
import { parseListResponse } from "./utils/parseListResponse";

export class McpModule {
  constructor(private readonly http: HttpTransport) {}

  async create(data: CreateMcpServerRequest): Promise<McpServerResponse> {
    return this.http.request<McpServerResponse>("POST", "/mcp/servers", { body: data });
  }

  async list(): Promise<McpServerResponse[]> {
    const data = await this.http.request<unknown>("GET", "/mcp/servers");
    return parseListResponse<McpServerResponse>(data).items;
  }

  async get(id: string): Promise<McpServerResponse> {
    return this.http.request<McpServerResponse>(
      "GET",
      `/mcp/servers/${encodeURIComponent(id)}`,
    );
  }

  async update(id: string, data: UpdateMcpServerRequest): Promise<McpServerResponse> {
    return this.http.request<McpServerResponse>(
      "PATCH",
      `/mcp/servers/${encodeURIComponent(id)}`,
      { body: data },
    );
  }

  async delete(id: string): Promise<McpServerDeletedResponse> {
    return this.http.request<McpServerDeletedResponse>(
      "DELETE",
      `/mcp/servers/${encodeURIComponent(id)}`,
    );
  }

  /** Live-probe the MCP server to discover its tools. Bypasses cache. */
  async discover(id: string): Promise<McpDiscoverResponse> {
    return this.http.request<McpDiscoverResponse>(
      "POST",
      `/mcp/servers/${encodeURIComponent(id)}/discover`,
    );
  }

  async testTool(
    id: string,
    data: TestMcpToolRequest,
  ): Promise<TestMcpToolResponse> {
    return this.http.request<TestMcpToolResponse>(
      "POST",
      `/mcp/servers/${encodeURIComponent(id)}/test-tool`,
      { body: data },
    );
  }
}
