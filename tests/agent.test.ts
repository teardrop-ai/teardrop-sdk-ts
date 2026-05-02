/**
 * Tests for AgentModule.run — SSE streaming, request shaping, payment headers.
 * Mirrors test_agent_run.py.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentModule } from "../src/agent";
import { PaymentRequiredError } from "../src/errors";
import {
  EVENT_BILLING_SETTLEMENT,
  EVENT_CUSTOM,
  EVENT_DONE,
  EVENT_ERROR,
  EVENT_RUN_STARTED,
  EVENT_TEXT_MSG_CONTENT,
  EVENT_TEXT_MSG_END,
  EVENT_TEXT_MSG_START,
  EVENT_TOOL_CALL_END,
  EVENT_TOOL_CALL_START,
  EVENT_USAGE_SUMMARY,
  type SseEvent,
} from "../src/types";
import { collectText } from "../src/utils/parseSseStream";
import type { HttpTransport } from "../src/transport";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

/** Build a Teardrop-format SSE data line: `data: {"event": ..., "data": ...}` */
function sseData(event: string, data?: unknown): string {
  return `data: ${JSON.stringify({ event, data: data ?? {} })}`;
}

/** Create a Response whose body is a ReadableStream containing the given lines.
 *  Each element of `lines` that is non-empty is an SSE field line; empty
 *  strings act as the blank-line event separator required by the SSE spec.
 *  If you pass non-separator lines without trailing empty strings, the helper
 *  automatically appends one so the parser flushes the final event. */
function makeSSEResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  // Ensure each event line is followed by an empty separator line
  const normalised: string[] = [];
  for (const line of lines) {
    normalised.push(line);
    if (line !== "") normalised.push(""); // add separator after every data line
  }
  const content = normalised.join("\n") + "\n";
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(content));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

async function collectAll(
  gen: AsyncIterableIterator<SseEvent>,
): Promise<SseEvent[]> {
  const events: SseEvent[] = [];
  for await (const e of gen) {
    events.push(e);
  }
  return events;
}

// ── Request shaping ───────────────────────────────────────────────────────────

describe("AgentModule.run — request shaping", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let agent: AgentModule;

  beforeEach(() => {
    http = makeMockHttp();
    agent = new AgentModule(http);
  });

  it("calls http.stream with POST and /agent/run", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([sseData(EVENT_DONE, { run_id: "r1" })]),
    );
    await collectAll(agent.run({ message: "Hello" }));
    expect(http.stream).toHaveBeenCalledWith(
      "POST",
      "/agent/run",
      expect.any(Object),
    );
  });

  it("includes message in request body", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([sseData(EVENT_DONE, { run_id: "r1" })]),
    );
    await collectAll(agent.run({ message: "Hi there" }));
    const [, , opts] = vi.mocked(http.stream).mock.calls[0];
    expect((opts as { body: { message: string } }).body.message).toBe(
      "Hi there",
    );
  });

  it("omits thread_id from body when not provided", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([sseData(EVENT_DONE, { run_id: "r1" })]),
    );
    await collectAll(agent.run({ message: "Hello" }));
    const [, , opts] = vi.mocked(http.stream).mock.calls[0];
    expect(
      Object.prototype.hasOwnProperty.call(
        (opts as { body: unknown }).body,
        "thread_id",
      ),
    ).toBe(false);
  });

  it("includes thread_id when provided", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([sseData(EVENT_DONE, { run_id: "r1" })]),
    );
    await collectAll(
      agent.run({ message: "Continue", thread_id: "thread-abc" }),
    );
    const [, , opts] = vi.mocked(http.stream).mock.calls[0];
    expect((opts as { body: { thread_id: string } }).body.thread_id).toBe(
      "thread-abc",
    );
  });

  it("omits context from body when not provided", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([sseData(EVENT_DONE, { run_id: "r1" })]),
    );
    await collectAll(agent.run({ message: "Hello" }));
    const [, , opts] = vi.mocked(http.stream).mock.calls[0];
    expect(
      Object.prototype.hasOwnProperty.call(
        (opts as { body: unknown }).body,
        "context",
      ),
    ).toBe(false);
  });

  it("includes context when provided", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([sseData(EVENT_DONE, { run_id: "r1" })]),
    );
    const ctx = { user_tier: "pro", session_id: "s123" };
    await collectAll(agent.run({ message: "Hello", context: ctx }));
    const [, , opts] = vi.mocked(http.stream).mock.calls[0];
    expect(
      (opts as { body: { context: unknown } }).body.context,
    ).toEqual(ctx);
  });

  it("includes emit_ui when provided", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([sseData(EVENT_DONE, { run_id: "r1" })]),
    );
    await collectAll(agent.run({ message: "Hello", emit_ui: false }));
    const [, , opts] = vi.mocked(http.stream).mock.calls[0];
    expect((opts as { body: { emit_ui: boolean } }).body.emit_ui).toBe(false);
  });
});

