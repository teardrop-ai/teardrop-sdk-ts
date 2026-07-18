import { describe, expect, it } from "vitest";
import { makeAuthedClient, makeClient, testUrl } from "./helpers";

describe.skipIf(!testUrl)("Integration — Billing and Usage modules", () => {
  it("returns public billing pricing without authentication", async () => {
    const client = makeClient();
    const pricing = await client.billing.pricing();
    expect(Array.isArray(pricing.tools)).toBe(true);
    expect(typeof pricing.base_cost_usdc).toBe("number");
  });

  it("reads authenticated balances, history, invoices, and usage", async () => {
    const client = await makeAuthedClient();

    const balance = await client.billing.balance();
    expect(typeof balance.balance_usdc).toBe("number");
    expect(typeof balance.is_paused).toBe("boolean");

    const history = await client.billing.history({ limit: 5 });
    expect(Array.isArray(history)).toBe(true);

    const invoices = await client.billing.invoices({ limit: 5 });
    expect(Array.isArray(invoices.items)).toBe(true);
    expect(
      invoices.next_cursor === null || typeof invoices.next_cursor === "string",
    ).toBe(true);

    const creditHistory = await client.billing.creditHistory({ limit: 5 });
    expect(Array.isArray(creditHistory.items)).toBe(true);
    expect(
      creditHistory.next_cursor === null ||
        typeof creditHistory.next_cursor === "string",
    ).toBe(true);

    const usage = await client.usage.me();
    expect(typeof usage.total_runs).toBe("number");
    expect(typeof usage.total_tokens_in).toBe("number");
  });
});