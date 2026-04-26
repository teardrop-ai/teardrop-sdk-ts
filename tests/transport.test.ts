/**
 * Tests for HttpTransport — error mapping and request behaviour.
 * Mirrors test_client.py::TestRaiseForStatus.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
} from "../src/errors";
import { HttpTransport } from "../src/transport";

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

// ── throwForStatus ───────────────────────────────────────────────────────────

describe("HttpTransport — error mapping", () => {
  let transport: HttpTransport;

  beforeEach(() => {
    transport = new HttpTransport({ baseUrl: "http://test" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not throw on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200)),
    );
    await expect(transport.request("GET", "/")).resolves.toEqual({ ok: true });
  });

  it("throws AuthenticationError on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Unauthorized" }, 401)),
    );
    const err = await transport.request("GET", "/").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.message).toContain("Unauthorized");
    expect(err.status).toBe(401);
  });

  it("throws PaymentRequiredError on 402", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ error: "Insufficient credits" }, 402)),
    );
    const err = await transport.request("GET", "/").catch((e) => e);
    expect(err).toBeInstanceOf(PaymentRequiredError);
    expect(err.message).toContain("Insufficient credits");
  });

  it("throws ForbiddenError on 403 with detail message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ detail: "You do not have permission" }, 403),
        ),
    );
    const err = await transport.request("GET", "/").catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.message).toContain("You do not have permission");
  });

  it("throws ForbiddenError using 'error' field when 'detail' is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "other" }, 403)),
    );
    const err = await transport.request("GET", "/").catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenError);
    // The transport uses the 'error' key as the message when 'detail' is absent
    expect(err.message).toBe("other");
  });

  it("throws NotFoundError on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Not found" }, 404)),
    );
    await expect(transport.request("GET", "/thing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("throws ConflictError on 409", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "already exists" }, 409)),
    );
    const err = await transport.request("POST", "/").catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.message).toContain("already exists");
  });

  it("ConflictError is a subclass of TeardropApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "conflict" }, 409)),
    );
    await expect(transport.request("POST", "/")).rejects.toBeInstanceOf(
      TeardropApiError,
    );
  });

  it("throws ValidationError on 422", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "SSRF blocked" }, 422)),
    );
    await expect(transport.request("POST", "/")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("throws RateLimitError on 429 with retryAfter from header", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ detail: "Rate limit exceeded" }, 429, {
            "Retry-After": "30",
          }),
        ),
    );
    const err = await transport.request("GET", "/").catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBe(30);
  });

  it("throws RateLimitError with default retryAfter when header is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Rate limit" }, 429)),
    );
    const err = await transport.request("GET", "/").catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBe(60);
  });

  it("throws GatewayError on 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Bad gateway" }, 502)),
    );
    await expect(transport.request("GET", "/")).rejects.toBeInstanceOf(
      GatewayError,
    );
  });

  it("throws GatewayError on 504", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ detail: "Gateway timeout" }, 504)),
    );
    const err = await transport.request("GET", "/").catch((e) => e);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err.message).toContain("Gateway timeout");
  });

  it("throws TeardropApiError on 500 with status code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "internal" }, 500)),
    );
    const err = await transport.request("GET", "/").catch((e) => e);
    expect(err).toBeInstanceOf(TeardropApiError);
    expect(err.status).toBe(500);
  });

  it("returns undefined on 204 No Content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    await expect(transport.request("DELETE", "/thing/1")).resolves.toBeUndefined();
  });
});

// ── Auth header ──────────────────────────────────────────────────────────────

describe("HttpTransport — auth header", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets Authorization: Bearer header when token is present", async () => {
    const transport = new HttpTransport({ baseUrl: "http://test" });
    transport.setToken("my-token");
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({}, 200));
    vi.stubGlobal("fetch", mockFetch);
    await transport.request("GET", "/");
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer my-token",
    );
  });

  it("omits Authorization header when auth=false", async () => {
    const transport = new HttpTransport({ baseUrl: "http://test" });
    transport.setToken("my-token");
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse({}, 200));
    vi.stubGlobal("fetch", mockFetch);
    await transport.request("GET", "/", { auth: false });
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });

  it("getToken returns the stored token", () => {
    const transport = new HttpTransport({ baseUrl: "http://test" });
    expect(transport.getToken()).toBeUndefined();
    transport.setToken("tok.en.sig");
    expect(transport.getToken()).toBe("tok.en.sig");
  });
});

// ── Query params ─────────────────────────────────────────────────────────────

describe("HttpTransport — query params", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("appends defined params to the URL", async () => {
    const transport = new HttpTransport({ baseUrl: "http://test" });
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse([], 200));
    vi.stubGlobal("fetch", mockFetch);
    await transport.request("GET", "/items", { params: { limit: 50, offset: 0 }, auth: false });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("limit=50");
    expect(url).toContain("offset=0");
  });

  it("skips undefined param values", async () => {
    const transport = new HttpTransport({ baseUrl: "http://test" });
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse([], 200));
    vi.stubGlobal("fetch", mockFetch);
    await transport.request("GET", "/items", {
      params: { limit: 10, cursor: undefined },
      auth: false,
    });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).not.toContain("cursor");
  });
});

// ── TokenManager ─────────────────────────────────────────────────────────────

import { AuthenticationError as AuthErr } from "../src/errors";
import { TokenManager } from "../src/transport";

/** Build a minimal JWT with the given `exp` claim (HS256 signature is fake). */
function makeJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const payload = btoa(JSON.stringify({ sub: "u1", exp }))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${payload}.fakesig`;
}

describe("TokenManager", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns undefined when no credentials and no static token", async () => {
    const tm = new TokenManager("http://test");
    expect(await tm.getToken()).toBeUndefined();
  });

  it("returns static token immediately without fetching", async () => {
    const staticToken = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    const tm = new TokenManager("http://test", undefined, staticToken);
    expect(await tm.getToken()).toBe(staticToken);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("acquires a token on first getToken() call with email+secret credentials", async () => {
    const token = makeJwt(Math.floor(Date.now() / 1000) + 1800);
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: token }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const tm = new TokenManager("http://test", { email: "u@x.com", secret: "pw" });
    const result = await tm.getToken();

    expect(result).toBe(token);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://test/token");
    expect((opts as RequestInit).method).toBe("POST");
  });

  it("reuses a valid token without re-fetching on second call", async () => {
    const token = makeJwt(Math.floor(Date.now() / 1000) + 1800);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ access_token: token }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const tm = new TokenManager("http://test", { email: "u@x.com", secret: "pw" });
    await tm.getToken();
    await tm.getToken();

    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("refreshes a token that is within 5 minutes of expiry", async () => {
    // First token expires in 4 minutes (within 5-minute pre-expiry threshold).
    const nearExpiryToken = makeJwt(Math.floor(Date.now() / 1000) + 240);
    const freshToken = makeJwt(Math.floor(Date.now() / 1000) + 1800);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: nearExpiryToken }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: freshToken }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const tm = new TokenManager("http://test", { email: "u@x.com", secret: "pw" });
    const first = await tm.getToken();
    // First call acquires nearExpiryToken; since it's within 5 min threshold,
    // second call should trigger a refresh.
    const second = await tm.getToken();

    expect(first).toBe(nearExpiryToken);
    expect(second).toBe(freshToken);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent getToken() calls to a single fetch", async () => {
    const token = makeJwt(Math.floor(Date.now() / 1000) + 1800);
    let resolveAcquire!: (v: Response) => void;
    const acquirePromise = new Promise<Response>((res) => {
      resolveAcquire = res;
    });
    const mockFetch = vi.fn().mockReturnValue(acquirePromise);
    vi.stubGlobal("fetch", mockFetch);

    const tm = new TokenManager("http://test", { email: "u@x.com", secret: "pw" });
    // Fire three concurrent requests before the first resolves.
    const [r1, r2, r3] = await Promise.all([
      tm.getToken().then(() => undefined),
      tm.getToken().then(() => undefined),
      (async () => {
        resolveAcquire(
          new Response(JSON.stringify({ access_token: token }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
        return tm.getToken().then(() => undefined);
      })(),
    ]);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(r1).toBeUndefined(); // void — just checks it resolved
  });

  it("throws AuthenticationError when token endpoint returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: "Invalid credentials" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          }),
        ),
    );

    const tm = new TokenManager("http://test", { email: "bad@x.com", secret: "wrong" });
    await expect(tm.getToken()).rejects.toBeInstanceOf(AuthErr);
  });

  it("setToken() / getTokenSync() work without a network call", () => {
    const tm = new TokenManager("http://test");
    expect(tm.getTokenSync()).toBeUndefined();
    const token = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    tm.setToken(token);
    expect(tm.getTokenSync()).toBe(token);
  });
});
