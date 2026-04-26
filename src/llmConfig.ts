import type { HttpTransport } from "./transport";
import type {
  OrgLlmConfig,
  SetLlmConfigRequest,
  MODELS_BY_PROVIDER,
} from "./types";
import { MODELS_BY_PROVIDER as MODELS } from "./types";

export class LlmModule {
  constructor(private readonly http: HttpTransport) {}

  /** Get the org's current LLM configuration. */
  async get(): Promise<OrgLlmConfig> {
    return this.http.request<OrgLlmConfig>("GET", "/llm-config");
  }

  /** Create or update the org's LLM configuration. */
  async set(data: SetLlmConfigRequest): Promise<OrgLlmConfig> {
    // Strip `undefined` to preserve existing server-side values, but keep
    // explicit `null` so the backend can distinguish "omit" from "clear BYOK".
    // `JSON.stringify` preserves `null`, so no custom replacer is needed.
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) body[k] = v;
    }
    return this.http.request<OrgLlmConfig>("PUT", "/llm-config", { body });
  }

  /**
   * Remove the BYOK API key while preserving all other LLM config fields.
   * Explicitly sends `api_key: null` so the backend reverts to the shared
   * platform key. Convenience wrapper for clients that strip `null` values
   * before JSON serialisation (mirrors Python `clear_llm_api_key()`).
   */
  async clearApiKey(
    data: Omit<SetLlmConfigRequest, "api_key">,
  ): Promise<OrgLlmConfig> {
    return this.set({ ...data, api_key: null });
  }

  /** Delete the org's custom LLM config (revert to global default). */
  async reset(): Promise<void> {
    await this.http.request("DELETE", "/llm-config");
  }

  /** Return the list of supported LLM providers (client-side constant). */
  listSupportedProviders(): string[] {
    return Object.keys(MODELS);
  }

  /** Return known model identifiers for a provider (client-side constant). */
  listModelsForProvider(provider: string): string[] {
    const models = MODELS[provider];
    if (!models) {
      throw new Error(
        `Unknown provider "${provider}". Supported: ${Object.keys(MODELS).join(", ")}`,
      );
    }
    return [...models];
  }
}
