/**
 * Integration tests for MarketplaceModule against a live Teardrop backend.
 *
 * These tests are skipped unless TEARDROP_TEST_URL is set:
 *   TEARDROP_TEST_URL=https://api.staging.teardrop.dev \
 *   TEARDROP_TEST_EMAIL=test@example.com \
 *   TEARDROP_TEST_SECRET=secret \
 *   npx vitest run tests/integration
 */
import { describe, expect, it } from "vitest";
import type { MarketplaceToolSummary } from "../../src/types";
import { makeAuthedClient, makeClient, testUrl } from "./helpers";

describe.skipIf(!testUrl)("Integration — MarketplaceModule", () => {
  it("catalog() returns tools and next_cursor without authentication", async () => {
    const client = makeClient();
    const result = await client.marketplace.catalog();
    expect(Array.isArray(result.tools)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(result, "next_cursor")).toBe(true);
  });

  it("catalog() tools have required fields: name, author, author_slug, cost_usdc", async () => {
    const client = makeClient();
    const result = await client.marketplace.catalog({ limit: 5 });
    for (const tool of result.tools) {
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.author).toBe("string");
      expect(typeof tool.author_slug).toBe("string");
      expect(typeof tool.cost_usdc).toBe("number");
    }
  });

  it("catalog({ org_slug: 'platform' }) returns only platform tools", async () => {
    const client = makeClient();
    const result = await client.marketplace.catalog({ org_slug: "platform" });
    for (const tool of result.tools) {
      expect(tool.author_slug).toBe("platform");
    }
  });

  it("catalog() with limit=1 returns at most 1 tool", async () => {
    const client = makeClient();
    const result = await client.marketplace.catalog({ limit: 1 });
    expect(result.tools.length).toBeLessThanOrEqual(1);
  });

  it("subscriptions() returns an array after authentication", async () => {
    const client = await makeAuthedClient();
    const subs = await client.marketplace.subscriptions();
    expect(Array.isArray(subs.subscriptions)).toBe(true);
  });

  it("balance() returns an author balance number", async () => {
    const client = await makeAuthedClient();
    const bal = await client.marketplace.balance();
    expect(typeof bal.balance_usdc).toBe("number");
  });

  it("earnings() returns earnings array and next_cursor", async () => {
    const client = await makeAuthedClient();
    const result = await client.marketplace.earnings({ limit: 5 });
    expect(Array.isArray(result.earnings)).toBe(true);
    expect(
      result.next_cursor === null || typeof result.next_cursor === "string",
    ).toBe(true);
  });

  it(
    "subscribes to and unsubscribes from the first healthy community tool",
    async ({ skip }) => {
      const client = await makeAuthedClient();
      let cursor: string | undefined;
      let tool: MarketplaceToolSummary | undefined;
      const seenCursors = new Set<string>();

      do {
        const catalog = await client.marketplace.catalog({
          limit: 100,
          cursor,
        });
        tool = catalog.tools.find(
          (entry) =>
            entry.tool_type === "community" &&
            entry.author_slug !== "platform" &&
            entry.is_healthy,
        );
        if (tool) break;

        const nextCursor = catalog.next_cursor;
        if (!nextCursor || seenCursors.has(nextCursor)) break;
        seenCursors.add(nextCursor);
        cursor = nextCursor;
      } while (cursor);

      if (!tool) {
        skip("No healthy community marketplace tool is currently published");
        return;
      }

      expect(tool.tool_type).toBe("community");
      expect(tool.author_slug).not.toBe("platform");
      expect(tool.is_healthy).toBe(true);

      let subscriptionId: string | undefined;
      try {
        const subscription = await client.marketplace.subscribe(
          tool.qualified_name,
        );
        subscriptionId = subscription.id;
        expect(subscription.qualified_tool_name).toBe(tool.qualified_name);

        const subscriptions = await client.marketplace.subscriptions();
        expect(
          subscriptions.subscriptions.some(
            (entry) => entry.id === subscription.id,
          ),
        ).toBe(true);
      } finally {
        if (subscriptionId) {
          const unsubscribed = await client.marketplace.unsubscribe(subscriptionId);
          expect(unsubscribed.subscription_id).toBe(subscriptionId);
        }
      }
    },
  );
});
