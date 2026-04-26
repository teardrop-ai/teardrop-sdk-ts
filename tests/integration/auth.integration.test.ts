/**
 * Integration tests for AuthModule against a live Teardrop backend.
 *
 * These tests are skipped unless TEARDROP_TEST_URL is set:
 *   TEARDROP_TEST_URL=https://api.staging.teardrop.dev \
 *   TEARDROP_TEST_EMAIL=test@example.com \
 *   TEARDROP_TEST_SECRET=secret \
 *   npx vitest run tests/integration
 */
import { describe, expect, it } from "vitest";
import { TeardropClient } from "../../src/client";
import { AuthenticationError } from "../../src/errors";

const testUrl = process.env.TEARDROP_TEST_URL;
const testEmail = process.env.TEARDROP_TEST_EMAIL ?? "test@example.com";
const testSecret = process.env.TEARDROP_TEST_SECRET ?? "changeme";

describe.skipIf(!testUrl)("Integration — AuthModule", () => {
  function makeClient() {
    return new TeardropClient({ baseUrl: testUrl! });
  }

  it("siweNonce() returns a non-empty nonce without authentication", async () => {
    const client = makeClient();
    const result = await client.auth.siweNonce();
    expect(typeof result.nonce).toBe("string");
    expect(result.nonce.length).toBeGreaterThan(0);
  });

  it("login() with email + secret stores a valid access token", async () => {
    const client = makeClient();
    const result = await client.auth.login({ email: testEmail, secret: testSecret });
    expect(typeof result.access_token).toBe("string");
    expect(result.token_type).toBe("bearer");
    expect(result.expires_in).toBeGreaterThan(0);
  });

  it("me() returns org_name and email after login", async () => {
    const client = makeClient();
    await client.auth.login({ email: testEmail, secret: testSecret });
    const me = await client.auth.me();
    expect(typeof me.org_name).toBe("string");
    expect(me.email).toBe(testEmail);
  });

  it("me() throws AuthenticationError without a token", async () => {
    const client = makeClient();
    await expect(client.auth.me()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("login() with wrong credentials throws AuthenticationError", async () => {
    const client = makeClient();
    await expect(
      client.auth.login({ email: "nobody@nowhere.invalid", secret: "wrong" }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("refresh() with a valid refresh token produces a new access_token", async () => {
    const client = makeClient();
    const first = await client.auth.login({ email: testEmail, secret: testSecret });
    if (!first.refresh_token) {
      // M2M tokens don't issue refresh tokens — skip gracefully
      return;
    }
    const second = await client.auth.refresh(first.refresh_token);
    expect(typeof second.access_token).toBe("string");
    expect(second.access_token).not.toBe(first.access_token);
  });

  it("logout() with a refresh token succeeds without error", async () => {
    const client = makeClient();
    const tokens = await client.auth.login({ email: testEmail, secret: testSecret });
    if (!tokens.refresh_token) return;
    await expect(client.auth.logout(tokens.refresh_token)).resolves.toBeUndefined();
  });
});
