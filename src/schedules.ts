import type { HttpTransport } from "./transport";
import { ValidationError } from "./errors";
import type {
  CreateScheduledRunRequest,
  Page,
  ScheduledRun,
  ScheduledRunResult,
  UpdateScheduledRunRequest,
} from "./types";
import { parseListResponse } from "./utils/parseListResponse";

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 120;
const PROMPT_MIN_LENGTH = 1;
const PROMPT_MAX_LENGTH = 8000;
const MIN_INTERVAL_SECONDS = 1;

export class SchedulesModule {
  constructor(private readonly http: HttpTransport) {}

  async create(data: CreateScheduledRunRequest): Promise<ScheduledRun> {
    this.validateCreateInput(data);
    return this.http.request<ScheduledRun>("POST", "/agent/schedules", {
      body: data,
    });
  }

  async list(): Promise<ScheduledRun[]> {
    const data = await this.http.request<unknown>("GET", "/agent/schedules");
    return parseListResponse<ScheduledRun>(data).items;
  }

  async get(id: string): Promise<ScheduledRun> {
    return this.http.request<ScheduledRun>(
      "GET",
      `/agent/schedules/${encodeURIComponent(id)}`,
    );
  }

  async update(
    id: string,
    data: UpdateScheduledRunRequest,
  ): Promise<ScheduledRun> {
    this.validateUpdateInput(data);
    return this.http.request<ScheduledRun>(
      "PATCH",
      `/agent/schedules/${encodeURIComponent(id)}`,
      { body: data },
    );
  }

  async delete(id: string): Promise<void> {
    await this.http.request<void>(
      "DELETE",
      `/agent/schedules/${encodeURIComponent(id)}`,
    );
  }

  async runs(
    id: string,
    params?: { limit?: number; cursor?: string },
  ): Promise<Page<ScheduledRunResult>> {
    const data = await this.http.request<unknown>(
      "GET",
      `/agent/schedules/${encodeURIComponent(id)}/runs`,
      {
        params: {
          limit: params?.limit,
          cursor: params?.cursor,
        },
      },
    );
    const parsed = parseListResponse<ScheduledRunResult>(data, {
      container: "items",
    });
    return { items: parsed.items, next_cursor: parsed.nextCursor };
  }

  private validateCreateInput(data: CreateScheduledRunRequest): void {
    this.validateName(data.name);
    this.validatePrompt(data.prompt);
    this.validateInterval(data.interval_seconds);
    this.validateCallbackUrl(data.callback_url);
  }

  private validateUpdateInput(data: UpdateScheduledRunRequest): void {
    if (data.name !== undefined) this.validateName(data.name);
    if (data.prompt !== undefined) this.validatePrompt(data.prompt);
    if (data.interval_seconds !== undefined) {
      this.validateInterval(data.interval_seconds);
    }
    this.validateCallbackUrl(data.callback_url);
  }

  private validateName(name: string): void {
    if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
      throw new ValidationError(
        `name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      );
    }
  }

  private validatePrompt(prompt: string): void {
    if (prompt.length < PROMPT_MIN_LENGTH || prompt.length > PROMPT_MAX_LENGTH) {
      throw new ValidationError(
        `prompt must be between ${PROMPT_MIN_LENGTH} and ${PROMPT_MAX_LENGTH} characters`,
      );
    }
  }

  private validateInterval(intervalSeconds: number): void {
    if (!Number.isInteger(intervalSeconds)) {
      throw new ValidationError("interval_seconds must be an integer");
    }
    if (intervalSeconds < MIN_INTERVAL_SECONDS) {
      throw new ValidationError(
        `interval_seconds must be >= ${MIN_INTERVAL_SECONDS}`,
      );
    }
  }

  private validateCallbackUrl(callbackUrl: string | null | undefined): void {
    if (callbackUrl === undefined || callbackUrl === null) return;
    let parsed: URL;
    try {
      parsed = new URL(callbackUrl);
    } catch {
      throw new ValidationError("callback_url must be a valid URL");
    }
    if (parsed.protocol !== "https:") {
      throw new ValidationError("callback_url must use https");
    }
  }
}