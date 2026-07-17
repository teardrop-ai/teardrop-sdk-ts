import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryModule } from "../src/memory";
import type { HttpTransport } from "../src/transport";
import type {
  MemoryListItem,
  MemoryCreatedResponse,
  MemoryDeletedResponse,
  MemoryListResponse,
} from "../src/types";

const ENTRY: MemoryListItem = {
  id: "mem-123",
  content: "User likes coffee",
  source_run_id: "run-456",
  created_at: "2026-01-01T00:00:00Z",
};

const CREATED: MemoryCreatedResponse = {
  id: "mem-123",
  content: "User likes coffee",
  created_at: "2026-01-01T00:00:00Z",
};

const LIST_RESPONSE: MemoryListResponse = {
  items: [ENTRY],
  next_cursor: "page-2",
  total: 1,
};

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

describe("MemoryModule", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let module: MemoryModule;

  beforeEach(() => {
    http = makeMockHttp();
    module = new MemoryModule(http);
  });

  describe("list", () => {
    it("calls GET /memories with original params", async () => {
      vi.mocked(http.request).mockResolvedValue(LIST_RESPONSE);
      const result = await module.list({ limit: 10, cursor: "abc" });
      expect(http.request).toHaveBeenCalledWith("GET", "/memories", {
        params: { limit: 10, cursor: "abc" },
      });
      expect(result).toEqual(LIST_RESPONSE);
    });

    it("works without params", async () => {
      vi.mocked(http.request).mockResolvedValue(LIST_RESPONSE);
      await module.list();
      expect(http.request).toHaveBeenCalledWith("GET", "/memories", {
        params: { limit: undefined, cursor: undefined },
      });
    });
  });

  describe("create", () => {
    it("calls POST /memories", async () => {
      vi.mocked(http.request).mockResolvedValue(CREATED);
      const result = await module.create({ content: "New memory" });
      expect(http.request).toHaveBeenCalledWith("POST", "/memories", {
        body: { content: "New memory" },
      });
      expect(result).toEqual(CREATED);
    });
  });

  describe("delete", () => {
    it("calls DELETE /memories/:id", async () => {
      const mockDeleted: MemoryDeletedResponse = { status: "deleted" };
      vi.mocked(http.request).mockResolvedValue(mockDeleted);
      const result = await module.delete("mem-123");
      expect(result).toEqual(mockDeleted);
      expect(http.request).toHaveBeenCalledWith("DELETE", "/memories/mem-123");
    });
  });
});
