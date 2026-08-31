import type { HttpTransport } from "./transport";
import type {
  OrgCreateA2AAgentRequest,
  OrgA2AAgentResponse,
  OrgA2AAgentListItem,
  OrgA2AAgentDeletedResponse,
  A2ADelegationEvent,
} from "./types";
import { parseListResponse } from "./utils/parseListResponse";

export class A2AModule {
  constructor(private readonly http: HttpTransport) {}

  /** Add a trusted agent for A2A delegation. */
  async addAgent(data: OrgCreateA2AAgentRequest): Promise<OrgA2AAgentResponse> {
    return this.http.request<OrgA2AAgentResponse>("POST", "/a2a/agents", {
      body: data,
    });
  }

  /** List org's trusted agents. */
  async listAgents(): Promise<OrgA2AAgentListItem[]> {
    const data = await this.http.request<unknown>("GET", "/a2a/agents");
    return parseListResponse<OrgA2AAgentListItem>(data).items;
  }

  /** Remove a trusted agent. */
  async removeAgent(agentId: string): Promise<OrgA2AAgentDeletedResponse> {
    return this.http.request<OrgA2AAgentDeletedResponse>(
      "DELETE",
      `/a2a/agents/${encodeURIComponent(agentId)}`,
    );
  }

  /** Delegation event history. */
  async delegations(params?: { limit?: number }): Promise<A2ADelegationEvent[]> {
    return this.http.request<A2ADelegationEvent[]>("GET", "/a2a/delegations", {
      params: { limit: params?.limit },
    });
  }

  /**
   * Poll the status and terminal result of an asynchronous inbound task.
   * The `:` in the path is handled by the transport's URL builder.
   */
  async messageStatus<T = Record<string, unknown>>(
    taskId: string,
  ): Promise<T> {
    return this.http.request<T>(
      "GET",
      `/message:status/${encodeURIComponent(taskId)}`,
    );
  }
}