// ── Payment header ─────────────────────────────────────────────────────────────

describe("AgentModule.run — payment header", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let agent: AgentModule;

  beforeEach(() => {
    http = makeMockHttp();
    agent = new AgentModule(http);
  });

  it("sets X-Payment header when paymentHeader is provided", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([sseData(EVENT_DONE, { run_id: "r1" })]),
    );
    await collectAll(
      agent.run({ message: "Hello" }, { paymentHeader: "x402-jwt-here" }),
    );
    const [, , opts] = vi.mocked(http.stream).mock.calls[0];
    expect(
      (opts as { headers: Record<string, string> }).headers["X-Payment"],
    ).toBe("x402-jwt-here");
  });

  it("does not include X-Payment header when paymentHeader is absent", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([sseData(EVENT_DONE, { run_id: "r1" })]),
    );
    await collectAll(agent.run({ message: "Hello" }));
    const [, , opts] = vi.mocked(http.stream).mock.calls[0];
    const headers =
      (opts as { headers?: Record<string, string> }).headers ?? {};
    expect(headers["X-Payment"]).toBeUndefined();
  });

  it("propagates PaymentRequiredError (HTTP 402) from http.stream", async () => {
    vi.mocked(http.stream).mockRejectedValue(
      new PaymentRequiredError("Payment required"),
    );
    await expect(
      collectAll(agent.run({ message: "paid action" })),
    ).rejects.toBeInstanceOf(PaymentRequiredError);
  });
});

// ── AbortSignal ───────────────────────────────────────────────────────────────

describe("AgentModule.run — AbortSignal", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let agent: AgentModule;

  beforeEach(() => {
    http = makeMockHttp();
    agent = new AgentModule(http);
  });

  it("passes the AbortSignal through to http.stream", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([sseData(EVENT_DONE, { run_id: "r1" })]),
    );
    const ctrl = new AbortController();
    await collectAll(agent.run({ message: "Hello" }, { signal: ctrl.signal }));
    const [, , opts] = vi.mocked(http.stream).mock.calls[0];
    expect((opts as { signal: AbortSignal }).signal).toBe(ctrl.signal);
  });
});

// ── Stream event sequencing ───────────────────────────────────────────────────

