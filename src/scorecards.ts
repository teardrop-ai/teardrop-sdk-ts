import type { HttpTransport } from "./transport";
import type {
  LeaderboardResponse,
  ScorecardItem,
  ScorecardResponse,
  ScorecardTask,
  ScorecardTaskListResponse,
} from "./types";
import { parseListResponse } from "./utils/parseListResponse";

export class ScorecardsModule {
  constructor(private readonly http: HttpTransport) {}

  /** List scorecard tasks available for prediction submission. */
  async listTasks(): Promise<ScorecardTaskListResponse> {
    const data = await this.http.request<unknown>("GET", "/scorecards/tasks");
    const parsed = parseListResponse<ScorecardTask>(data, {
      container: "items",
    });
    return { items: parsed.items };
  }

  /** Get a scorecard leaderboard; results are not cursor-paginated. */
  async leaderboard(
    definitionKey: string,
    definitionVersion: number,
    params?: { window_days?: number },
  ): Promise<LeaderboardResponse> {
    const data = await this.http.request<LeaderboardResponse>(
      "GET",
      `/scorecards/${encodeURIComponent(definitionKey)}/${encodeURIComponent(String(definitionVersion))}`,
      { params: { window_days: params?.window_days } },
    );
    const parsed = parseListResponse<ScorecardItem>(data, {
      container: "items",
    });
    return {
      definition_key: data.definition_key,
      definition_sha256: data.definition_sha256,
      definition_version: data.definition_version,
      window_days: data.window_days,
      min_sample: data.min_sample,
      items: parsed.items,
    };
  }

  /** Get one subject's scorecard for a scorecard task. */
  async getScorecard(
    definitionKey: string,
    definitionVersion: number,
    subject: string,
    params?: { window_days?: number },
  ): Promise<ScorecardResponse> {
    return this.http.request<ScorecardResponse>(
      "GET",
      `/scorecards/${encodeURIComponent(definitionKey)}/${encodeURIComponent(String(definitionVersion))}/${encodeURIComponent(subject)}`,
      { params: { window_days: params?.window_days } },
    );
  }
}
