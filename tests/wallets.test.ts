/**
 * Tests for WalletsModule — list endpoint using parseListResponse.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletsModule } from "../src/wallets";
import type { HttpTransport } from "../src/transport";
import type { Wallet } from "../src/types";

function makeMockHttp() {
  return {
    request: vi.fn(),
    stream: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn(),
  } as unknown as HttpTransport;
}

describe("WalletsModule.list", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let wallets: WalletsModule;

  beforeEach(() => {
    http = makeMockHttp();
    wallets = new WalletsModule(http);
  });

  it("accepts bare array", async () => {
    const items: Wallet[] = [
      {
        id: "w-1",
        org_id: "org-1",
        user_id: "u-1",
        address: "0xabc",
        chain_id: 8453,
        is_primary: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    vi.mocked(http.request).mockResolvedValue(items);
    const result = await wallets.list();
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe("0xabc");
  });

  it("returns empty array when no wallets", async () => {
    vi.mocked(http.request).mockResolvedValue([]);
    const result = await wallets.list();
    expect(result).toEqual([]);
  });
});

describe("WalletsModule.delete", () => {
  let http: ReturnType<typeof makeMockHttp>;
  let wallets: WalletsModule;

  beforeEach(() => {
    http = makeMockHttp();
    wallets = new WalletsModule(http);
  });

  it("sends DELETE on /wallets/:id and returns status deleted", async () => {
    vi.mocked(http.request).mockResolvedValue({ status: "deleted" });
    const result = await wallets.delete("w-123");
    expect(result).toEqual({ status: "deleted" });
    expect(http.request).toHaveBeenCalledWith("DELETE", "/wallets/w-123");
  });
});