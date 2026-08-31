/**
 * Tests for A2AModule — list endpoint using parseListResponse.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { A2AModule } from "../src/a2a";
import type { HttpTransport } from "../src/transport";
import type { A2ADelegationEvent, TrustedAgent } from "../src/types";

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

describe("A2AModule.listAgents", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let a2a: A2AModule;

  beforeEach(() => {
    http = makeMockHttp();
    a2a = new A2AModule(http);
  });

  it("accepts bare array", async () => {
    const items: TrustedAgent[] = [
      {
        id: "ta-1",
        agent_url: "https://agent.example.com",
        label: "My Agent",
        max_cost_usdc: 0.1,
        require_x402: false,
        jwt_forward: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    vi.mocked(http.request).mockResolvedValue(items);
    const result = await a2a.listAgents();
    expect(result).toHaveLength(1);
    expect(result[0].agent_url).toBe("https://agent.example.com");
  });

  it("returns empty array when no trusted agents", async () => {
    vi.mocked(http.request).mockResolvedValue([]);
    const result = await a2a.listAgents();
    expect(result).toEqual([]);
  });
});

describe("A2AModule.delegations", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let a2a: A2AModule;

  beforeEach(() => {
    http = makeMockHttp();
    a2a = new A2AModule(http);
  });

  it("returns delegation history with task type", async () => {
    const items: A2ADelegationEvent[] = [
      {
        id: "delegation-1",
        run_id: "run-1",
        agent_url: "https://agent.example.com",
        agent_name: "Partner Agent",
        task_status: "completed",
        task_type: "research",
        cost_usdc: 0.1,
        billing_method: "x402",
        settlement_tx: null,
        error: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    vi.mocked(http.request).mockResolvedValue(items);

    const result = await a2a.delegations({ limit: 20 });

    expect(result[0].task_type).toBe("research");
    expect(http.request).toHaveBeenCalledWith("GET", "/a2a/delegations", {
      params: { limit: 20 },
    });
  });
});

describe("A2AModule.messageStatus", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let a2a: A2AModule;

  beforeEach(() => {
    http = makeMockHttp();
    a2a = new A2AModule(http);
  });

  it("calls GET /message:status/{task_id} preserving the colon in the path", async () => {
    vi.mocked(http.request).mockResolvedValue({
      status: "completed",
      result: { text: "done" },
    });
    const result = await a2a.messageStatus("task-123");
    expect(result).toEqual({ status: "completed", result: { text: "done" } });
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/message:status/task-123",
    );
  });

  it("URL-encodes a task id containing slashes", async () => {
    vi.mocked(http.request).mockResolvedValue({ status: "pending" });
    await a2a.messageStatus("task/1");
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/message:status/task%2F1",
    );
  });
});