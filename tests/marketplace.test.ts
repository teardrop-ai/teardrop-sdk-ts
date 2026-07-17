/**
 * Tests for MarketplaceModule — catalog, subscriptions, publishing, earnings.
 * Mirrors test_marketplace.py.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "../src/errors";
import { MarketplaceModule } from "../src/marketplace";
import type { HttpTransport } from "../src/transport";
import type {
  MarketplaceToolSummary,
  MarketplaceSubscriptionResponse,
  MarketplaceAuthorConfigResponse,
  MarketplaceEarningEntry,
  MarketplaceSubscriptionItem,
} from "../src/types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

const SAMPLE_TOOL: MarketplaceToolSummary = {
  name: "acme/web_search",
  qualified_name: "acme/web_search",
  tool_name: "web_search",
  display_name: "Web Search",
  author: "Acme Corp",
  author_slug: "acme",
  description: "Search the web.",
  short_description: "Search.",
  input_schema: {},
  cost_usdc: 100,
  tool_type: "webhook",
  category: "search",
  total_calls: 10,
  reputation_score: 4.8,
  health_status: "healthy",
  is_healthy: true,
};

const SAMPLE_SUB: MarketplaceSubscriptionResponse = {
  id: "sub-uuid-1",
  org_id: "org-uuid-1",
  qualified_tool_name: "acme/web_search",
  is_active: true,
  subscribed_at: "2025-01-01T00:00:00Z",
};

const SAMPLE_SUB_ITEM: MarketplaceSubscriptionItem = {
  id: "sub-uuid-1",
  qualified_tool_name: "acme/web_search",
  subscribed_at: "2025-01-01T00:00:00Z",
};

const SAMPLE_AUTHOR_CONFIG: MarketplaceAuthorConfigResponse = {
  org_id: "org-uuid-1",
  settlement_wallet: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const SAMPLE_EARNINGS: MarketplaceEarningEntry = {
  id: "earn-1",
  tool_name: "web_search",
  total_cost_usdc: 100,
  caller_org_id: "org-uuid-2",
  author_share_usdc: 90,
  platform_share_usdc: 10,
  status: "settled",
  created_at: "2025-01-01T00:00:00Z",
};

// ── catalog ───────────────────────────────────────────────────────────────────

describe("MarketplaceModule.catalog", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let mp: MarketplaceModule;

  beforeEach(() => {
    http = makeMockHttp();
    mp = new MarketplaceModule(http);
  });

  it("calls GET /marketplace/catalog with auth:false", async () => {
    vi.mocked(http.request).mockResolvedValue({
      tools: [SAMPLE_TOOL],
      next_cursor: null,
    });
    await mp.catalog();
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/marketplace/catalog",
      expect.objectContaining({ auth: false }),
    );
  });

  it("returns tools array and next_cursor", async () => {
    vi.mocked(http.request).mockResolvedValue({
      tools: [SAMPLE_TOOL],
      next_cursor: null,
    });
    const result = await mp.catalog();
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe("acme/web_search");
    expect(result.next_cursor).toBeNull();
  });

  it("forwards org_slug query param", async () => {
    vi.mocked(http.request).mockResolvedValue({ tools: [], next_cursor: null });
    await mp.catalog({ org_slug: "platform" });
    const [, , opts] = vi.mocked(http.request).mock.calls[0];
    expect(
      (opts as { params: Record<string, unknown> }).params.org_slug,
    ).toBe("platform");
  });

  it("forwards sort query param", async () => {
    vi.mocked(http.request).mockResolvedValue({ tools: [], next_cursor: null });
    await mp.catalog({ sort: "price_asc" });
    const [, , opts] = vi.mocked(http.request).mock.calls[0];
    expect(
      (opts as { params: Record<string, unknown> }).params.sort,
    ).toBe("price_asc");
  });

  it("forwards limit and cursor query params", async () => {
    vi.mocked(http.request).mockResolvedValue({
      tools: [],
      next_cursor: "cursor-tok",
    });
    await mp.catalog({ limit: 10, cursor: "prev-cursor" });
    const [, , opts] = vi.mocked(http.request).mock.calls[0];
    const params = (opts as { params: Record<string, unknown> }).params;
    expect(params.limit).toBe(10);
    expect(params.cursor).toBe("prev-cursor");
  });

  it("includes MarketplaceTool fields: author, author_slug", async () => {
    vi.mocked(http.request).mockResolvedValue({
      tools: [SAMPLE_TOOL],
      next_cursor: null,
    });
    const result = await mp.catalog();
    expect(result.tools[0].author).toBe("Acme Corp");
    expect(result.tools[0].author_slug).toBe("acme");
    expect(result.tools[0].cost_usdc).toBe(100);
  });

  it("round-trips tool_type from the wire payload", async () => {
    vi.mocked(http.request).mockResolvedValue({
      tools: [SAMPLE_TOOL],
      next_cursor: null,
    });
    const result = await mp.catalog();
    expect(result.tools[0].tool_type).toBe("webhook");
  });
});

// ── subscribe ──────────────────────────────────────────────────────────────────

describe("MarketplaceModule.subscribe", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let mp: MarketplaceModule;

  beforeEach(() => {
    http = makeMockHttp();
    mp = new MarketplaceModule(http);
  });

  it("calls POST /marketplace/subscriptions with qualified_tool_name in body", async () => {
    vi.mocked(http.request).mockResolvedValue(SAMPLE_SUB);
    await mp.subscribe("acme/web_search");
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/marketplace/subscriptions",
      expect.objectContaining({
        body: { qualified_tool_name: "acme/web_search" },
      }),
    );
  });

  it("returns a MarketplaceSubscription with all fields", async () => {
    vi.mocked(http.request).mockResolvedValue(SAMPLE_SUB);
    const sub = await mp.subscribe("acme/web_search");
    expect(sub.id).toBe("sub-uuid-1");
    expect(sub.qualified_tool_name).toBe("acme/web_search");
    expect(sub.is_active).toBe(true);
  });

  it("propagates NotFoundError when tool doesn't exist", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new NotFoundError("Tool not found"),
    );
    await expect(mp.subscribe("ghost/nonexistent")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

// ── subscriptions ─────────────────────────────────────────────────────────────

describe("MarketplaceModule.subscriptions", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let mp: MarketplaceModule;

  beforeEach(() => {
    http = makeMockHttp();
    mp = new MarketplaceModule(http);
  });

  it("calls GET /marketplace/subscriptions", async () => {
    vi.mocked(http.request).mockResolvedValue({
      subscriptions: [SAMPLE_SUB_ITEM],
    });
    await mp.subscriptions();
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/marketplace/subscriptions",
    );
  });

  it("returns subscription list envelope from GET /marketplace/subscriptions", async () => {
    vi.mocked(http.request).mockResolvedValue({
      subscriptions: [SAMPLE_SUB_ITEM],
    });
    const result = await mp.subscriptions();
    expect(result.subscriptions).toHaveLength(1);
    expect(result.subscriptions[0].id).toBe("sub-uuid-1");
  });
});

// ── unsubscribe ───────────────────────────────────────────────────────────────

describe("MarketplaceModule.unsubscribe", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let mp: MarketplaceModule;

  beforeEach(() => {
    http = makeMockHttp();
    mp = new MarketplaceModule(http);
  });

  it("calls DELETE /marketplace/subscriptions/{id}", async () => {
    vi.mocked(http.request).mockResolvedValue({
      status: "unsubscribed",
      subscription_id: "sub-uuid-1",
    });
    await mp.unsubscribe("sub-uuid-1");
    expect(http.request).toHaveBeenCalledWith(
      "DELETE",
      "/marketplace/subscriptions/sub-uuid-1",
    );
  });

  it("URL-encodes a subscription ID that contains slashes", async () => {
    vi.mocked(http.request).mockResolvedValue({
      status: "unsubscribed",
      subscription_id: "a/b/c",
    });
    await mp.unsubscribe("a/b/c");
    const [, path] = vi.mocked(http.request).mock.calls[0];
    expect(path).toBe("/marketplace/subscriptions/a%2Fb%2Fc");
  });

  it("returns unsubscribe response on success", async () => {
    const mockRep: UnsubscribeResponse = {
      status: "unsubscribed",
      subscription_id: "sub-uuid-1",
    };
    vi.mocked(http.request).mockResolvedValue(mockRep);
    await expect(mp.unsubscribe("sub-uuid-1")).resolves.toEqual(mockRep);
  });
});

// ── setAuthorConfig ───────────────────────────────────────────────────────────

describe("MarketplaceModule.setAuthorConfig", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let mp: MarketplaceModule;

  beforeEach(() => {
    http = makeMockHttp();
    mp = new MarketplaceModule(http);
  });

  it("calls POST /marketplace/author-config with settlement_wallet in body", async () => {
    vi.mocked(http.request).mockResolvedValue(SAMPLE_AUTHOR_CONFIG);
    await mp.setAuthorConfig({
      settlement_wallet: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
    });
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/marketplace/author-config",
      expect.objectContaining({
        body: {
          settlement_wallet: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        },
      }),
    );
  });

  it("returns the AuthorConfig", async () => {
    vi.mocked(http.request).mockResolvedValue(SAMPLE_AUTHOR_CONFIG);
    const config = await mp.setAuthorConfig({
      settlement_wallet: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
    });
    expect(config.settlement_wallet).toBe(
      "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
    );
  });
});

// ── getAuthorConfig ───────────────────────────────────────────────────────────

describe("MarketplaceModule.getAuthorConfig", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let mp: MarketplaceModule;

  beforeEach(() => {
    http = makeMockHttp();
    mp = new MarketplaceModule(http);
  });

  it("calls GET /marketplace/author-config", async () => {
    vi.mocked(http.request).mockResolvedValue(SAMPLE_AUTHOR_CONFIG);
    await mp.getAuthorConfig();
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/marketplace/author-config",
    );
  });

  it("returns the AuthorConfig with settlement_wallet", async () => {
    vi.mocked(http.request).mockResolvedValue(SAMPLE_AUTHOR_CONFIG);
    const config = await mp.getAuthorConfig();
    expect(config.settlement_wallet).toBe(
      "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
    );
  });
});

// ── balance ───────────────────────────────────────────────────────────────────

describe("MarketplaceModule.balance", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let mp: MarketplaceModule;

  beforeEach(() => {
    http = makeMockHttp();
    mp = new MarketplaceModule(http);
  });

  it("calls GET /marketplace/balance", async () => {
    vi.mocked(http.request).mockResolvedValue({
      balance_usdc: 12.5,
      pending_usdc: 1.25,
    });
    await mp.balance();
    expect(http.request).toHaveBeenCalledWith("GET", "/marketplace/balance");
  });

  it("returns balance_usdc and pending_usdc", async () => {
    vi.mocked(http.request).mockResolvedValue({
      balance_usdc: 12.5,
      pending_usdc: 1.25,
    });
    const bal = await mp.balance();
    expect(bal.balance_usdc).toBe(12.5);
    expect(bal.pending_usdc).toBe(1.25);
  });
});

// ── earnings ──────────────────────────────────────────────────────────────────

describe("MarketplaceModule.earnings", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let mp: MarketplaceModule;

  beforeEach(() => {
    http = makeMockHttp();
    mp = new MarketplaceModule(http);
  });

  it("calls GET /marketplace/earnings", async () => {
    vi.mocked(http.request).mockResolvedValue({
      earnings: [SAMPLE_EARNINGS],
      next_cursor: null,
    });
    await mp.earnings();
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/marketplace/earnings",
      expect.any(Object),
    );
  });

  it("returns EarningsEntry[] with total_cost_usdc field", async () => {
    vi.mocked(http.request).mockResolvedValue({
      earnings: [SAMPLE_EARNINGS],
      next_cursor: null,
    });
    const result = await mp.earnings();
    expect(result.earnings[0].total_cost_usdc).toBe(100);
  });

  it("forwards tool_name and cursor as query params", async () => {
    vi.mocked(http.request).mockResolvedValue({
      earnings: [],
      next_cursor: null,
    });
    await mp.earnings({ tool_name: "web_search", cursor: "next-tok" });
    const [, , opts] = vi.mocked(http.request).mock.calls[0];
    const params = (opts as { params: Record<string, unknown> }).params;
    expect(params.tool_name).toBe("web_search");
    expect(params.cursor).toBe("next-tok");
  });
});

// ── withdraw ──────────────────────────────────────────────────────────────────

describe("MarketplaceModule.withdraw", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let mp: MarketplaceModule;

  beforeEach(() => {
    http = makeMockHttp();
    mp = new MarketplaceModule(http);
  });

  it("calls POST /marketplace/withdraw with amount_usdc in body", async () => {
    vi.mocked(http.request).mockResolvedValue({
      id: "wd-1",
      org_id: "org-1",
      amount_usdc: 10.0,
      wallet: "0xABC123",
      status: "pending",
      created_at: "2025-01-01T00:00:00Z",
    });
    await mp.withdraw({ amount_usdc: 10.0 });
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/marketplace/withdraw",
      expect.objectContaining({
        body: { amount_usdc: 10.0 },
      }),
    );
  });

  it("returns withdrawal record with id and status", async () => {
    vi.mocked(http.request).mockResolvedValue({
      id: "wd-1",
      org_id: "org-1",
      amount_usdc: 10.0,
      wallet: "0xABC123",
      status: "pending",
      created_at: "2025-01-01T00:00:00Z",
    });
    const result = await mp.withdraw({ amount_usdc: 10.0 });
    expect(result.id).toBe("wd-1");
    expect(result.status).toBe("pending");
  });
});

// ── withdrawals ───────────────────────────────────────────────────────────────

describe("MarketplaceModule.withdrawals", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let mp: MarketplaceModule;

  beforeEach(() => {
    http = makeMockHttp();
    mp = new MarketplaceModule(http);
  });

  it("calls GET /marketplace/withdrawals", async () => {
    vi.mocked(http.request).mockResolvedValue({
      withdrawals: [],
      next_cursor: null,
    });
    await mp.withdrawals();
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/marketplace/withdrawals",
      expect.any(Object),
    );
  });

  it("returns withdrawals array and next_cursor", async () => {
    vi.mocked(http.request).mockResolvedValue({
      withdrawals: [{ id: "wd-1" }],
      next_cursor: "next-tok",
    });
    const result = await mp.withdrawals();
    expect(Array.isArray(result.withdrawals)).toBe(true);
    expect(result.next_cursor).toBe("next-tok");
  });

  it("forwards cursor as a query param", async () => {
    vi.mocked(http.request).mockResolvedValue({
      withdrawals: [],
      next_cursor: null,
    });
    await mp.withdrawals({ cursor: "page-2" });
    const [, , opts] = vi.mocked(http.request).mock.calls[0];
    expect(
      (opts as { params: Record<string, unknown> }).params.cursor,
    ).toBe("page-2");
  });
});

// ── workflow: subscribe → subscriptions → unsubscribe ─────────────────────────

describe("Marketplace subscription lifecycle workflow", () => {
  it("subscribe then list then unsubscribe succeeds", async () => {
    const http = makeMockHttp();
    const mp = new MarketplaceModule(http);

    vi.mocked(http.request)
      .mockResolvedValueOnce(SAMPLE_SUB)        // subscribe
      .mockResolvedValueOnce({ subscriptions: [SAMPLE_SUB_ITEM] })  // subscriptions
      .mockResolvedValueOnce({ status: "unsubscribed", subscription_id: "sub-uuid-1" });        // unsubscribe

    const sub = await mp.subscribe("acme/web_search");
    expect(sub.id).toBe("sub-uuid-1");

    const result = await mp.subscriptions();
    expect(result.subscriptions).toHaveLength(1);

    await mp.unsubscribe(sub.id);
    expect(http.request).toHaveBeenCalledTimes(3);
  });
});
