import { beforeEach, describe, expect, it, vi } from "vitest";
import { LabelingModule } from "../src/labeling";
import type { HttpTransport } from "../src/transport";
import type {
  LabelingBindingRequest,
  LabelingDefinitionItem,
  LabelingPredictionItem,
  LabelingResultItem,
  ScoreResult,
} from "../src/types";

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

const DEFINITION: LabelingDefinitionItem = {
  definition_key: "toxicity",
  definition_version: 1,
  prediction_schema: { type: "object" },
  target_schema: { type: "object" },
  outcome_schema: { type: "object" },
  active: true,
  created_at: "2026-08-01T00:00:00Z",
};

const PREDICTION: LabelingPredictionItem = {
  id: "pred-1",
  source_kind: "schedule",
  source_id: "sched-abc",
  run_id: "run-123",
  schedule_id: "sched-abc",
  definition_key: "toxicity",
  definition_version: 1,
  predictions: { label: "spam" },
  payload_sha256: "abc123",
  prediction_at: "2026-08-01T00:00:00Z",
  status: "ready",
  parse_error: "",
  created_at: "2026-08-01T00:00:00Z",
};

const RESULT: LabelingResultItem = {
  id: "res-1",
  target_id: "target-42",
  scorer_key: "human",
  scorer_version: "v1",
  observation_id: null,
  actual: { sentiment: "neutral" },
  label: "spam",
  score: 0.92,
  status: "correct",
  source: "manual",
  rationale: "Matches the policy",
  created_at: "2026-08-01T00:00:00Z",
};

describe("LabelingModule", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: LabelingModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new LabelingModule(http);
  });

  it("lists available labeling definitions", async () => {
    vi.mocked(http.request).mockResolvedValue({ items: [DEFINITION] });

    await expect(module.listDefinitions()).resolves.toEqual([DEFINITION]);
    expect(http.request).toHaveBeenCalledWith("GET", "/labeling/definitions");
  });

  it("lists labeling predictions with optional limit", async () => {
    vi.mocked(http.request).mockResolvedValue({ items: [PREDICTION] });

    await expect(module.listPredictions({ limit: 25 })).resolves.toEqual([
      PREDICTION,
    ]);
    expect(http.request).toHaveBeenCalledWith("GET", "/labeling/predictions", {
      params: { limit: 25 },
    });
  });

  it("lists labeling results with optional limit", async () => {
    vi.mocked(http.request).mockResolvedValue({ items: [RESULT] });

    await expect(module.listResults({ limit: 50 })).resolves.toEqual([RESULT]);
    expect(http.request).toHaveBeenCalledWith("GET", "/labeling/results", {
      params: { limit: 50 },
    });
  });

  it("binds a schedule to a labeling definition", async () => {
    const payload: LabelingBindingRequest = {
      schedule_id: "sched-abc",
      definition_key: "toxicity",
      definition_version: 1,
    };
    const response = {
      id: "bind-1",
      schedule_id: "sched-abc",
      definition_key: "toxicity",
      definition_version: 1,
      status: "created",
    };

    vi.mocked(http.request).mockResolvedValue(response);

    await expect(module.bind(payload)).resolves.toEqual(response);
    expect(http.request).toHaveBeenCalledWith("POST", "/labeling/bindings", {
      body: payload,
    });
  });

  it("overrides a labeling result for a target", async () => {
    const payload: ScoreResult = {
      label: "spam",
      status: "correct",
      rationale: "Matches policy",
      score: 0.98,
      source: "manual",
      actual: { topic: "trading" },
    };
    const response = { status: "recorded" };

    vi.mocked(http.request).mockResolvedValue(response);

    await expect(module.override("target/42", payload)).resolves.toEqual(response);
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/labeling/results/target%2F42/override",
      { body: payload },
    );
  });
});
