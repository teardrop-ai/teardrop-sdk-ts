import type { HttpTransport } from "./transport";
import type { AddTrustedAgentRequest, TrustedAgent } from "./types";

export class A2AModule {
  constructor(private readonly http: HttpTransport) {}

  /** Add a trusted agent for A2A delegation. */
  async addAgent(data: AddTrustedAgentRequest): Promise<TrustedAgent> {
    return this.http.request<TrustedAgent>("POST", "/a2a/agents", {
      body: data,
    });
  }

  /** List org's trusted agents. */
  async listAgents(): Promise<TrustedAgent[]> {
    return this.http.request<TrustedAgent[]>("GET", "/a2a/agents");
  }

  /** Remove a trusted agent. */
  async removeAgent(agentId: string): Promise<void> {
    await this.http.request<void>(
      "DELETE",
      `/a2a/agents/${encodeURIComponent(agentId)}`,
    );
  }

  /** Delegation event history. */
  async delegations(params?: { limit?: number }): Promise<unknown[]> {
    return this.http.request<unknown[]>("GET", "/a2a/delegations", {
      params: { limit: params?.limit },
    });
  }
}
