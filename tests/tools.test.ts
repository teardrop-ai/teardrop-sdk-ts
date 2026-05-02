/**
 * Tests for ToolsModule — CRUD operations on org webhook tools.
 * Mirrors test_custom_tools.py.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  NotFoundError,
  TeardropApiError,
  ValidationError,
} from "../src/errors";
import { ToolsModule } from "../src/tools";
import type { HttpTransport } from "../src/transport";
import type { CreateOrgToolRequest, OrgTool, UpdateOrgToolRequest } from "../src/types";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TOOL: OrgTool = {
  id: "tool-123",
  org_id: "org-abc",
  name: "my_tool",
  description: "Does a thing",
  input_schema: { type: "object", properties: {}, required: [] },
  output_schema: { type: "object", properties: { success: { type: "boolean" } } },
  webhook_url: "https://example.com/hook",
  webhook_method: "POST",
  has_auth: false,
  is_active: true,
  publish_as_mcp: false,
  marketplace_description: null,
  base_price_usdc: null,
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

describe("ToolsModule.create", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: ToolsModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new ToolsModule(http);
  });

  it("returns an OrgTool on success", async () => {
    vi.mocked(http.request).mockResolvedValue(TOOL);
    const req: CreateOrgToolRequest = {
      name: "my_tool",
      description: "Does a thing",
      input_schema: { type: "object", properties: {}, required: [] },
      webhook_url: "https://example.com/hook",
    };
    const result = await module.create(req);
    expect(result.id).toBe("tool-123");
    expect(result.name).toBe("my_tool");
  });

  it("calls POST /tools with the request body", async () => {
    vi.mocked(http.request).mockResolvedValue(TOOL);
    const req: CreateOrgToolRequest = {
      name: "my_tool",
      description: "Does a thing",
      input_schema: {},
      webhook_url: "https://example.com/hook",
    };
    await module.create(req);
    expect(http.request).toHaveBeenCalledWith("POST", "/tools", { body: req });
  });

  it("propagates ValidationError on 422", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new ValidationError("Limit reached"),
    );
    const req: CreateOrgToolRequest = {
      name: "t",
      description: "d",
      input_schema: {},
      webhook_url: "https://example.com",
    };
    await expect(module.create(req)).rejects.toBeInstanceOf(ValidationError);
  });

  it("propagates ConflictError on 409", async () => {
    vi.mocked(http.request).mockRejectedValue(
      new ConflictError("name already exists"),
    );
    const req: CreateOrgToolRequest = {
      name: "dup",
      description: "d",
      input_schema: {},
      webhook_url: "https://example.com",
    };
    await expect(module.create(req)).rejects.toBeInstanceOf(ConflictError);
  });

  it("ConflictError is a subclass of TeardropApiError", async () => {
    vi.mocked(http.request).mockRejectedValue(new ConflictError("conflict"));
    const req: CreateOrgToolRequest = {
      name: "x",
      description: "d",
      input_schema: {},
      webhook_url: "https://example.com",
    };
    await expect(module.create(req)).rejects.toBeInstanceOf(TeardropApiError);
  });
});

// ── list ──────────────────────────────────────────────────────────────────────

describe("ToolsModule.list", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: ToolsModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new ToolsModule(http);
  });

  it("returns a list of OrgTool on success", async () => {
    vi.mocked(http.request).mockResolvedValue([TOOL, TOOL]);
    const result = await module.list();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("tool-123");
  });

  it("returns an empty array when no tools exist", async () => {
    vi.mocked(http.request).mockResolvedValue([]);
    expect(await module.list()).toEqual([]);
  });

  it("calls GET /tools", async () => {
    vi.mocked(http.request).mockResolvedValue([]);
    await module.list();
    expect(http.request).toHaveBeenCalledWith("GET", "/tools");
  });
});

// ── get ───────────────────────────────────────────────────────────────────────

describe("ToolsModule.get", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: ToolsModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new ToolsModule(http);
  });

  it("returns the tool when found", async () => {
    vi.mocked(http.request).mockResolvedValue(TOOL);
    const result = await module.get("tool-123");
    expect(result.id).toBe("tool-123");
  });

  it("throws NotFoundError when not found", async () => {
    vi.mocked(http.request).mockRejectedValue(new NotFoundError("Not found"));
    await expect(module.get("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe("ToolsModule.update", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: ToolsModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new ToolsModule(http);
  });

  it("returns the updated tool", async () => {
    const updated = { ...TOOL, is_active: false };
    vi.mocked(http.request).mockResolvedValue(updated);
    const req: UpdateOrgToolRequest = { is_active: false };
    const result = await module.update("tool-123", req);
    expect(result.is_active).toBe(false);
  });

  it("calls PATCH /tools/:id with the request body", async () => {
    vi.mocked(http.request).mockResolvedValue(TOOL);
    const req: UpdateOrgToolRequest = { description: "new desc" };
    await module.update("tool-123", req);
    expect(http.request).toHaveBeenCalledWith(
      "PATCH",
      "/tools/tool-123",
      { body: req },
    );
  });

  it("throws NotFoundError when the tool does not exist", async () => {
    vi.mocked(http.request).mockRejectedValue(new NotFoundError());
    await expect(
      module.update("missing", { is_active: true }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ── delete ────────────────────────────────────────────────────────────────────

describe("ToolsModule.delete", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: ToolsModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new ToolsModule(http);
  });

  it("resolves without a value on 204", async () => {
    vi.mocked(http.request).mockResolvedValue(undefined);
    await expect(module.delete("tool-123")).resolves.toBeUndefined();
  });

  it("calls DELETE /tools/:id", async () => {
    vi.mocked(http.request).mockResolvedValue(undefined);
    await module.delete("tool-123");
    expect(http.request).toHaveBeenCalledWith("DELETE", "/tools/tool-123");
  });

  it("throws NotFoundError when the tool does not exist", async () => {
    vi.mocked(http.request).mockRejectedValue(new NotFoundError("Not found"));
    await expect(module.delete("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
