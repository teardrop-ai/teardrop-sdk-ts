import { expect } from "vitest";
import { TeardropClient } from "../../src/client";
import { NotFoundError } from "../../src/errors";

export const testUrl = process.env.TEARDROP_TEST_URL;
export const testEmail = process.env.TEARDROP_TEST_EMAIL ?? "test@example.com";
export const testSecret = process.env.TEARDROP_TEST_SECRET ?? "changeme";

export function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeClient(): TeardropClient {
  if (!testUrl) {
    throw new Error("TEARDROP_TEST_URL is required for integration tests");
  }
  return new TeardropClient({ baseUrl: testUrl });
}

export async function makeAuthedClient(): Promise<TeardropClient> {
  const client = makeClient();
  await client.auth.login({ email: testEmail, secret: testSecret });
  return client;
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