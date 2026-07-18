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
import { TeardropApiError } from "../../src/errors";
import {
  expectDeleted,
  makeAuthedClient as createAuthedClient,
  randomSuffix,
  testUrl,
} from "./helpers";

describe.skipIf(!testUrl)("Integration — EventTriggersModule", () => {
  async function makeAuthedClient() {
    return createAuthedClient();
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
      const triggerToken = created.trigger_token;

      expect(typeof created.secret).toBe("string");
      expect(created.secret.length).toBeGreaterThan(0);
      expect(typeof triggerToken).toBe("string");
      if (typeof triggerToken !== "string") {
        throw new Error("event trigger did not return a trigger token");
      }
      expect(triggerToken.length).toBeGreaterThan(0);

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
      const payload = {
        amount: 125_000,
        userId: `user-${suffix}`,
        txHash: `0x${suffix}`,
      };

      const firstBody = await client.eventTriggers.fire(
        triggerToken,
        payload,
        {
          secret: rotated.secret,
          idempotencyKey,
        },
      );
      expect(firstBody.status).toBe("accepted");
      expect(firstBody.schedule_id).toBe(created.id);

      const secondBody = await client.eventTriggers.fire(
        triggerToken,
        payload,
        {
          secret: rotated.secret,
          idempotencyKey,
        },
      );
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
        } catch (err) {
          if (!(err instanceof TeardropApiError && err.status === 404)) {
            throw err;
          }
        }
        await expectDeleted(() => client.eventTriggers.get(createdId!));
      }
    }
  });
});