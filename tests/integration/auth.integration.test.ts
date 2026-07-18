/**
 * Integration tests for AuthModule against a live Teardrop backend.
 *
 * These tests are skipped unless TEARDROP_TEST_URL is set:
 *   TEARDROP_TEST_URL=https://api.staging.teardrop.dev \
 *   TEARDROP_TEST_EMAIL=test@example.com \
 *   TEARDROP_TEST_SECRET=secret \
 *   npx vitest run tests/integration
 */
import { beforeAll, describe, expect, it } from "vitest";
import { AuthenticationError } from "../../src/errors";
import type { TokenResponse } from "../../src/types";
import { makeClient, testEmail, testSecret, testUrl } from "./helpers";

describe.skipIf(!testUrl)("Integration — AuthModule", () => {
  let loginTokens: TokenResponse;
  let refreshedTokens: TokenResponse;

  beforeAll(async () => {
    const client = makeClient();
    loginTokens = await client.auth.login({
      email: testEmail,
      secret: testSecret,
    });
    if (!loginTokens.refresh_token) {
      throw new Error("email login did not return a refresh token");
    }
    refreshedTokens = await client.auth.refresh(loginTokens.refresh_token);
  });

  it("siweNonce() returns a non-empty nonce without authentication", async () => {
    const client = makeClient();
    const result = await client.auth.siweNonce();
    expect(typeof result.nonce).toBe("string");
    expect(result.nonce.length).toBeGreaterThan(0);
  });

  it("login() with email + secret stores a valid access token", async () => {
    expect(typeof loginTokens.access_token).toBe("string");
    expect(loginTokens.token_type).toBe("bearer");
    expect(loginTokens.expires_in).toBeGreaterThan(0);
  });

  it("me() returns org_name and email after login", async () => {
    const client = makeClient();
    client.setToken(loginTokens.access_token);
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
    expect(typeof refreshedTokens.access_token).toBe("string");
    expect(refreshedTokens.access_token).not.toBe(loginTokens.access_token);
  });

  it("logout() with a refresh token succeeds without error", async () => {
    const client = makeClient();
    client.setToken(refreshedTokens.access_token);
    expect(refreshedTokens.refresh_token).toBeDefined();
    await expect(
      client.auth.logout(refreshedTokens.refresh_token!),
    ).resolves.toBeUndefined();
  });
});
