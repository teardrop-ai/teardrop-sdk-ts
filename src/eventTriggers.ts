import type { HttpTransport } from "./transport";
import { ValidationError } from "./errors";
import type {
  CreateEventTriggerRequest,
  EventDispatchResponse,
  EventTriggerItem,
  EventTriggerCreatedResponse,
  RotateEventTriggerSecretResponse,
  ScheduledRunResultsResponse,
  ScheduledRunResultItem,
  UpdateEventTriggerRequest,
  ScheduleDeletedResponse,
} from "./types";
import { parseListResponse } from "./utils/parseListResponse";

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 120;
const PROMPT_MIN_LENGTH = 1;
const PROMPT_MAX_LENGTH = 8000;
const MAX_EVENT_PAYLOAD_BYTES = 64 * 1024;

export class EventTriggersModule {
  constructor(private readonly http: HttpTransport) {}

  async create(data: CreateEventTriggerRequest): Promise<EventTriggerCreatedResponse> {
    this.validateCreateInput(data);
    return this.http.request<EventTriggerCreatedResponse>(
      "POST",
      "/agent/event-triggers",
      { body: data },
    );
  }

  async list(): Promise<EventTriggerItem[]> {
    const data = await this.http.request<unknown>("GET", "/agent/event-triggers");
    return parseListResponse<EventTriggerItem>(data).items;
  }

  async get(id: string): Promise<EventTriggerItem> {
    return this.http.request<EventTriggerItem>(
      "GET",
      `/agent/event-triggers/${encodeURIComponent(id)}`,
    );
  }

  async update(
    id: string,
    data: UpdateEventTriggerRequest,
  ): Promise<EventTriggerItem> {
    this.validateUpdateInput(data);
    return this.http.request<EventTriggerItem>(
      "PATCH",
      `/agent/event-triggers/${encodeURIComponent(id)}`,
      { body: data },
    );
  }

  async delete(id: string): Promise<ScheduleDeletedResponse> {
    return this.http.request<ScheduleDeletedResponse>(
      "DELETE",
      `/agent/event-triggers/${encodeURIComponent(id)}`,
    );
  }

  async rotateSecret(id: string): Promise<RotateEventTriggerSecretResponse> {
    return this.http.request<RotateEventTriggerSecretResponse>(
      "POST",
      `/agent/event-triggers/${encodeURIComponent(id)}/rotate-secret`,
    );
  }

  async runs(
    id: string,
    params?: { limit?: number; cursor?: string },
  ): Promise<ScheduledRunResultsResponse> {
    const data = await this.http.request<unknown>(
      "GET",
      `/agent/event-triggers/${encodeURIComponent(id)}/runs`,
      {
        params: {
          limit: params?.limit,
          cursor: params?.cursor,
        },
      },
    );
    const parsed = parseListResponse<ScheduledRunResultItem>(data, {
      container: "items",
    });
    return { items: parsed.items, next_cursor: parsed.nextCursor };
  }

  async fire(
    triggerToken: string,
    payload: Record<string, unknown> | unknown[],
    opts: { secret: string; idempotencyKey?: string },
  ): Promise<EventDispatchResponse> {
    this.validateFireInput(payload, opts);

    const headers: Record<string, string> = {
      "X-Teardrop-Trigger-Secret": opts.secret,
    };
    if (opts.idempotencyKey) {
      headers["X-Idempotency-Key"] = opts.idempotencyKey;
    }

    return this.http.request<EventDispatchResponse>(
      "POST",
      `/agent/events/${encodeURIComponent(triggerToken)}`,
      {
        body: payload,
        auth: false,
        headers,
      },
    );
  }

  private validateCreateInput(data: CreateEventTriggerRequest): void {
    this.validateName(data.name);
    this.validatePrompt(data.prompt);
    this.validateCallbackUrl(data.callback_url);
  }

  private validateUpdateInput(data: UpdateEventTriggerRequest): void {
    if (data.name !== undefined) this.validateName(data.name);
    if (data.prompt !== undefined) this.validatePrompt(data.prompt);
    this.validateCallbackUrl(data.callback_url);
  }

  private validateFireInput(
    payload: Record<string, unknown> | unknown[],
    opts: { secret: string; idempotencyKey?: string },
  ): void {
    if (typeof opts.secret !== "string" || opts.secret.trim().length === 0) {
      throw new ValidationError("secret is required");
    }
    if (opts.idempotencyKey !== undefined && opts.idempotencyKey.trim().length === 0) {
      throw new ValidationError("idempotencyKey cannot be empty");
    }

    if (!Array.isArray(payload) && (payload === null || typeof payload !== "object")) {
      throw new ValidationError("payload must be an object or array");
    }

    let serialized: string;
    try {
      serialized = JSON.stringify(payload);
    } catch {
      throw new ValidationError("payload must be JSON-serializable");
    }

    const bytes = new TextEncoder().encode(serialized).length;
    if (bytes > MAX_EVENT_PAYLOAD_BYTES) {
      throw new ValidationError(
        `payload exceeds maximum size of ${MAX_EVENT_PAYLOAD_BYTES} bytes`,
      );
    }
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