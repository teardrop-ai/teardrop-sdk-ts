import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminModule } from "../src/admin";
import type { HttpTransport } from "../src/transport";

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

describe("AdminModule", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let admin: AdminModule;

  beforeEach(() => {
    http = makeMockHttp();
    admin = new AdminModule(http);
  });

  it("creates an org", async () => {
    vi.mocked(http.request).mockResolvedValue({ id: "org-1", name: "Acme" });
    await admin.createOrg({ name: "Acme" });
    expect(http.request).toHaveBeenCalledWith("POST", "/admin/orgs", {
      body: { name: "Acme" },
    });
  });

  it("gets and updates org spending", async () => {
    vi.mocked(http.request).mockResolvedValue({
      org_id: "org-1",
      balance_usdc: 10,
      spending_limit_usdc: 100,
      is_paused: false,
      daily_spend_usdc: 2,
    });
    await admin.getOrgSpending("org/1");
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/orgs/org%2F1/spending",
    );
    await admin.updateOrgSpending("org/1", { is_paused: true });
    expect(http.request).toHaveBeenCalledWith(
      "PATCH",
      "/admin/orgs/org%2F1/spending",
      { body: { is_paused: true } },
    );
  });

  it("creates a user", async () => {
    const body = {
      email: "user@example.com",
      secret: "password123",
      org_id: "org-1",
      role: "user",
    };
    vi.mocked(http.request).mockResolvedValue({
      id: "user-1",
      ...body,
    });
    await admin.createUser(body);
    expect(http.request).toHaveBeenCalledWith("POST", "/admin/users", {
      body,
    });
  });

  it("gets org and user usage with date filters", async () => {
    vi.mocked(http.request).mockResolvedValue({ total_runs: 2 });
    await admin.getOrgUsage("org-1", { start: "2026-01-01", end: "2026-01-31" });
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/usage/org/org-1",
      { params: { start: "2026-01-01", end: "2026-01-31" } },
    );
    await admin.getUserUsage("user/1");
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/usage/user%2F1",
      { params: { start: undefined, end: undefined } },
    );
  });

  it("upserts and deletes tool pricing", async () => {
    const body = { tool_name: "web_search", cost_usdc: 100, description: "Search" };
    vi.mocked(http.request).mockResolvedValue({
      tool_name: "web_search",
      cost_usdc: 100,
      description: "Search",
      updated: true,
    });
    await admin.upsertToolPricing(body);
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/admin/pricing/tools",
      { body },
    );
    await admin.deleteToolPricing("org/search");
    expect(http.request).toHaveBeenCalledWith(
      "DELETE",
      "/admin/pricing/tools/org%2Fsearch",
    );
  });

  it("lists tools for an org as a bare array", async () => {
    vi.mocked(http.request).mockResolvedValue([]);
    await expect(admin.listOrgTools("org-1")).resolves.toEqual([]);
    expect(http.request).toHaveBeenCalledWith("GET", "/admin/tools/org-1");
  });

  it("creates client credentials", async () => {
    const body = { org_id: "org-1" };
    vi.mocked(http.request).mockResolvedValue({
      client_id: "client-1",
      client_secret: "secret-once",
      org_id: "org-1",
      created_at: "2026-01-01T00:00:00Z",
    });
    await admin.createClientCredentials(body);
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/admin/client-credentials",
      { body },
    );
  });

  it("tops up org credits", async () => {
    const body = { org_id: "org-1", amount_usdc: 1_000_000 };
    vi.mocked(http.request).mockResolvedValue({
      org_id: "org-1",
      new_balance_usdc: 2_000_000,
    });
    await admin.topUpCredits(body);
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/admin/credits/topup",
      { body },
    );
  });

  it("adds, lists, and deletes A2A agents", async () => {
    const body = { org_id: "org-1", agent_url: "https://agent.example.com" };
    vi.mocked(http.request).mockResolvedValue({
      id: "agent-1",
      org_id: "org-1",
      agent_url: body.agent_url,
      max_cost_usdc: 0,
      require_x402: false,
      jwt_forward: false,
    });
    await admin.addA2AAgent(body);
    expect(http.request).toHaveBeenCalledWith("POST", "/admin/a2a/agents", {
      body,
    });
    vi.mocked(http.request).mockResolvedValue([]);
    await admin.listA2AAgents("org/1");
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/a2a/agents/org%2F1",
    );
    await admin.deleteA2AAgent("agent/1");
    expect(http.request).toHaveBeenCalledWith(
      "DELETE",
      "/admin/a2a/agents/agent%2F1",
    );
  });

  it("lists pending settlements, retries one, and gets revenue", async () => {
    vi.mocked(http.request).mockResolvedValue({ items: [] });
    await admin.listPendingSettlements({ status: "pending", limit: 10 });
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/billing/pending",
      { params: { status: "pending", limit: 10 } },
    );
    await admin.retrySettlement("settlement/1");
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/admin/billing/pending/settlement%2F1/retry",
    );
    await admin.getRevenue({ start: "2026-01-01", end: "2026-01-31" });
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/billing/revenue",
      { params: { start: "2026-01-01", end: "2026-01-31" } },
    );
  });

  it("runs marketplace withdrawal and settlement operations", async () => {
    const completeBody = { tx_hash: "0x1234567890" };
    vi.mocked(http.request).mockResolvedValue({ status: "completed" });
    await admin.completeWithdrawal("withdrawal/1", completeBody);
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/admin/marketplace/complete-withdrawal/withdrawal%2F1",
      { body: completeBody },
    );
    await admin.processWithdrawal("withdrawal/1");
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/admin/marketplace/process-withdrawal/withdrawal%2F1",
    );
    await admin.resetWithdrawal("withdrawal/1");
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/admin/marketplace/reset-withdrawal/withdrawal%2F1",
    );
    await admin.getSettlementBalance();
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/marketplace/settlement-balance",
    );
    await admin.sweepMarketplace();
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/admin/marketplace/sweep",
    );
    await admin.retrySweep("withdrawal/1");
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/admin/marketplace/sweep-retry/withdrawal%2F1",
    );
    await admin.getSweepStatus();
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/marketplace/sweep-status",
    );
    await admin.listWithdrawals({ org_id: "org-1" });
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/marketplace/withdrawals",
      { params: { org_id: "org-1" } },
    );
  });

  it("lists org MCP servers and memories, then purges memories", async () => {
    vi.mocked(http.request).mockResolvedValue([]);
    await admin.listOrgMcpServers("org/1");
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/mcp/servers/org%2F1",
    );
    vi.mocked(http.request).mockResolvedValue({ items: [], total: 0 });
    await admin.listOrgMemories("org/1", { limit: 25 });
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/admin/memories/org/org%2F1",
      { params: { limit: 25 } },
    );
    await admin.purgeOrgMemories("org/1");
    expect(http.request).toHaveBeenCalledWith(
      "DELETE",
      "/admin/memories/org/org%2F1",
    );
  });
});