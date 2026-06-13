import { TeardropApiError } from "../errors";

/**
 * Shape-tolerant list-response parser.
 *
 * Accepts bare arrays, named envelopes, and auto-discovered keys —
 * matching the Python SDK's `_parse_list_response` helper.
 *
 * Returns a normalized `{ items, nextCursor }` so callers can either
 * use the cursor-paginated form or discard `nextCursor` and return `T[]`.
 *
 * @throws {TeardropApiError} when the shape is unrecognizable.
 */
export function parseListResponse<T>(
  data: unknown,
  opts?: { container?: string },
): { items: T[]; nextCursor: string | null } {
  // ── Bare array ────────────────────────────────────────────────────────
  if (Array.isArray(data)) {
    return { items: data as T[], nextCursor: null };
  }

  if (data === null || data === undefined || typeof data !== "object") {
    throw createShapeError(data);
  }

  const obj = data as Record<string, unknown>;

  // ── Named container key ───────────────────────────────────────────────
  const key = opts?.container ?? discoverKey(obj);
  if (!key) {
    throw createShapeError(data);
  }

  const value = obj[key];
  if (!Array.isArray(value)) {
    throw createShapeError(data);
  }

  // ── Propagate next_cursor if present ──────────────────────────────────
  const nextCursor =
    typeof obj.next_cursor === "string" || obj.next_cursor === null
      ? (obj.next_cursor as string | null)
      : null;

  return { items: value as T[], nextCursor };
}

/**
 * Find the first key in an object whose value is an array.
 * Returns `undefined` if no array-valued key exists.
 */
function discoverKey(obj: Record<string, unknown>): string | undefined {
  for (const k of Object.keys(obj)) {
    if (Array.isArray(obj[k])) return k;
  }
  return undefined;
}

function createShapeError(data: unknown): TeardropApiError {
  return new TeardropApiError(
    500,
    "UNEXPECTED_SHAPE",
    `List response has an unrecognizable shape (expected array or envelope with array key, got ${typeof data})`,
    data,
  );
}