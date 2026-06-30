import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "../src/errors";
import { EventTriggersModule } from "../src/eventTriggers";
import type { HttpTransport } from "../src/transport";
import type {
  CreateEventTriggerRequest,
  EventDispatchAccepted,
  EventTrigger,
  EventTriggerWithSecret,
  RotateEventTriggerSecretResponse,
  ScheduledRunResult,
  UpdateEventTriggerRequest,
} from "../src/types";

const TRIGGER: EventTrigger = {
  id: "evt-trigger-123",
  org_id: "org-123",
  user_id: "user-123",
  name: "On Payment Inbound",
  prompt: "Audit incoming payment of {{amount}} for user {{userId}}. Full tx: {{event_json}}",
  schedule_kind: "event",
  enabled: true,
  callback_url: "https://callback.example.com/hook",
  consecutive_failures: 0,
  last_run_at: null,
  created_at: "2026-06-28T12:00:00Z",
  updated_at: "2026-06-28T12:00:00Z",
};

const TRIGGER_WITH_SECRET: EventTriggerWithSecret = {
  ...TRIGGER,
  trigger_token: "H3_public_route_token",
  event_path: "/agent/events/H3_public_route_token",
  secret: "high_entropy_signing_secret_here",
};

const ROTATED_SECRET: RotateEventTriggerSecretResponse = {
  id: "evt-trigger-123",
  secret: "new_secret",
};

const RESULT: ScheduledRunResult = {
  id: "result-123",
  schedule_id: "evt-trigger-123",
  org_id: "org-123",
  run_id: "run-123",
  status: "completed",
  output_text: "Payment accepted.",
  cost_usdc: 15_000,
  error: "",
  created_at: "2026-06-28T12:00:25Z",
};

const ACCEPTED: EventDispatchAccepted = {
  run_id: "run-123",
  status: "accepted",
  schedule_id: "evt-trigger-123",
  result_path: "/agent/event-triggers/evt-trigger-123/runs",
};

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

describe("EventTriggersModule.create", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: EventTriggersModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new EventTriggersModule(http);
  });

  it("calls POST /agent/event-triggers with the request body", async () => {
    vi.mocked(http.request).mockResolvedValue(TRIGGER_WITH_SECRET);
    const req: CreateEventTriggerRequest = {
      name: "On Payment Inbound",
      prompt: "Audit incoming payment of {{amount}}",
    };

    await module.create(req);

    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/agent/event-triggers",
      { body: req },
    );
  });

  it("throws ValidationError when prompt is empty", async () => {
    const req: CreateEventTriggerRequest = {
      name: "On Payment Inbound",
      prompt: "",
    };

    await expect(module.create(req)).rejects.toBeInstanceOf(ValidationError);
    expect(http.request).not.toHaveBeenCalled();
  });

  it("throws ValidationError when callback_url is non-https", async () => {
    const req: CreateEventTriggerRequest = {
      name: "On Payment Inbound",
      prompt: "Audit incoming payment of {{amount}}",
      callback_url: "http://callback.example.com/hook",
    };

    await expect(module.create(req)).rejects.toBeInstanceOf(ValidationError);
    expect(http.request).not.toHaveBeenCalled();
  });
});

describe("EventTriggersModule.list", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: EventTriggersModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new EventTriggersModule(http);
  });

  it("accepts a bare array", async () => {
    vi.mocked(http.request).mockResolvedValue([TRIGGER]);

    await expect(module.list()).resolves.toEqual([TRIGGER]);
  });

  it("accepts an items envelope", async () => {
    vi.mocked(http.request).mockResolvedValue({ items: [TRIGGER] });

    const result = await module.list();
    expect(result).toEqual([TRIGGER]);
  });
});

describe("EventTriggersModule.update", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: EventTriggersModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new EventTriggersModule(http);
  });

  it("calls PATCH /agent/event-triggers/:id with the request body", async () => {
    vi.mocked(http.request).mockResolvedValue({ ...TRIGGER, enabled: false });
    const req: UpdateEventTriggerRequest = { enabled: false };

    await module.update("evt-trigger-123", req);

    expect(http.request).toHaveBeenCalledWith(
      "PATCH",
      "/agent/event-triggers/evt-trigger-123",
      { body: req },
    );
  });
});

describe("EventTriggersModule.rotateSecret", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: EventTriggersModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new EventTriggersModule(http);
  });

  it("calls the rotate-secret endpoint", async () => {
    vi.mocked(http.request).mockResolvedValue(ROTATED_SECRET);

    const result = await module.rotateSecret("evt-trigger-123");

    expect(result).toEqual(ROTATED_SECRET);
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/agent/event-triggers/evt-trigger-123/rotate-secret",
    );
  });
});

describe("EventTriggersModule.runs", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: EventTriggersModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new EventTriggersModule(http);
  });

  it("returns a paginated results page", async () => {
    vi.mocked(http.request).mockResolvedValue({
      items: [RESULT],
      next_cursor: "2026-06-28T12:00:25Z",
    });

    const result = await module.runs("evt-trigger-123", { limit: 10 });

    expect(result.items).toEqual([RESULT]);
    expect(result.next_cursor).toBe("2026-06-28T12:00:25Z");
  });
});

describe("EventTriggersModule.fire", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: EventTriggersModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new EventTriggersModule(http);
  });

  it("uses the public webhook endpoint with secret and idempotency headers", async () => {
    vi.mocked(http.request).mockResolvedValue(ACCEPTED);
    const payload = { amount: 125_000, userId: "user-123" };

    const result = await module.fire("H3_public_route_token", payload, {
      secret: "high_entropy_signing_secret_here",
      idempotencyKey: "payment-evt-123",
    });

    expect(result).toEqual(ACCEPTED);
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/agent/events/H3_public_route_token",
      {
        body: payload,
        auth: false,
        headers: {
          "X-Teardrop-Trigger-Secret": "high_entropy_signing_secret_here",
          "X-Idempotency-Key": "payment-evt-123",
        },
      },
    );
  });

  it("throws ValidationError when secret is empty", async () => {
    await expect(
      module.fire("H3_public_route_token", { amount: 1 }, { secret: "" }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(http.request).not.toHaveBeenCalled();
  });

  it("throws ValidationError when idempotency key is empty", async () => {
    await expect(
      module.fire(
        "H3_public_route_token",
        { amount: 1 },
        { secret: "high_entropy_signing_secret_here", idempotencyKey: "" },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(http.request).not.toHaveBeenCalled();
  });

  it("throws ValidationError when payload is not object or array", async () => {
    await expect(
      module.fire(
        "H3_public_route_token",
        "invalid" as unknown as Record<string, unknown>,
        { secret: "high_entropy_signing_secret_here" },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(http.request).not.toHaveBeenCalled();
  });

  it("throws ValidationError when payload exceeds 64KB", async () => {
    const payload = { data: "x".repeat(70_000) };

    await expect(
      module.fire("H3_public_route_token", payload, {
        secret: "high_entropy_signing_secret_here",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(http.request).not.toHaveBeenCalled();
  });
});