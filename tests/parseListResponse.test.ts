/**
 * Tests for parseListResponse — shape-tolerant list-response parser.
 * Mirrors the Python SDK's 8-parameter matrix test for `_parse_list_response`.
 */
import { describe, expect, it } from "vitest";
import { parseListResponse } from "../src/utils/parseListResponse";
import { TeardropApiError } from "../src/errors";

interface TestItem {
  id: string;
}

const ITEM_A: TestItem = { id: "a" };
const ITEM_B: TestItem = { id: "b" };

describe("parseListResponse", () => {
  // ── Bare array ────────────────────────────────────────────────────────────

  it("bare array → items, nextCursor null", () => {
    const result = parseListResponse<TestItem>([ITEM_A, ITEM_B]);
    expect(result.items).toEqual([ITEM_A, ITEM_B]);
    expect(result.nextCursor).toBeNull();
  });

  // ── Named envelope ────────────────────────────────────────────────────────

  it("named envelope with container → items, nextCursor null", () => {
    const result = parseListResponse<TestItem>(
      { tools: [ITEM_A] },
      { container: "tools" },
    );
    expect(result.items).toEqual([ITEM_A]);
    expect(result.nextCursor).toBeNull();
  });

  it("named envelope with items + next_cursor → items, nextCursor propagated", () => {
    const result = parseListResponse<TestItem>(
      { items: [ITEM_A, ITEM_B], next_cursor: "cursor-abc" },
      { container: "items" },
    );
    expect(result.items).toEqual([ITEM_A, ITEM_B]);
    expect(result.nextCursor).toBe("cursor-abc");
  });

  // ── Auto-discover ─────────────────────────────────────────────────────────

  it("auto-discover first array key without container → items", () => {
    const result = parseListResponse<TestItem>({ subscriptions: [ITEM_A] });
    expect(result.items).toEqual([ITEM_A]);
    expect(result.nextCursor).toBeNull();
  });

  // ── Empty shapes ──────────────────────────────────────────────────────────

  it("empty array → empty items, nextCursor null", () => {
    const result = parseListResponse<TestItem>([]);
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("empty envelope → empty items, nextCursor null", () => {
    const result = parseListResponse<TestItem>(
      { tools: [] },
      { container: "tools" },
    );
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  // ── Error shapes ──────────────────────────────────────────────────────────

  it("scalar → throws TeardropApiError", () => {
    expect(() => parseListResponse<TestItem>(42)).toThrow(TeardropApiError);
  });

  it("empty object → throws TeardropApiError", () => {
    expect(() => parseListResponse<TestItem>({})).toThrow(TeardropApiError);
  });

  // ── next_cursor: null ─────────────────────────────────────────────────────

  it("explicit null next_cursor → propagated as null", () => {
    const result = parseListResponse<TestItem>(
      { items: [ITEM_A], next_cursor: null },
      { container: "items" },
    );
    expect(result.nextCursor).toBeNull();
  });
});