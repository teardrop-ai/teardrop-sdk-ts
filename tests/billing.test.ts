/**
 * Tests for BillingModule — list endpoints using parseListResponse.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingModule } from "../src/billing";
import type { HttpTransport } from "../src/transport";
import type { BillingHistoryEntry, Invoice, CreditHistoryEntry } from "../src/types";

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

describe("BillingModule.history", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let billing: BillingModule;

  beforeEach(() => {
    http = makeMockHttp();
    billing = new BillingModule(http);
  });

  it("accepts bare array", async () => {
    const entries: BillingHistoryEntry[] = [
      {
        run_id: "r1",
        user_id: "u1",
        amount_usdc: 0.01,
        method: "credit",
        status: "settled",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    vi.mocked(http.request).mockResolvedValue(entries);
    const result = await billing.history();
    expect(result).toHaveLength(1);
    expect(result[0].run_id).toBe("r1");
  });
});

describe("BillingModule.pricing", () => {
  it("returns the billing-enabled pricing rule without authentication", async () => {
    const http = makeMockHttp();
    const billing = new BillingModule(http);
    vi.mocked(http.request).mockResolvedValue({
      billing_enabled: true,
      network: "base",
      pricing: {
        id: "pricing-1",
        name: "default",
        run_price_usdc: 50_000,
      },
    });

    const result = await billing.pricing();

    expect(result.billing_enabled).toBe(true);
    expect(result.pricing?.run_price_usdc).toBe(50_000);
    expect(vi.mocked(http.request)).toHaveBeenCalledWith(
      "GET",
      "/billing/pricing",
      { auth: false },
    );
  });
});

describe("BillingModule.invoices", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let billing: BillingModule;

  beforeEach(() => {
    http = makeMockHttp();
    billing = new BillingModule(http);
  });

  it("returns paginated page from envelope", async () => {
    const items: Invoice[] = [
      {
        run_id: "r1",
        tokens_in: 100,
        tokens_out: 50,
        tool_calls: 2,
        total_usdc: 0.001,
        breakdown: [{ item: "llm", amount_usdc: 0.001 }],
        settled_at: "2026-01-01T00:00:00Z",
      },
    ];
    vi.mocked(http.request).mockResolvedValue({
      items,
      next_cursor: "page-2",
    });
    const result = await billing.invoices({ limit: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.next_cursor).toBe("page-2");
  });

  it("passes cursor param", async () => {
    vi.mocked(http.request).mockResolvedValue({ items: [], next_cursor: null });
    await billing.invoices({ cursor: "page-2" });
    const [, , opts] = vi.mocked(http.request).mock.calls[0];
    expect(
      (opts as { params: Record<string, unknown> }).params.cursor,
    ).toBe("page-2");
  });
});

describe("BillingModule.creditHistory", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let billing: BillingModule;

  beforeEach(() => {
    http = makeMockHttp();
    billing = new BillingModule(http);
  });

  it("returns paginated page from envelope", async () => {
    const items: CreditHistoryEntry[] = [
      {
        id: "ch-1",
        amount_usdc: 10,
        operation: "topup",
        balance_usdc_after: 100,
        reason: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    vi.mocked(http.request).mockResolvedValue({
      items,
      next_cursor: null,
    });
    const result = await billing.creditHistory({ operation: "topup" });
    expect(result.items).toHaveLength(1);
    expect(result.next_cursor).toBeNull();
  });
});