import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "../src/errors";
import { SchedulesModule } from "../src/schedules";
import type { HttpTransport } from "../src/transport";
import type {
  CreateScheduledRunRequest,
  ScheduleRunNowResponse,
  ScheduledRun,
  ScheduledRunResult,
  UpdateScheduledRunRequest,
} from "../src/types";

const SCHEDULE: ScheduledRun = {
  id: "sched-123",
  org_id: "org-123",
  user_id: "user-123",
  name: "Daily Summary",
  prompt: "Summarize portfolio balances",
  schedule_kind: "interval",
  interval_seconds: 86_400,
  enabled: true,
  callback_url: "https://callback.example.com/hook",
  next_run_at: "2026-06-29T12:00:00Z",
  last_run_at: "2026-06-28T12:00:00Z",
  consecutive_failures: 0,
  created_at: "2026-06-28T11:00:00Z",
  updated_at: "2026-06-28T11:00:00Z",
};

const RESULT: ScheduledRunResult = {
  id: "result-123",
  schedule_id: "sched-123",
  org_id: "org-123",
  run_id: "run-123",
  status: "completed",
  output_text: "Portfolio yields stable.",
  cost_usdc: 15_000,
  error: "",
  created_at: "2026-06-28T12:00:25Z",
};

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

describe("SchedulesModule.create", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: SchedulesModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new SchedulesModule(http);
  });

  it("calls POST /agent/schedules with the request body", async () => {
    vi.mocked(http.request).mockResolvedValue(SCHEDULE);
    const req: CreateScheduledRunRequest = {
      name: "Daily Summary",
      prompt: "Summarize portfolio balances",
      interval_seconds: 86_400,
    };

    await module.create(req);

    expect(http.request).toHaveBeenCalledWith("POST", "/agent/schedules", {
      body: req,
    });
  });

  it("throws ValidationError when interval_seconds is below minimum", async () => {
    const req: CreateScheduledRunRequest = {
      name: "Daily Summary",
      prompt: "Summarize portfolio balances",
      interval_seconds: 0,
    };

    await expect(module.create(req)).rejects.toBeInstanceOf(ValidationError);
    expect(http.request).not.toHaveBeenCalled();
  });

  it("throws ValidationError when name is empty", async () => {
    const req: CreateScheduledRunRequest = {
      name: "",
      prompt: "Summarize portfolio balances",
      interval_seconds: 300,
    };

    await expect(module.create(req)).rejects.toBeInstanceOf(ValidationError);
    expect(http.request).not.toHaveBeenCalled();
  });

  it("accepts prompts up to the spec maximum", async () => {
    vi.mocked(http.request).mockResolvedValue(SCHEDULE);
    const req: CreateScheduledRunRequest = {
      name: "Daily Summary",
      prompt: "x".repeat(12_000),
      interval_seconds: 300,
    };

    await expect(module.create(req)).resolves.toEqual(SCHEDULE);
  });

  it("throws ValidationError when callback_url is non-https", async () => {
    const req: CreateScheduledRunRequest = {
      name: "Daily Summary",
      prompt: "Summarize portfolio balances",
      interval_seconds: 300,
      callback_url: "http://callback.example.com/hook",
    };

    await expect(module.create(req)).rejects.toBeInstanceOf(ValidationError);
    expect(http.request).not.toHaveBeenCalled();
  });
});

describe("SchedulesModule.list", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: SchedulesModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new SchedulesModule(http);
  });

  it("accepts a bare array", async () => {
    vi.mocked(http.request).mockResolvedValue([SCHEDULE]);

    await expect(module.list()).resolves.toEqual([SCHEDULE]);
  });

  it("accepts an items envelope", async () => {
    vi.mocked(http.request).mockResolvedValue({ items: [SCHEDULE] });

    const result = await module.list();
    expect(result).toEqual([SCHEDULE]);
  });
});

describe("SchedulesModule.update", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: SchedulesModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new SchedulesModule(http);
  });

  it("calls PATCH /agent/schedules/:id with the request body", async () => {
    vi.mocked(http.request).mockResolvedValue({ ...SCHEDULE, enabled: false });
    const req: UpdateScheduledRunRequest = { enabled: false };

    await module.update("sched-123", req);

    expect(http.request).toHaveBeenCalledWith(
      "PATCH",
      "/agent/schedules/sched-123",
      { body: req },
    );
  });

  it("throws ValidationError for invalid prompt", async () => {
    const req: UpdateScheduledRunRequest = { prompt: "" };

    await expect(module.update("sched-123", req)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(http.request).not.toHaveBeenCalled();
  });

  it("throws ValidationError for invalid interval_seconds", async () => {
    const req: UpdateScheduledRunRequest = { interval_seconds: 0 };

    await expect(module.update("sched-123", req)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(http.request).not.toHaveBeenCalled();
  });

  it("passes null values through for intentional clears", async () => {
    const req: UpdateScheduledRunRequest = {
      name: null,
      prompt: null,
      interval_seconds: null,
      enabled: null,
      callback_url: null,
      callback_format: null,
    };
    vi.mocked(http.request).mockResolvedValue(SCHEDULE);

    await module.update("sched-123", req);

    expect(http.request).toHaveBeenCalledWith(
      "PATCH",
      "/agent/schedules/sched-123",
      { body: req },
    );
  });
});

describe("SchedulesModule.delete", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: SchedulesModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new SchedulesModule(http);
  });

  it("calls DELETE /agent/schedules/:id", async () => {
    vi.mocked(http.request).mockResolvedValue({ status: "deleted" });

    const result = await module.delete("sched-123");
    expect(result).toEqual({ status: "deleted" });

    expect(http.request).toHaveBeenCalledWith(
      "DELETE",
      "/agent/schedules/sched-123",
    );
  });
});

describe("SchedulesModule.runNow", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: SchedulesModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new SchedulesModule(http);
  });

  it("queues an immediate scheduled run", async () => {
    const response: ScheduleRunNowResponse = {
      schedule_id: "sched-123",
      status: "queued",
      next_run_at: "2026-08-17T12:00:00Z",
    };
    vi.mocked(http.request).mockResolvedValue(response);

    await expect(module.runNow("sched/123")).resolves.toEqual(response);
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/agent/schedules/sched%2F123/run",
    );
  });
});

describe("SchedulesModule.runs", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: SchedulesModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new SchedulesModule(http);
  });

  it("returns a paginated results page", async () => {
    vi.mocked(http.request).mockResolvedValue({
      items: [RESULT],
      next_cursor: "2026-06-28T12:00:25Z",
    });

    const result = await module.runs("sched-123", { limit: 10 });

    expect(result.items).toEqual([RESULT]);
    expect(result.next_cursor).toBe("2026-06-28T12:00:25Z");
  });

  it("passes cursor params", async () => {
    vi.mocked(http.request).mockResolvedValue({ items: [], next_cursor: null });

    await module.runs("sched-123", { limit: 5, cursor: "cursor-2" });

    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/agent/schedules/sched-123/runs",
      { params: { limit: 5, cursor: "cursor-2" } },
    );
  });
});