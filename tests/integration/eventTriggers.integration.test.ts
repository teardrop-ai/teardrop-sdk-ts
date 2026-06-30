/**
 * Integration tests for EventTriggersModule against a live Teardrop backend.
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

describe.skipIf(!testUrl)("Integration — EventTriggersModule", () => {
  async function makeAuthedClient() {
    const client = new TeardropClient({ baseUrl: testUrl! });
    await client.auth.login({ email: testEmail, secret: testSecret });
    return client;
  }

  it("supports management lifecycle and idempotent duplicate dispatch behavior", async () => {
    const client = await makeAuthedClient();
    const suffix = randomSuffix();

    let createdId: string | null = null;

    try {
      const created = await client.eventTriggers.create({
        name: `sdk-int-trigger-${suffix}`,
        prompt: "Audit incoming payment of {{amount}} for user {{userId}}. Full tx: {{event_json}}",
      });
      createdId = created.id;

      expect(typeof created.secret).toBe("string");
      expect(created.secret.length).toBeGreaterThan(0);
      expect(typeof created.trigger_token).toBe("string");
      expect(created.trigger_token.length).toBeGreaterThan(0);

      const listed = await client.eventTriggers.list();
      expect(listed.some((item) => item.id === created.id)).toBe(true);

      const fetched = await client.eventTriggers.get(created.id);
      expect(fetched.id).toBe(created.id);

      const updated = await client.eventTriggers.update(created.id, {
        name: `sdk-int-trigger-updated-${suffix}`,
      });
      expect(updated.id).toBe(created.id);

      const rotated = await client.eventTriggers.rotateSecret(created.id);
      expect(rotated.id).toBe(created.id);
      expect(typeof rotated.secret).toBe("string");
      expect(rotated.secret.length).toBeGreaterThan(0);

      const idempotencyKey = `sdk-int-event-${suffix}`;
      const endpoint = `${testUrl}/agent/events/${encodeURIComponent(created.trigger_token)}`;
      const payload = {
        amount: 125_000,
        userId: `user-${suffix}`,
        txHash: `0x${suffix}`,
      };

      const firstResp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Teardrop-Trigger-Secret": rotated.secret,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      expect(firstResp.status).toBe(202);
      const firstBody = (await firstResp.json()) as {
        run_id: string;
        status: string;
        schedule_id: string;
      };
      expect(firstBody.status).toBe("accepted");
      expect(firstBody.schedule_id).toBe(created.id);

      const secondResp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Teardrop-Trigger-Secret": rotated.secret,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      expect(secondResp.status).toBe(200);
      const secondBody = (await secondResp.json()) as {
        run_id: string;
        status: string;
        schedule_id: string;
      };
      expect(secondBody.status).toBe("duplicate");
      expect(secondBody.schedule_id).toBe(created.id);
      expect(secondBody.run_id).toBe(firstBody.run_id);

      const runs = await client.eventTriggers.runs(created.id, { limit: 5 });
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
          await client.eventTriggers.delete(createdId);
        } catch {
          // Best effort cleanup.
        }
      }
    }
  });
});