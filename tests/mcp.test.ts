/**
 * Tests for McpModule — CRUD and discovery of MCP servers.
 * Mirrors test_mcp_servers.py.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthenticationError,
  ConflictError,
  GatewayError,
  NotFoundError,
  TeardropApiError,
  ValidationError,
} from "../src/errors";
import { McpModule } from "../src/mcp";
import type { HttpTransport } from "../src/transport";
import type {
  CreateMcpServerRequest,
  DiscoverMcpToolsResponse,
  OrgMcpServer,
  UpdateMcpServerRequest,
} from "../src/types";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SERVER: OrgMcpServer = {
  id: "srv-1",
  org_id: "org-abc",
  name: "my_server",
  url: "https://mcp.example.com/sse",
  auth_type: "none",
  has_auth: false,
  auth_header_name: null,
  is_active: true,
  timeout_seconds: 15,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

// ── create ────────────────────────────────────────────────────────────────────

describe("McpModule.create", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: McpModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new McpModule(http);
  });

  it("returns the created OrgMcpServer", async () => {
    vi.mocked(http.request).mockResolvedValue(SERVER);
    const req: CreateMcpServerRequest = {
      name: "my_server",
      url: "https://mcp.example.com/sse",
    };
    const result = await module.create(req);
    expect(result.name).toBe("my_server");
    expect(result.has_auth).toBe(false);
  });

  it("calls POST /mcp/servers with the request body", async () => {
    vi.mocked(http.request).mockResolvedValue(SERVER);
    const req: CreateMcpServerRequest = {
      name: "my_server",
      url: "https://mcp.example.com/sse",
    };
    await module.create(req);
    expect(http.request).toHaveBeenCalledWith("POST", "/mcp/servers", {
      body: req,
    });
  });

  it("returns a server with has_auth=true for bearer auth", async () => {
    const serverWithAuth: OrgMcpServer = {
      ...SERVER,
      name: "secure_srv",
      has_auth: true,
      auth_type: "bearer",
    };
    vi.mocked(http.request).mockResolvedValue(serverWithAuth);
    const req: CreateMcpServerRequest = {
      name: "secure_srv",
      url: "https://mcp.example.com/sse",
      auth_type: "bearer",
      auth_token: "secret",
    };
    const result = await module.create(req);
    expect(result.has_auth).toBe(true);
    expect(result.auth_type).toBe("bearer");
    // auth_token is write-only and must never appear on the response model
    expect("auth_token" in result).toBe(false);
  });

  it("throws ConflictError on name collision (409)", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new ConflictError("name already exists"),
    );
    const req: CreateMcpServerRequest = {
      name: "my_server",
      url: "https://mcp.example.com/sse",
    };
    const err = await module.create(req).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.message).toContain("already exists");
  });

  it("ConflictError is a subclass of TeardropApiError", async () => {
    vi.mocked(http.request).mockRejectedValue(new ConflictError("conflict"));
    await expect(
      module.create({ name: "x", url: "https://mcp.example.com/sse" }),
    ).rejects.toBeInstanceOf(TeardropApiError);
  });

  it("throws ValidationError on 422", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new ValidationError("SSRF blocked"),
    );
    await expect(
      module.create({ name: "x", url: "https://mcp.example.com/sse" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

// ── list ──────────────────────────────────────────────────────────────────────

describe("McpModule.list", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: McpModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new McpModule(http);
  });

  it("returns an empty array when no servers exist", async () => {
    vi.mocked(http.request).mockResolvedValue([]);
    expect(await module.list()).toEqual([]);
  });

  it("returns all servers", async () => {
    vi.mocked(http.request).mockResolvedValue([SERVER, SERVER]);
    const result = await module.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("my_server");
  });

  it("throws AuthenticationError on 401", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new AuthenticationError("Unauthorized"),
    );
    await expect(module.list()).rejects.toBeInstanceOf(AuthenticationError);
  });
});

// ── get ───────────────────────────────────────────────────────────────────────

describe("McpModule.get", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: McpModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new McpModule(http);
  });

  it("returns the server when found", async () => {
    vi.mocked(http.request).mockResolvedValue(SERVER);
    const result = await module.get("srv-1");
    expect(result.id).toBe("srv-1");
  });

  it("throws NotFoundError when server does not exist", async () => {
    vi.mocked(http.request).mockRejectedValue(new NotFoundError("Not found"));
    await expect(module.get("nonexistent-id")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("NotFoundError is a subclass of TeardropApiError", async () => {
    vi.mocked(http.request).mockRejectedValue(new NotFoundError());
    await expect(module.get("x")).rejects.toBeInstanceOf(TeardropApiError);
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe("McpModule.update", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: McpModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new McpModule(http);
  });

  it("returns the updated server", async () => {
    const updated = { ...SERVER, is_active: false };
    vi.mocked(http.request).mockResolvedValue(updated);
    const req: UpdateMcpServerRequest = { is_active: false };
    const result = await module.update("srv-1", req);
    expect(result.is_active).toBe(false);
  });

  it("sends only the fields present in the request", async () => {
    vi.mocked(http.request).mockResolvedValue(SERVER);
    const req: UpdateMcpServerRequest = { is_active: false };
    await module.update("srv-1", req);
    expect(http.request).toHaveBeenCalledWith(
      "PATCH",
      "/mcp/servers/srv-1",
      { body: req },
    );
  });

  it("throws NotFoundError for a missing server", async () => {
    vi.mocked(http.request).mockRejectedValue(new NotFoundError());
    await expect(
      module.update("nonexistent-id", { is_active: true }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ValidationError on 422", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new ValidationError("no fields provided"),
    );
    const req: UpdateMcpServerRequest = {};
    await expect(module.update("srv-1", req)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

// ── delete ────────────────────────────────────────────────────────────────────

describe("McpModule.delete", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: McpModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new McpModule(http);
  });

  it("resolves without a value on 204", async () => {
    vi.mocked(http.request).mockResolvedValue(undefined);
    await expect(module.delete("srv-1")).resolves.toBeUndefined();
  });

  it("calls DELETE /mcp/servers/:id", async () => {
    vi.mocked(http.request).mockResolvedValue(undefined);
    await module.delete("srv-1");
    expect(http.request).toHaveBeenCalledWith(
      "DELETE",
      "/mcp/servers/srv-1",
    );
  });

  it("throws NotFoundError when server does not exist", async () => {
    vi.mocked(http.request).mockRejectedValue(new NotFoundError("Not found"));
    await expect(module.delete("nonexistent-id")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

// ── discover ──────────────────────────────────────────────────────────────────

describe("McpModule.discover", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: McpModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new McpModule(http);
  });

  it("returns the discovery response with tools", async () => {
    const discovery: DiscoverMcpToolsResponse = {
      server_id: "srv-1",
      tools: [
        {
          name: "add",
          description: "Adds two numbers",
          input_schema: { type: "object", properties: {} },
        },
      ],
    };
    vi.mocked(http.request).mockResolvedValue(discovery);
    const result = await module.discover("srv-1");
    expect(result.server_id).toBe("srv-1");
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe("add");
  });

  it("calls POST /mcp/servers/:id/discover", async () => {
    vi.mocked(http.request).mockResolvedValue({ server_id: "srv-1", tools: [] });
    await module.discover("srv-1");
    expect(http.request).toHaveBeenCalledWith(
      "POST",
      "/mcp/servers/srv-1/discover",
    );
  });

  it("throws NotFoundError when the server does not exist", async () => {
    vi.mocked(http.request).mockRejectedValue(new NotFoundError("Not found"));
    await expect(module.discover("nonexistent-id")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("throws GatewayError on 504 (MCP server timeout)", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new GatewayError("MCP server timed out", 504),
    );
    await expect(module.discover("srv-1")).rejects.toBeInstanceOf(GatewayError);
  });

  it("throws GatewayError on 502 (MCP server unreachable)", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new GatewayError("MCP server unreachable", 502),
    );
    const err = await module.discover("srv-1").catch((e) => e);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err.message).toContain("unreachable");
  });
});
