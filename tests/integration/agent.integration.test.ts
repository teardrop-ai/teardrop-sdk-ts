/**
 * Integration tests for AgentModule against a live Teardrop backend.
 *
 * These tests are skipped unless TEARDROP_TEST_URL is set:
 *   TEARDROP_TEST_URL=https://api.staging.teardrop.dev \
 *   TEARDROP_TEST_EMAIL=test@example.com \
 *   TEARDROP_TEST_SECRET=secret \
 *   npx vitest run tests/integration
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  EVENT_DONE,
  EVENT_RUN_STARTED,
  EVENT_TEXT_MSG_CONTENT,
  EVENT_USAGE_SUMMARY,
  type SseEvent,
} from "../../src/types";
import { collectText } from "../../src/utils/parseSseStream";
import {
  makeAuthedClient as createAuthedClient,
  testUrl,
} from "./helpers";

async function collectAll(
  gen: AsyncIterableIterator<SseEvent>,
): Promise<SseEvent[]> {
  const events: SseEvent[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

describe.skipIf(!testUrl)("Integration — AgentModule", () => {
  const runIds = new Set<string>();
  let cleanupClient: Awaited<ReturnType<typeof createAuthedClient>> | undefined;

  async function makeAuthedClient() {
    const client = await createAuthedClient();
    cleanupClient = client;
    return client;
  }

  function trackEvent(event: SseEvent): void {
    if (event.event === EVENT_RUN_STARTED) runIds.add(event.data.run_id);
  }

  async function collectTracked(
    gen: AsyncIterableIterator<SseEvent>,
  ): Promise<SseEvent[]> {
    const events = await collectAll(gen);
    for (const event of events) trackEvent(event);
    return events;
  }

  afterEach(async () => {
    if (cleanupClient) {
      for (const runId of runIds) {
        try {
          await cleanupClient.agent.setOutcome(runId, 0);
        } catch { }
      }
    }
    cleanupClient = undefined;
    runIds.clear();
  });

  it("run('Say OK') yields RUN_STARTED and at least one TEXT_MESSAGE_CONTENT event", async () => {
    const client = await makeAuthedClient();
    const events = await collectTracked(client.agent.run({ message: "Say OK" }));
    const types = events.map((e) => e.event);
    expect(types).toContain(EVENT_RUN_STARTED);
    expect(types).toContain(EVENT_TEXT_MSG_CONTENT);
    expect(types).toContain(EVENT_DONE);
  });

  it("run() stream ends with DONE event", async () => {
    const client = await makeAuthedClient();
    const events = await collectTracked(client.agent.run({ message: "Say OK" }));
    const last = events[events.length - 1];
    expect(last?.event).toBe(EVENT_DONE);
  });

  it("collectText() returns a non-empty string response", async () => {
    const client = await makeAuthedClient();
    const text = await collectText(client.agent.run({ message: "Say exactly: Hello" }));
    expect(text.length).toBeGreaterThan(0);
  });

  it("USAGE_SUMMARY event contains tokens_in > 0 and cost_usdc >= 0", async () => {
    const client = await makeAuthedClient();
    const events = await collectTracked(client.agent.run({ message: "Say OK" }));
    const usage = events.find((e) => e.event === EVENT_USAGE_SUMMARY);
    expect(usage?.event).toBe(EVENT_USAGE_SUMMARY);
    if (usage?.event === EVENT_USAGE_SUMMARY) {
      expect(usage.data.tokens_in).toBeGreaterThan(0);
      expect(usage.data.cost_usdc).toBeGreaterThanOrEqual(0);
    }
  });

  it("thread_id continuity — second run in same thread has thread_id in response", async () => {
    const client = await makeAuthedClient();
    const firstEvents = await collectTracked(
      client.agent.run({ message: "My name is Alice." }),
    );
    const started = firstEvents.find((e) => e.event === EVENT_RUN_STARTED);
    expect(started?.event).toBe(EVENT_RUN_STARTED);
    if (started?.event !== EVENT_RUN_STARTED) {
      throw new Error("run did not emit RUN_STARTED");
    }
    const thread_id = started.data.thread_id;

    const secondEvents = await collectTracked(
      client.agent.run({ message: "What is my name?", thread_id }),
    );
    const started2 = secondEvents.find((e) => e.event === EVENT_RUN_STARTED);
    expect(started2?.event).toBe(EVENT_RUN_STARTED);
    if (started2?.event !== EVENT_RUN_STARTED) {
      throw new Error("second run did not emit RUN_STARTED");
    }
    expect(started2.data.thread_id).toBe(thread_id);
  });

  it("AbortController can cancel a run without throwing uncaught errors", async () => {
    const client = await makeAuthedClient();
    const ctrl = new AbortController();
    const gen = client.agent.run(
      { message: "Count slowly from 1 to 1000" },
      { signal: ctrl.signal },
    );
    // Consume first event then abort
    const firstResult = await gen.next();
    expect(firstResult.done).toBe(false);
    if (!firstResult.done) trackEvent(firstResult.value);
    ctrl.abort();
    // Drain remaining events — may throw AbortError which is acceptable
    try {
      for await (const event of gen) trackEvent(event);
    } catch (err) {
      const name = (err as Error).name;
      expect(name === "AbortError" || name === "Error").toBe(true);
    }
  });
});
