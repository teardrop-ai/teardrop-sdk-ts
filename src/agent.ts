import type { HttpTransport } from "./transport";
import type { AgentRunRequest, SseEvent } from "./types";
import { parseSseStream } from "./utils/parseSseStream";

export interface AgentRunOptions {
  signal?: AbortSignal;
  paymentHeader?: string;
}

export class AgentModule {
  constructor(private readonly http: HttpTransport) {}

  /**
   * Stream an agent run, yielding parsed SSE events.
   *
   * @param request - The run request (message, optional thread_id & context).
   * @param options - Optional signal and payment header.
   */
  async *run(
    request: AgentRunRequest,
    options: AgentRunOptions = {},
  ): AsyncIterableIterator<SseEvent> {
    const { signal, paymentHeader } = options;

    const extraHeaders: Record<string, string> = {};
    if (paymentHeader) {
      extraHeaders["X-Payment"] = paymentHeader;
    }

    const body: Record<string, unknown> = { message: request.message };
    if (request.thread_id) body.thread_id = request.thread_id;
    if (request.context) body.context = request.context;
    if (request.emit_ui !== undefined) body.emit_ui = request.emit_ui;

    const resp = await this.http.stream("POST", "/agent/run", {
      body,
      signal,
      headers: extraHeaders,
    });

    yield* parseSseStream(resp, signal);
  }
}
