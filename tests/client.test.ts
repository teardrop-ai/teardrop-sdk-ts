import { afterEach, describe, expect, it, vi } from "vitest";
import { TeardropClient } from "../src/client";
import { LabelingModule } from "../src/labeling";

describe("TeardropClient.health", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the public health endpoint without authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new TeardropClient({
      baseUrl: "https://api.example.com",
      token: "token-value",
    });
    await expect(client.health()).resolves.toEqual({ status: "ok" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/health",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});

describe("TeardropClient.labeling", () => {
  it("wires the labeling resource module", () => {
    const client = new TeardropClient({ baseUrl: "https://api.example.com" });

    expect(client.labeling).toBeInstanceOf(LabelingModule);
  });
});