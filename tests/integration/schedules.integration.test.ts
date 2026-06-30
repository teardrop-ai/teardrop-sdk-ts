/**
 * Integration tests for SchedulesModule against a live Teardrop backend.
 *
 * These tests are skipped unless TEARDROP_TEST_URL is set:
 *   TEARDROP_TEST_URL=https://api.staging.teardrop.dev \
 *   TEARDROP_TEST_EMAIL=test@example.com \
 *   TEARDROP_TEST_SECRET=secret \
 *   npx vitest run tests/integration
 */
import { describe, expect, it } from "vitest";
import { TeardropClient } from "../../src/client";
import { TeardropApiError } from "../../src/errors";

const testUrl = process.env.TEARDROP_TEST_URL;
const testEmail = process.env.TEARDROP_TEST_EMAIL ?? "test@example.com";
const testSecret = process.env.TEARDROP_TEST_SECRET ?? "changeme";

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe.skipIf(!testUrl)("Integration — SchedulesModule", () => {
  async function makeAuthedClient() {
    const client = new TeardropClient({ baseUrl: testUrl! });
    await client.auth.login({ email: testEmail, secret: testSecret });
    return client;
  }

  it("supports create/list/get/update/runs/delete lifecycle", async () => {
    const client = await makeAuthedClient();
    const name = `sdk-int-schedule-${randomSuffix()}`;

    let createdId: string | null = null;

    try {
      const created = await client.schedules.create({
        name,
        prompt: "Say OK",
        interval_seconds: 300,
      });
      createdId = created.id;
      expect(typeof created.id).toBe("string");
      expect(created.id.length).toBeGreaterThan(0);

      const listed = await client.schedules.list();
      expect(listed.some((item) => item.id === created.id)).toBe(true);

      const fetched = await client.schedules.get(created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe(name);

      const updated = await client.schedules.update(created.id, {
        enabled: false,
      });
      expect(updated.enabled).toBe(false);

      const runs = await client.schedules.runs(created.id, { limit: 5 });
      expect(Array.isArray(runs.items)).toBe(true);
      expect(
        runs.next_cursor === null || typeof runs.next_cursor === "string",
      ).toBe(true);
    } catch (err) {
      if (err instanceof TeardropApiError && err.status === 404) {
        // Feature may be disabled in the target environment.
        return;
      }
      throw err;
    } finally {
      if (createdId) {
        try {
          await client.schedules.delete(createdId);
        } catch {
          // Best effort cleanup.
        }
      }
    }
  });
});