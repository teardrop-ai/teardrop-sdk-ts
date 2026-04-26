/**
 * Tests for AuthModule — login, registration, token lifecycle, and identity.
 * Mirrors test_auth.py.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from "../src/errors";
import { AuthModule } from "../src/auth";
import type { HttpTransport } from "../src/transport";
import type { MeResponse, TokenResponse } from "../src/types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TOKEN_RESPONSE: TokenResponse = {
  access_token: "header.payload.sig",
  token_type: "bearer",
  expires_in: 1800,
  refresh_token: "refresh-token-opaque",
};

const ME_RESPONSE: MeResponse = {
  sub: "user-uuid-1",
  user_id: "user-uuid-1",
  org_id: "org-uuid-1",
  org_name: "Acme Corp",
  role: "admin",
  auth_method: "email",
  email: "you@example.com",
  iss: "teardrop",
  exp: Math.floor(Date.now() / 1000) + 1800,
  iat: Math.floor(Date.now() / 1000),
};

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

// ── login — email + secret ───────────────────────────────────────────────────

describe("AuthModule.login — email + secret", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("calls POST /token with auth:false", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    await auth.login({ email: "you@example.com", secret: "pw" });
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/token",
      expect.objectContaining({ auth: false }),
    );
  });

  it("sends email and secret in request body", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    await auth.login({ email: "you@example.com", secret: "pw" });
    const [, , opts] = vi.mocked(http.request).mock.calls[0];
    expect((opts as { body: unknown }).body).toMatchObject({
      email: "you@example.com",
      secret: "pw",
    });
  });

  it("calls setToken with the returned access_token", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    await auth.login({ email: "you@example.com", secret: "pw" });
    expect(http.setToken).toHaveBeenCalledWith("header.payload.sig");
  });

  it("returns the full TokenResponse", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    const result = await auth.login({ email: "you@example.com", secret: "pw" });
    expect(result.access_token).toBe("header.payload.sig");
    expect(result.refresh_token).toBe("refresh-token-opaque");
    expect(result.expires_in).toBe(1800);
  });

  it("propagates AuthenticationError on bad credentials", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new AuthenticationError("Invalid credentials"),
    );
    await expect(
      auth.login({ email: "bad@example.com", secret: "wrong" }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("does NOT call setToken when the request fails", async () => {
    vi.mocked(http.request).mockRejectedValue(new AuthenticationError("fail"));
    await auth.login({ email: "x", secret: "y" }).catch(() => {});
    expect(http.setToken).not.toHaveBeenCalled();
  });
});

// ── login — client credentials (M2M) ─────────────────────────────────────────

describe("AuthModule.login — client credentials", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("sends client_id and client_secret in body", async () => {
    vi.mocked(http.request).mockResolvedValue({
      ...TOKEN_RESPONSE,
      refresh_token: undefined,
    });
    await auth.login({ client_id: "cid_123", client_secret: "cs_abc" });
    const [, , opts] = vi.mocked(http.request).mock.calls[0];
    expect((opts as { body: unknown }).body).toMatchObject({
      client_id: "cid_123",
      client_secret: "cs_abc",
    });
  });

  it("stores access_token after M2M login", async () => {
    vi.mocked(http.request).mockResolvedValue({
      ...TOKEN_RESPONSE,
      refresh_token: undefined,
    });
    await auth.login({ client_id: "cid_123", client_secret: "cs_abc" });
    expect(http.setToken).toHaveBeenCalledWith("header.payload.sig");
  });
});

// ── login — SIWE ─────────────────────────────────────────────────────────────

describe("AuthModule.login — SIWE", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("sends siwe_message and siwe_signature in body", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    await auth.login({
      siwe_message: "Sign this EIP-4361 message",
      siwe_signature: "0xdeadbeef",
    });
    const [, , opts] = vi.mocked(http.request).mock.calls[0];
    expect((opts as { body: unknown }).body).toMatchObject({
      siwe_message: "Sign this EIP-4361 message",
      siwe_signature: "0xdeadbeef",
    });
  });

  it("stores access_token after SIWE login", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    await auth.login({
      siwe_message: "msg",
      siwe_signature: "0x1234",
    });
    expect(http.setToken).toHaveBeenCalledWith("header.payload.sig");
  });
});

// ── register ──────────────────────────────────────────────────────────────────

describe("AuthModule.register", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("calls POST /register with auth:false", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    await auth.register({ org_name: "Acme", email: "a@b.com", password: "pw" });
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/register",
      expect.objectContaining({ auth: false }),
    );
  });

  it("stores the returned access_token", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    await auth.register({ org_name: "Acme", email: "a@b.com", password: "pw" });
    expect(http.setToken).toHaveBeenCalledWith("header.payload.sig");
  });

  it("propagates ConflictError on duplicate email", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new ConflictError("Email already registered"),
    );
    await expect(
      auth.register({ org_name: "X", email: "dup@b.com", password: "pw" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

// ── registerInvite ────────────────────────────────────────────────────────────

describe("AuthModule.registerInvite", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("calls POST /register/invite with auth:false", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    await auth.registerInvite({
      token: "invite-tok",
      email: "new@b.com",
      password: "pw",
    });
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/register/invite",
      expect.objectContaining({ auth: false }),
    );
  });

  it("stores the returned access_token", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    await auth.registerInvite({ token: "t", email: "e@b.com", password: "p" });
    expect(http.setToken).toHaveBeenCalledWith("header.payload.sig");
  });
});

// ── me ────────────────────────────────────────────────────────────────────────

describe("AuthModule.me", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("calls GET /auth/me", async () => {
    vi.mocked(http.request).mockResolvedValue(ME_RESPONSE);
    await auth.me();
    expect(http.request).toHaveBeenCalledWith("GET", "/auth/me");
  });

  it("returns org_name from MeResponse", async () => {
    vi.mocked(http.request).mockResolvedValue(ME_RESPONSE);
    const me = await auth.me();
    expect(me.org_name).toBe("Acme Corp");
    expect(me.role).toBe("admin");
    expect(me.email).toBe("you@example.com");
  });

  it("propagates AuthenticationError when token missing or invalid", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new AuthenticationError("Not authenticated"),
    );
    await expect(auth.me()).rejects.toBeInstanceOf(AuthenticationError);
  });
});

// ── siweNonce ─────────────────────────────────────────────────────────────────

describe("AuthModule.siweNonce", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("calls GET /auth/siwe/nonce with auth:false", async () => {
    vi.mocked(http.request).mockResolvedValue({ nonce: "abc123xyz" });
    await auth.siweNonce();
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/auth/siwe/nonce",
      expect.objectContaining({ auth: false }),
    );
  });

  it("returns the nonce string", async () => {
    vi.mocked(http.request).mockResolvedValue({ nonce: "abc123xyz" });
    const result = await auth.siweNonce();
    expect(result.nonce).toBe("abc123xyz");
  });
});

// ── refresh ───────────────────────────────────────────────────────────────────

describe("AuthModule.refresh", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("calls POST /auth/refresh with refresh_token in body", async () => {
    vi.mocked(http.request).mockResolvedValue(TOKEN_RESPONSE);
    await auth.refresh("refresh-token-opaque");
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/auth/refresh",
      expect.objectContaining({
        body: { refresh_token: "refresh-token-opaque" },
        auth: false,
      }),
    );
  });

  it("stores the new access_token", async () => {
    const newToken = { ...TOKEN_RESPONSE, access_token: "new.header.sig" };
    vi.mocked(http.request).mockResolvedValue(newToken);
    await auth.refresh("old-refresh");
    expect(http.setToken).toHaveBeenCalledWith("new.header.sig");
  });

  it("propagates AuthenticationError when refresh token is expired", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new AuthenticationError("Refresh token expired"),
    );
    await expect(auth.refresh("expired-token")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });
});

// ── logout ────────────────────────────────────────────────────────────────────

describe("AuthModule.logout", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("calls POST /auth/logout with refresh_token in body", async () => {
    vi.mocked(http.request).mockResolvedValue(undefined);
    await auth.logout("refresh-token-opaque");
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/auth/logout",
      expect.objectContaining({
        body: { refresh_token: "refresh-token-opaque" },
      }),
    );
  });

  it("resolves void on success", async () => {
    vi.mocked(http.request).mockResolvedValue(undefined);
    await expect(auth.logout("tok")).resolves.toBeUndefined();
  });
});

// ── verifyEmail ───────────────────────────────────────────────────────────────

describe("AuthModule.verifyEmail", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("calls GET /auth/verify-email with token as query param and auth:false", async () => {
    vi.mocked(http.request).mockResolvedValue({ verified: true });
    await auth.verifyEmail("one-time-tok");
    expect(http.request).toHaveBeenCalledWith(
      "GET",
      "/auth/verify-email",
      expect.objectContaining({
        params: { token: "one-time-tok" },
        auth: false,
      }),
    );
  });

  it("returns verified:true on success", async () => {
    vi.mocked(http.request).mockResolvedValue({ verified: true });
    const result = await auth.verifyEmail("tok");
    expect(result.verified).toBe(true);
  });

  it("propagates NotFoundError when token is invalid or already used", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new NotFoundError("Token not found"),
    );
    await expect(auth.verifyEmail("stale-tok")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

// ── resendVerification ────────────────────────────────────────────────────────

describe("AuthModule.resendVerification", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("calls POST /auth/resend-verification with email in body", async () => {
    vi.mocked(http.request).mockResolvedValue({ message: "sent" });
    await auth.resendVerification("you@example.com");
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/auth/resend-verification",
      expect.objectContaining({ body: { email: "you@example.com" } }),
    );
  });
});

// ── invite ────────────────────────────────────────────────────────────────────

describe("AuthModule.invite", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let auth: AuthModule;

  beforeEach(() => {
    http = makeMockHttp();
    auth = new AuthModule(http);
  });

  it("calls POST /org/invite with email and role", async () => {
    const resp = {
      token: "inv-tok",
      invite_url: "https://teardrop.dev/invite/inv-tok",
      expires_at: "2026-05-01T00:00:00Z",
    };
    vi.mocked(http.request).mockResolvedValue(resp);
    const result = await auth.invite({ email: "new@b.com", role: "member" });
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/org/invite",
      expect.objectContaining({
        body: { email: "new@b.com", role: "member" },
      }),
    );
    expect(result.invite_url).toBe("https://teardrop.dev/invite/inv-tok");
    expect(result.expires_at).toBe("2026-05-01T00:00:00Z");
  });
});

// ── workflow: login → me ──────────────────────────────────────────────────────

describe("AuthModule — login then me workflow", () => {
  it("setToken is called with access_token before me() can succeed", async () => {
    const http = makeMockHttp();
    const auth = new AuthModule(http);

    vi.mocked(http.request)
      .mockResolvedValueOnce(TOKEN_RESPONSE)  // login
      .mockResolvedValueOnce(ME_RESPONSE);    // me

    await auth.login({ email: "you@example.com", secret: "pw" });
    expect(http.setToken).toHaveBeenCalledWith("header.payload.sig");

    const me = await auth.me();
    expect(me.org_id).toBe("org-uuid-1");
  });
});
