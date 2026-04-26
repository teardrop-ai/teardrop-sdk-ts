/**
 * Tests for CredentialsModule.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpTransport } from "../src/transport";
import { CredentialsModule } from "../src/credentials";
import type { OrgCredentialsEntry, RegenerateCredentialsResponse } from "../src/types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("CredentialsModule", () => {
  let transport: HttpTransport;
  let credentials: CredentialsModule;

  beforeEach(() => {
    transport = new HttpTransport({ baseUrl: "http://test" });
    transport.setToken("test-token");
    credentials = new CredentialsModule(transport);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("list()", () => {
    it("returns credentials array from response envelope", async () => {
      const mockEntries: OrgCredentialsEntry[] = [
        { client_id: "cid-1", created_at: "2025-01-01T00:00:00Z" },
        { client_id: "cid-2", created_at: "2025-02-01T00:00:00Z" },
      ];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ credentials: mockEntries })),
      );

      const result = await credentials.list();
      expect(result).toEqual(mockEntries);
      expect(result).toHaveLength(2);
    });

    it("calls GET /org/credentials", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ credentials: [] }));
      vi.stubGlobal("fetch", mockFetch);

      await credentials.list();

      const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/org/credentials");
      expect((opts as RequestInit & { method?: string }).method).toBe("GET");
    });

    it("returns empty array when no credentials exist", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ credentials: [] })),
      );

      const result = await credentials.list();
      expect(result).toEqual([]);
    });
  });

  describe("regenerate()", () => {
    it("returns new credentials including client_secret", async () => {
      const mockResponse: RegenerateCredentialsResponse = {
        client_id: "new-cid",
        client_secret: "super-secret-value",
        created_at: "2025-06-01T00:00:00Z",
      };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(mockResponse)),
      );

      const result = await credentials.regenerate();
      expect(result.client_id).toBe("new-cid");
      expect(result.client_secret).toBe("super-secret-value");
      expect(result.created_at).toBe("2025-06-01T00:00:00Z");
    });

    it("calls POST /org/credentials/regenerate", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        jsonResponse({
          client_id: "cid",
          client_secret: "secret",
          created_at: "2025-01-01T00:00:00Z",
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      await credentials.regenerate();

      const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/org/credentials/regenerate");
      expect((opts as RequestInit & { method?: string }).method).toBe("POST");
    });
  });
});