describe("AgentModule.run — stream events", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let agent: AgentModule;

  beforeEach(() => {
    http = makeMockHttp();
    agent = new AgentModule(http);
  });

  it("yields RUN_STARTED then TEXT_MESSAGE_CONTENT then DONE in order", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([
        sseData(EVENT_RUN_STARTED, { run_id: "r1", thread_id: "t1" }),
        sseData(EVENT_TEXT_MSG_START, { message_id: "m1" }),
        sseData(EVENT_TEXT_MSG_CONTENT, { message_id: "m1", delta: "Hello" }),
        sseData(EVENT_TEXT_MSG_END, { message_id: "m1" }),
        sseData(EVENT_DONE, { run_id: "r1" }),
      ]),
    );
    const events = await collectAll(agent.run({ message: "hi" }));
    expect(events.map((e) => e.event)).toEqual([
      EVENT_RUN_STARTED,
      EVENT_TEXT_MSG_START,
      EVENT_TEXT_MSG_CONTENT,
      EVENT_TEXT_MSG_END,
      EVENT_DONE,
    ]);
  });

  it("yields full tool-call sequence including Custom TOOL_OUTPUT", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([
        sseData(EVENT_RUN_STARTED, { run_id: "r2", thread_id: "t1" }),
        sseData(EVENT_TOOL_CALL_START, {
          tool_call_id: "tc1",
          tool_name: "web_search",
          args: { q: "test" },
        }),
        sseData(EVENT_TOOL_CALL_END, {
          tool_call_id: "tc1",
          tool_name: "web_search",
          output: "result",
        }),
        sseData(EVENT_CUSTOM, {
          name: "TOOL_OUTPUT",
          value: {
            tool_call_id: "tc1",
            tool_name: "web_search",
            data: { results: [] },
          },
        }),
        sseData(EVENT_USAGE_SUMMARY, {
          run_id: "r2",
          tokens_in: 100,
          tokens_out: 50,
          tool_calls: 1,
          duration_ms: 300,
          cost_usdc: 0.001,
          platform_fee_usdc: 0.0001,
          delegation_cost_usdc: 0,
        }),
        sseData(EVENT_DONE, { run_id: "r2" }),
      ]),
    );
    const events = await collectAll(agent.run({ message: "search" }));
    expect(events.map((e) => e.event)).toEqual([
      EVENT_RUN_STARTED,
      EVENT_TOOL_CALL_START,
      EVENT_TOOL_CALL_END,
      EVENT_CUSTOM,
      EVENT_USAGE_SUMMARY,
      EVENT_DONE,
    ]);
  });

  it("USAGE_SUMMARY event contains cost_usdc and tokens_in fields", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([
        sseData(EVENT_USAGE_SUMMARY, {
          run_id: "r3",
          tokens_in: 200,
          tokens_out: 80,
          tool_calls: 0,
          duration_ms: 500,
          cost_usdc: 0.0025,
          platform_fee_usdc: 0.0002,
          delegation_cost_usdc: 0,
        }),
        sseData(EVENT_DONE, { run_id: "r3" }),
      ]),
    );
    const events = await collectAll(agent.run({ message: "count" }));
    const usage = events.find((e) => e.event === EVENT_USAGE_SUMMARY);
    expect(usage).toBeDefined();
    if (usage?.event === EVENT_USAGE_SUMMARY) {
      expect(usage.data.cost_usdc).toBe(0.0025);
      expect(usage.data.tokens_in).toBe(200);
    }
  });

  it("yields ERROR event without throwing", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([
        sseData(EVENT_RUN_STARTED, { run_id: "r4", thread_id: "t1" }),
        sseData(EVENT_ERROR, { run_id: "r4", error: "LLM overloaded" }),
        sseData(EVENT_DONE, { run_id: "r4" }),
      ]),
    );
    const events = await collectAll(agent.run({ message: "oops" }));
    const errorEvent = events.find((e) => e.event === EVENT_ERROR);
    expect(errorEvent).toBeDefined();
    if (errorEvent?.event === EVENT_ERROR) {
      expect(errorEvent.data.error).toBe("LLM overloaded");
    }
  });

  it("yields BILLING_SETTLEMENT event", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([
        sseData(EVENT_BILLING_SETTLEMENT, {
          run_id: "r5",
          amount_usdc: 0.001,
          tx_hash: "0xdeadbeef",
          network: "base",
          delegation_cost_usdc: 0,
          platform_fee_usdc: 0.0001,
        }),
        sseData(EVENT_DONE, { run_id: "r5" }),
      ]),
    );
    const events = await collectAll(agent.run({ message: "settle" }));
    const settle = events.find((e) => e.event === EVENT_BILLING_SETTLEMENT);
    expect(settle).toBeDefined();
    if (settle?.event === EVENT_BILLING_SETTLEMENT) {
      expect(settle.data.tx_hash).toBe("0xdeadbeef");
    }
  });

  it("yields nothing from an empty stream", async () => {
    vi.mocked(http.stream).mockResolvedValue(makeSSEResponse([]));
    const events = await collectAll(agent.run({ message: "silence" }));
    expect(events).toHaveLength(0);
  });

  it("yields multiple TEXT_MESSAGE_CONTENT deltas in order", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([
        sseData(EVENT_TEXT_MSG_CONTENT, { message_id: "m1", delta: "Hello" }),
        sseData(EVENT_TEXT_MSG_CONTENT, { message_id: "m1", delta: ", " }),
        sseData(EVENT_TEXT_MSG_CONTENT, { message_id: "m1", delta: "world!" }),
        sseData(EVENT_DONE, { run_id: "r6" }),
      ]),
    );
    const events = await collectAll(agent.run({ message: "greet" }));
    const texts = events
      .filter((e) => e.event === EVENT_TEXT_MSG_CONTENT)
      .map((e) => (e as { event: typeof EVENT_TEXT_MSG_CONTENT; data: { delta: string } }).data.delta);
    expect(texts).toEqual(["Hello", ", ", "world!"]);
  });
});

// ── collectText wrapper ───────────────────────────────────────────────────────

describe("collectText wrapping AgentModule.run", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let agent: AgentModule;

  beforeEach(() => {
    http = makeMockHttp();
    agent = new AgentModule(http);
  });

  it("assembles all TEXT_MESSAGE_CONTENT deltas into a single string", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([
        sseData(EVENT_TEXT_MSG_CONTENT, { message_id: "m1", delta: "Foo" }),
        sseData(EVENT_TEXT_MSG_CONTENT, { message_id: "m1", delta: " Bar" }),
        sseData(EVENT_DONE, { run_id: "r7" }),
      ]),
    );
    const text = await collectText(agent.run({ message: "say foo bar" }));
    expect(text).toBe("Foo Bar");
  });

  it("returns empty string when stream has no TEXT_MESSAGE_CONTENT events", async () => {
    vi.mocked(http.stream).mockResolvedValue(
      makeSSEResponse([
        sseData(EVENT_DONE, { run_id: "r8" }),
      ]),
    );
    const text = await collectText(agent.run({ message: "empty" }));
    expect(text).toBe("");
  });
});
