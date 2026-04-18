import {
  AuthenticationError,
  ConflictError,
  ForbiddenError,
  GatewayError,
  NotFoundError,
  PaymentRequiredError,
  RateLimitError,
  TeardropApiError,
  ValidationError,
} from "./errors";

export interface HttpTransportOptions {
  baseUrl: string;
  timeout?: number;
}

/**
 * Internal HTTP transport used by all resource modules.
 * Wraps `fetch` with auth headers, JSON handling, and typed errors.
 */
export class HttpTransport {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private token?: string;

  constructor(opts: HttpTransportOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.timeout = opts.timeout ?? 120_000;
  }

  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string | undefined {
    return this.token;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    opts: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
      auth?: boolean;
      signal?: AbortSignal;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const { body, params, auth = true, signal, headers: extraHeaders } = opts;

    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...extraHeaders,
    };
    if (auth && this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const combinedSignal = signal
      ? anySignal([signal, controller.signal])
      : controller.signal;

    try {
      const resp = await fetch(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: combinedSignal,
      });

      if (!resp.ok) {
        await this.throwForStatus(resp);
      }

      if (resp.status === 204) return undefined as T;
      return (await resp.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Start a streaming fetch for SSE endpoints. Returns the raw Response
   * so the caller can pipe through `parseSseStream`.
   */
  async stream(
    method: string,
    path: string,
    opts: {
      body?: unknown;
      signal?: AbortSignal;
      headers?: Record<string, string>;
    } = {},
  ): Promise<Response> {
    const { body, signal, headers: extraHeaders } = opts;

    const url = new URL(path, this.baseUrl);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...extraHeaders,
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const resp = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!resp.ok) {
      await this.throwForStatus(resp);
    }

    return resp;
  }

  private async throwForStatus(resp: Response): Promise<never> {
    let body: unknown;
    try {
      body = await resp.json();
    } catch {
      body = await resp.text().catch(() => "");
    }

    const detail =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).detail ??
          (body as Record<string, unknown>).error ??
          (body as Record<string, unknown>).message
        : body;
    const msg = typeof detail === "string" ? detail : `API error ${resp.status}`;

    switch (resp.status) {
      case 401:
        throw new AuthenticationError(msg);
      case 402: {
        const b = body as Record<string, unknown> | undefined;
        throw new PaymentRequiredError(msg, {
          requirements: typeof b === "object" ? (b as Record<string, unknown>) : {},
          accepts: Array.isArray((b as Record<string, unknown>)?.accepts)
            ? (b as Record<string, unknown>).accepts as Record<string, unknown>[]
            : [],
          paymentHeader: resp.headers.get("X-PAYMENT-REQUIRED") ?? "",
        });
      }
      case 403:
        throw new ForbiddenError(msg);
      case 404:
        throw new NotFoundError(msg);
      case 409:
        throw new ConflictError(msg);
      case 422:
        throw new ValidationError(msg);
      case 429: {
        const retry = parseInt(resp.headers.get("Retry-After") ?? "60", 10);
        throw new RateLimitError(msg, isNaN(retry) ? 60 : retry);
      }
      case 502:
      case 504:
        throw new GatewayError(msg, resp.status);
      default:
        throw new TeardropApiError(resp.status, `HTTP_${resp.status}`, msg, body);
    }
  }
}

/** Combine multiple AbortSignals into one. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}
