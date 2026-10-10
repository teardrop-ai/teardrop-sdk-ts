import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScorecardsModule } from "../src/scorecards";
import type { HttpTransport } from "../src/transport";
import type {
  LeaderboardResponse,
  ScorecardItem,
  ScorecardResponse,
  ScorecardTask,
} from "../src/types";

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

const TASK: ScorecardTask = {
  definition_key: "forecasting",
  definition_sha256: "definition-hash",
  definition_version: 2,
  prediction_schema: { type: "object" },
  config: { min_sample: 5 },
};

const ITEM: ScorecardItem = {
  subject: "agent-1",
  platform_attested: true,
  eligible: true,
  n_scored: 8,
  rounds_submitted: 10,
  rounds_expected: 10,
  unresolved: 0,
  coverage: 0.8,
  mean_brier: 0.14,
  adjusted_brier: 0.12,
  accuracy: 0.9,
  calibration: [
    {
      bin: 0,
      count: 4,
      lower: 0,
      upper: 0.25,
      mean_probability: 0.2,
      observed_frequency: 0.25,
    },
  ],
};

describe("ScorecardsModule", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let scorecards: ScorecardsModule;

  beforeEach(() => {
    http = makeMockHttp();
    scorecards = new ScorecardsModule(http);
  });

  it("lists tasks from the items envelope", async () => {
    vi.mocked(http.request).mockResolvedValue({ items: [TASK] });

    await expect(scorecards.listTasks()).resolves.toEqual({ items: [TASK] });
    expect(http.request).toHaveBeenCalledWith("GET", "/scorecards/tasks");
  });

  it("returns leaderboard metadata and items without cursor pagination", async () => {
    const response: LeaderboardResponse = {
      definition_key: "forecasting",
      definition_sha256: "definition-hash",
      definition_version: 2,
      window_days: 30,
      min_sample: 5,
      items: [ITEM],
    };
    vi.mocked(http.request).mockResolvedValue({
      ...response,
      next_cursor: "not-part-of-this-response",
    });

    await expect(
      scorecards.leaderboard("forecasting/task", 2, { window_days: 30 }),
    ).resolves.toEqual(response);
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/scorecards/forecasting%2Ftask/2",
      { params: { window_days: 30 } },
    );
  });

  it("gets one scorecard and encodes all user-supplied path segments", async () => {
    const response: ScorecardResponse = {
      definition_key: "forecasting",
      definition_sha256: "definition-hash",
      definition_version: 2,
      window_days: 30,
      min_sample: 5,
      item: ITEM,
    };
    vi.mocked(http.request).mockResolvedValue(response);

    await expect(
      scorecards.getScorecard("forecasting/task", 2, "agent/1", {
        window_days: 14,
      }),
    ).resolves.toEqual(response);
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/scorecards/forecasting%2Ftask/2/agent%2F1",
      { params: { window_days: 14 } },
    );
  });
});
