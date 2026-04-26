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

// ── TokenManager ──────────────────────────────────────────────────────────────

type CredentialParams =
  | { email: string; secret: string }
  | { client_id: string; client_secret: string };

/**
 * Manages JWT acquisition and silent refresh.
 *
 * When `credentials` are provided the manager lazily obtains a token on the
 * first request and silently refreshes it when it is within 5 minutes of
 * expiry (matching the Python SDK's 30-minute refresh window behaviour for
 * the TS equivalent using 5-minute pre-expiry threshold).
 *
 * A shared in-flight promise prevents concurrent token fetches when multiple
 * requests are made simultaneously while the token is stale.
 */
export class TokenManager {
  private token?: string;
  /** Unix timestamp (seconds) at which the current token expires. */
  private expiresAt = 0;
  /** Shared promise for an in-flight token acquisition/refresh. */
  private refreshPromise?: Promise<void>;

  constructor(
    private readonly baseUrl: string,
    private readonly credentials?: CredentialParams,
    staticToken?: string,
  ) {
    if (staticToken) {
      this.setToken(staticToken);
    }
  }

  /**
   * Return a valid token, acquiring or refreshing as needed.
   * Returns `undefined` when no credentials and no static token were provided.
   */
  async getToken(): Promise<string | undefined> {
    // No auto-refresh without stored credentials.
    if (!this.credentials) return this.token;

    const nowSec = Date.now() / 1000;
    // Refresh when token is absent or expires within 5 minutes.
    if (this.token && this.expiresAt - nowSec > 300) {
      return this.token;
    }

    // Deduplicate concurrent refresh attempts.
    if (!this.refreshPromise) {
      this.refreshPromise = this._acquire().finally(() => {
        this.refreshPromise = undefined;
      });
    }
    await this.refreshPromise;
    return this.token;
  }

  /** Manually set a token (e.g. after an explicit login call). */
  setToken(token: string): void {
    this.token = token;
    this.expiresAt = parseJwtExp(token);
  }

  /** Synchronously return the current token without triggering a refresh. */
  getTokenSync(): string | undefined {
    return this.token;
  }

  private async _acquire(): Promise<void> {
    const resp = await fetch(`${this.baseUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.credentials),
    });

    if (!resp.ok) {
      let body: unknown;
      try {
        body = await resp.json();
      } catch {
        body = {};
      }
      const detail =
        (body as Record<string, unknown>)?.detail ??
        (body as Record<string, unknown>)?.error ??
        "Token acquisition failed";
      throw new AuthenticationError(String(detail));
    }

    const data = (await resp.json()) as { access_token: string };
    this.setToken(data.access_token);
  }
}

/** Decode the `exp` claim from a JWT without a library dependency. */
function parseJwtExp(token: string): number {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return 0;
    // Convert base64url → base64, then decode.
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as Record<string, unknown>;
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

// ── HttpTransport ─────────────────────────────────────────────────────────────

export interface HttpTransportOptions {
  baseUrl: string;
  timeout?: number;
  /** Email + password for auto token acquisition/refresh. */
  email?: string;
  secret?: string;
  /** OAuth2 client credentials for auto token acquisition/refresh. */
  client_id?: string;
  client_secret?: string;
  /** Pre-authenticated static JWT; takes precedence over credentials. */
  token?: string;
}

/**
 * Internal HTTP transport used by all resource modules.
 * Wraps `fetch` with auth headers, JSON handling, and typed errors.
 */
export class HttpTransport {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly tokenManager: TokenManager;

  constructor(opts: HttpTransportOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.timeout = opts.timeout ?? 120_000;

    let credentials: CredentialParams | undefined;
    if (opts.email && opts.secret) {
      credentials = { email: opts.email, secret: opts.secret };
    } else if (opts.client_id && opts.client_secret) {
      credentials = { client_id: opts.client_id, client_secret: opts.client_secret };
    }

    this.tokenManager = new TokenManager(this.baseUrl, credentials, opts.token);
  }

  setToken(token: string): void {
    this.tokenManager.setToken(token);
  }

  getToken(): string | undefined {
    return this.tokenManager.getTokenSync();
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
    if (auth) {
      const token = await this.tokenManager.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
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

    const token = await this.tokenManager.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...extraHeaders,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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
