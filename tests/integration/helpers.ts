import { expect } from "vitest";
import { TeardropClient } from "../../src/client";
import { NotFoundError } from "../../src/errors";

export const testUrl = process.env.TEARDROP_TEST_URL;
export const testEmail = process.env.TEARDROP_TEST_EMAIL ?? "test@example.com";
export const testSecret = process.env.TEARDROP_TEST_SECRET ?? "changeme";
export const testToken = process.env.TEARDROP_TEST_TOKEN;

interface SharedAuthState {
  token?: string;
  inFlight?: Promise<string>;
}

const sharedAuthState = (
  globalThis as typeof globalThis & {
    __teardropIntegrationAuth?: SharedAuthState;
  }
).__teardropIntegrationAuth ??= {};

export interface TestJwtClaims {
  role?: string;
  org_id?: string;
  [key: string]: unknown;
}

export function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeClient(): TeardropClient {
  if (!testUrl) {
    throw new Error("TEARDROP_TEST_URL is required for integration tests");
  }
  return new TeardropClient({ baseUrl: testUrl });
}

export function decodeTestJwt(token: string): TestJwtClaims | undefined {
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    return JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8",
      ),
    ) as TestJwtClaims;
  } catch {
    return undefined;
  }
}

export async function makeAuthedClient(): Promise<TeardropClient> {
  const token = await getSharedAuthToken();
  return new TeardropClient({ baseUrl: testUrl!, token });
}

async function getSharedAuthToken(): Promise<string> {
  if (testToken) return testToken;
  if (process.env.TEARDROP_TEST_TOKEN) {
    return process.env.TEARDROP_TEST_TOKEN;
  }
  if (sharedAuthState.token) return sharedAuthState.token;

  if (!sharedAuthState.inFlight) {
    const acquisition = (async () => {
      const client = makeClient();
      const result = await client.auth.login({
        email: testEmail,
        secret: testSecret,
      });
      return result.access_token;
    })();
    sharedAuthState.inFlight = acquisition
      .then((token) => {
        sharedAuthState.token = token;
        process.env.TEARDROP_TEST_TOKEN = token;
        return token;
      })
      .finally(() => {
        sharedAuthState.inFlight = undefined;
      });
  }

  return sharedAuthState.inFlight!;
}

export async function expectDeleted(
  getter: () => Promise<unknown>,
): Promise<void> {
  await expect(getter()).rejects.toBeInstanceOf(NotFoundError);
}

export async function expectAbsent<T>(
  list: () => Promise<T[]>,
  predicate: (item: T) => boolean,
): Promise<void> {
  expect((await list()).some(predicate)).toBe(false);
}