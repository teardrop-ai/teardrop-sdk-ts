import type { HttpTransport } from "./transport";
import type {
  AgentRunRequest,
  AgentTool,
  SseEvent,
  AgentDecisionListResponse,
  ToolExclusionListResponse,
  ToolExclusionActionResponse,
  ToolExclusionRemovedResponse,
} from "./types";
import { parseSseStream } from "./utils/parseSseStream";
import { parseListResponse } from "./utils/parseListResponse";

export interface AgentRunOptions {
  signal?: AbortSignal;
  paymentHeader?: string;
}

export class AgentModule {
  constructor(private readonly http: HttpTransport) {}

  /**
   * Stream an agent run, yielding parsed SSE events.
   *
   * @param request - The run request (message, optional thread_id & context).
   * @param options - Optional signal and payment header.
   */
  async *run(
    request: AgentRunRequest,
    options: AgentRunOptions = {},
  ): AsyncIterableIterator<SseEvent> {
    const { signal, paymentHeader } = options;

    const extraHeaders: Record<string, string> = {};
    if (paymentHeader) {
      extraHeaders["X-Payment"] = paymentHeader;
    }

    const body: Record<string, unknown> = { message: request.message };
    if (request.thread_id) body.thread_id = request.thread_id;
    if (request.context) body.context = request.context;
    if (request.emit_ui !== undefined) body.emit_ui = request.emit_ui;
    if (request.tool_policy) body.tool_policy = request.tool_policy;

    const resp = await this.http.stream("POST", "/agent/run", {
      body,
      signal,
      headers: extraHeaders,
    });

    yield* parseSseStream(resp, signal);
  }

  /**
   * List all tools available to the agent.
   * Returns platform, org, and marketplace tools with their source and access mode.
   */
  async tools(): Promise<AgentTool[]> {
    const data = await this.http.request<unknown>("GET", "/agent/tools");
    return parseListResponse<AgentTool>(data, { container: "tools" }).items;
  }

  /**
   * ListStored decision records for the authenticated org (newest first, cursor-paginated).
   */
  async decisions(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<AgentDecisionListResponse> {
    return this.http.request<AgentDecisionListResponse>("GET", "/agent/decisions", {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
      },
    });
  }

  /**
   * List the authenticated org's persisted tool exclusions.
   */
  async listToolExclusions(): Promise<ToolExclusionListResponse> {
    return this.http.request<ToolExclusionListResponse>("GET", "/agent/tool-exclusions");
  }

  /**
   * Persist a tool exclusion for the authenticated org.
   */
  async excludeTool(toolName: string): Promise<ToolExclusionActionResponse> {
    return this.http.request<ToolExclusionActionResponse>("POST", "/agent/tool-exclusions", {
      body: { tool_name: toolName },
    });
  }

  /**
   * Remove a persisted tool exclusion for the authenticated org.
   */
  async includeTool(toolName: string): Promise<ToolExclusionRemovedResponse> {
    return this.http.request<ToolExclusionRemovedResponse>(
      "DELETE",
      `/agent/tool-exclusions/${encodeURIComponent(toolName)}`,
    );
  }
}
