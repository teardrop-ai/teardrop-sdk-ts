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
import { TeardropClient } from "../../src/client";

const testUrl = process.env.TEARDROP_TEST_URL;
const testEmail = process.env.TEARDROP_TEST_EMAIL ?? "test@example.com";
const testSecret = process.env.TEARDROP_TEST_SECRET ?? "changeme";

describe.skipIf(!testUrl)("Integration — MarketplaceModule", () => {
  function makeClient() {
    return new TeardropClient({ baseUrl: testUrl! });
  }

  async function makeAuthedClient() {
    const client = makeClient();
    await client.auth.login({ email: testEmail, secret: testSecret });
    return client;
  }

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
    expect(Array.isArray(subs)).toBe(true);
  });

  it("balance() returns balance_usdc and pending_usdc numbers", async () => {
    const client = await makeAuthedClient();
    const bal = await client.marketplace.balance();
    expect(typeof bal.balance_usdc).toBe("number");
    expect(typeof bal.pending_usdc).toBe("number");
  });

  it("earnings() returns earnings array and next_cursor", async () => {
    const client = await makeAuthedClient();
    const result = await client.marketplace.earnings({ limit: 5 });
    expect(Array.isArray(result.earnings)).toBe(true);
    expect(
      result.next_cursor === null || typeof result.next_cursor === "string",
    ).toBe(true);
  });
});
