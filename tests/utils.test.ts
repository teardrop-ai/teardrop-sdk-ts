/**
 * Tests for utility functions: parseMcpToolName, parseMarketplaceToolName,
 * formatUsdc, and parseUsdc.
 * Mirrors TestParseMcpToolName in test_mcp_servers.py.
 */
import { describe, expect, it } from "vitest";
import { formatUsdc, parseUsdc } from "../src/utils/atomicUsdc";
import { parseMarketplaceToolName } from "../src/utils/parseMarketplaceToolName";
import { parseMcpToolName } from "../src/utils/parseMcpToolName";

// ── parseMcpToolName ──────────────────────────────────────────────────────────

describe("parseMcpToolName", () => {
  it("parses a valid MCP tool name", () => {
    const result = parseMcpToolName("my_server__web_search");
    expect(result.isMcp).toBe(true);
    if (result.isMcp) {
      expect(result.serverName).toBe("my_server");
      expect(result.toolName).toBe("web_search");
    }
  });

  it("returns isMcp=false when there is no __ separator", () => {
    expect(parseMcpToolName("web_search").isMcp).toBe(false);
  });

  it("treats a single underscore as not a separator", () => {
    expect(parseMcpToolName("web_search_v2").isMcp).toBe(false);
  });

  it("returns isMcp=false when __ is at the start (empty server name)", () => {
    // The separator must be preceded by at least one character
    expect(parseMcpToolName("__web_search").isMcp).toBe(false);
  });

  it("handles a tool name that contains underscores", () => {
    const result = parseMcpToolName("my_server__add_two_numbers");
    expect(result.isMcp).toBe(true);
    if (result.isMcp) {
      expect(result.serverName).toBe("my_server");
      expect(result.toolName).toBe("add_two_numbers");
    }
  });

  it("handles a server name that contains underscores", () => {
    const result = parseMcpToolName("my_cool_server__do_thing");
    expect(result.isMcp).toBe(true);
    if (result.isMcp) {
      expect(result.serverName).toBe("my_cool_server");
      expect(result.toolName).toBe("do_thing");
    }
  });

  it("uses the FIRST __ occurrence as the separator", () => {
    // Everything after the first __ is the tool name (may itself contain __)
    const result = parseMcpToolName("srv__tool__extra");
    expect(result.isMcp).toBe(true);
    if (result.isMcp) {
      expect(result.serverName).toBe("srv");
      expect(result.toolName).toBe("tool__extra");
    }
  });

  it("returns isMcp=false for an empty string", () => {
    expect(parseMcpToolName("").isMcp).toBe(false);
  });
});

// ── parseMarketplaceToolName ──────────────────────────────────────────────────

describe("parseMarketplaceToolName", () => {
  it("parses a valid qualified tool name", () => {
    const result = parseMarketplaceToolName("acme/web_search");
    expect(result.orgSlug).toBe("acme");
    expect(result.toolName).toBe("web_search");
  });

  it("handles org slugs with hyphens", () => {
    const result = parseMarketplaceToolName("my-org/some_tool");
    expect(result.orgSlug).toBe("my-org");
    expect(result.toolName).toBe("some_tool");
  });

  it("throws when there is no / separator", () => {
    expect(() => parseMarketplaceToolName("no_slash_tool")).toThrow();
  });

  it("throws when the / is at the start (empty org slug)", () => {
    expect(() => parseMarketplaceToolName("/tool_name")).toThrow();
  });

  it("uses the first / as separator — tool name may contain /", () => {
    const result = parseMarketplaceToolName("acme/nested/tool");
    expect(result.orgSlug).toBe("acme");
    expect(result.toolName).toBe("nested/tool");
  });
});

// ── formatUsdc ───────────────────────────────────────────────────────────────

describe("formatUsdc", () => {
  it("formats whole dollars correctly", () => {
    expect(formatUsdc(5_000_000)).toBe("5.000000");
  });

  it("formats fractional amounts correctly", () => {
    expect(formatUsdc(1_500_000)).toBe("1.500000");
  });

  it("formats small amounts correctly", () => {
    expect(formatUsdc(50)).toBe("0.000050");
  });

  it("formats zero", () => {
    expect(formatUsdc(0)).toBe("0.000000");
  });

  it("always produces 6 decimal places", () => {
    const parts = formatUsdc(1_000_001).split(".");
    expect(parts[1]).toHaveLength(6);
  });
});

// ── parseUsdc ────────────────────────────────────────────────────────────────

describe("parseUsdc", () => {
  it("converts a dollar string to atomic units", () => {
    expect(parseUsdc("1.50")).toBe(1_500_000);
  });

  it("converts a dollar number to atomic units", () => {
    expect(parseUsdc(1.5)).toBe(1_500_000);
  });

  it("converts zero", () => {
    expect(parseUsdc(0)).toBe(0);
  });

  it("is the inverse of formatUsdc for round-trip values", () => {
    const atomic = 12_345_678;
    expect(parseUsdc(formatUsdc(atomic))).toBe(atomic);
  });

  it("rounds to nearest integer", () => {
    // 0.000001 USDC == 1 atomic unit (minimal denomination)
    expect(parseUsdc("0.000001")).toBe(1);
  });
});
