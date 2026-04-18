import type { SseEvent } from "../types";

/**
 * Parse an SSE byte stream from a `fetch` Response into typed SseEvent objects.
 *
 * Handles the Teardrop server format where the event type is embedded inside
 * the JSON data payload:
 *
 *   data: {"event": "TYPE", "data": { ... }}\n\n
 *
 * Also supports standard SSE framing as a fallback.
 */
export async function* parseSseStream(
  response: Response,
  signal?: AbortSignal,
): AsyncIterableIterator<SseEvent> {
  const body = response.body;
  if (!body) return;

  const reader = body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let eventType = "";
  let eventId = "";
  let retryMs: number | undefined;
  let dataBuf: string[] = [];

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      // Keep the last partial line in the buffer
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, "");

        if (line.startsWith(":")) {
          // SSE comment / heartbeat — ignore per spec
          continue;
        } else if (line.startsWith("event:")) {
          eventType = line.slice(6).trimStart();
        } else if (line.startsWith("id:")) {
          eventId = line.slice(3).trimStart();
        } else if (line.startsWith("retry:")) {
          const raw = line.slice(6).trimStart();
          const n = parseInt(raw, 10);
          if (!isNaN(n)) retryMs = n;
        } else if (line.startsWith("data:")) {
          dataBuf.push(line.slice(5).trimStart());
        } else if (line === "") {
          // Empty line = end of event block
          if (eventType || dataBuf.length > 0) {
            yield buildEvent(eventType, eventId, retryMs, dataBuf);
          }
          eventType = "";
          eventId = "";
          retryMs = undefined;
          dataBuf = [];
        }
      }
    }

    // Flush any trailing event without a final blank line
    if (eventType || dataBuf.length > 0) {
      yield buildEvent(eventType, eventId, retryMs, dataBuf);
    }
  } finally {
    reader.releaseLock();
  }
}

function buildEvent(
  sseEventType: string,
  _eventId: string,
  _retryMs: number | undefined,
  dataBuf: string[],
): SseEvent {
  let data: Record<string, unknown> = {};
  let eventName: string = sseEventType;

  if (dataBuf.length > 0) {
    const dataStr = dataBuf.join("\n");
    if (dataStr && (dataStr[0] === "{" || dataStr[0] === "[")) {
      try {
        const parsed = JSON.parse(dataStr);
        if (typeof parsed === "object" && parsed !== null && "event" in parsed) {
          eventName = parsed.event ?? sseEventType;
          const inner = parsed.data;
          data =
            typeof inner === "object" && inner !== null && !Array.isArray(inner)
              ? inner
              : { value: inner };
        } else if (
          typeof parsed === "object" &&
          parsed !== null &&
          !Array.isArray(parsed)
        ) {
          data = parsed;
        } else {
          data = { value: parsed };
        }
      } catch {
        data = { raw: dataStr };
      }
    } else if (dataStr) {
      data = { raw: dataStr };
    }
  }

  return { event: eventName || "message", data } as SseEvent;
}

/**
 * Collect all TEXT_MESSAGE_CONTENT deltas from an async SSE event stream
 * and return the concatenated text.
 */
export async function collectText(
  events: AsyncIterable<SseEvent>,
): Promise<string> {
  const parts: string[] = [];
  for await (const event of events) {
    if (event.event === "TEXT_MESSAGE_CONTENT") {
      parts.push((event.data as { delta?: string }).delta ?? "");
    }
  }
  return parts.join("");
}

/**
 * Collect all TEXT_MESSAGE_CONTENT deltas from a synchronous array of events.
 */
export function collectTextSync(events: SseEvent[]): string {
  return events
    .filter((e) => e.event === "TEXT_MESSAGE_CONTENT")
    .map((e) => (e.data as { delta?: string }).delta ?? "")
    .join("");
}
