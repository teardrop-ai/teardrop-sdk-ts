import { HttpTransport } from "./transport";
import { AuthModule } from "./auth";
import { AgentModule } from "./agent";
import { CredentialsModule } from "./credentials";
import { ToolsModule } from "./tools";
import { McpModule } from "./mcp";
import { MemoryModule } from "./memory";
import { WalletsModule } from "./wallets";
import { AgentWalletsModule } from "./agentWallets";
import { BillingModule } from "./billing";
import { UsageModule } from "./usage";
import { MarketplaceModule } from "./marketplace";
import { LlmModule } from "./llmConfig";
import { ModelsModule } from "./models";
import { A2AModule } from "./a2a";
import type { AgentCard } from "./types";

export interface TeardropClientOptions {
  /** API base URL, e.g. "https://api.teardrop.dev" */
  baseUrl: string;
  /** Email for automatic token acquisition and refresh. Pair with `secret`. */
  email?: string;
  /** Password for automatic token acquisition and refresh. Pair with `email`. */
  secret?: string;
  /** OAuth2 client ID for M2M automatic token acquisition. Pair with `client_secret`. */
  client_id?: string;
  /** OAuth2 client secret for M2M automatic token acquisition. Pair with `client_id`. */
  client_secret?: string;
  /** Pre-authenticated JWT token. Takes precedence over email/secret credentials. */
  token?: string;
  /** HTTP request timeout in milliseconds (default: 120000). */
  timeout?: number;
}

/**
 * Root client for the Teardrop API.
 *
 * Pass `email` + `secret` (or `client_id` + `client_secret`) to enable
 * automatic token acquisition and silent refresh. Alternatively provide a
 * pre-authenticated `token`, or call `auth.login()` manually.
 *
 * All resource modules are accessed as sub-namespaces:
 *
 * ```ts
 * const client = new TeardropClient({
 *   baseUrl: "https://api.teardrop.dev",
 *   email: "you@example.com",
 *   secret: "your-password",
 * });
 * for await (const event of client.agent.run({ message: "Hello!" })) { ... }
 * ```
 */
export class TeardropClient {
  private readonly http: HttpTransport;

  readonly auth: AuthModule;
  readonly agent: AgentModule;
  readonly credentials: CredentialsModule;
  readonly tools: ToolsModule;
  readonly mcp: McpModule;
  readonly memory: MemoryModule;
  readonly wallets: WalletsModule;
  readonly agentWallets: AgentWalletsModule;
  readonly billing: BillingModule;
  readonly usage: UsageModule;
  readonly marketplace: MarketplaceModule;
  readonly llm: LlmModule;
  readonly models: ModelsModule;
  readonly a2a: A2AModule;

  constructor(opts: TeardropClientOptions) {
    this.http = new HttpTransport({
      baseUrl: opts.baseUrl,
      timeout: opts.timeout,
      email: opts.email,
      secret: opts.secret,
      client_id: opts.client_id,
      client_secret: opts.client_secret,
      token: opts.token,
    });

    this.auth = new AuthModule(this.http);
    this.agent = new AgentModule(this.http);
    this.credentials = new CredentialsModule(this.http);
    this.tools = new ToolsModule(this.http);
    this.mcp = new McpModule(this.http);
    this.memory = new MemoryModule(this.http);
    this.wallets = new WalletsModule(this.http);
    this.agentWallets = new AgentWalletsModule(this.http);
    this.billing = new BillingModule(this.http);
    this.usage = new UsageModule(this.http);
    this.marketplace = new MarketplaceModule(this.http);
    this.llm = new LlmModule(this.http);
    this.models = new ModelsModule(this.http);
    this.a2a = new A2AModule(this.http);
  }

  /** Set the Bearer JWT token for authenticated requests. */
  setToken(token: string): void {
    this.http.setToken(token);
  }

  /** Get the current JWT token, if set. */
  getToken(): string | undefined {
    return this.http.getToken();
  }

  /**
   * Fetch the A2A agent card from `/.well-known/agent-card.json`.
   * Result is cached for 5 minutes by the server; call this to pre-warm
   * connectivity at startup.
   */
  async getAgentCard(): Promise<AgentCard> {
    return this.http.request<AgentCard>(
      "GET",
      "/.well-known/agent-card.json",
      { auth: false },
    );
  }

  /**
   * Create a client and eagerly fetch the agent card for zero-config setup.
   * Surfaces connectivity and misconfiguration errors at construction time
   * rather than silently on the first `agent.run()` call.
   *
   * ```ts
   * const client = await TeardropClient.fromAgentCard({
   *   baseUrl: "https://api.teardrop.dev",
   *   email: "you@example.com",
   *   secret: "your-password",
   * });
   * ```
   */
  static async fromAgentCard(opts: TeardropClientOptions): Promise<TeardropClient> {
    const client = new TeardropClient(opts);
    await client.getAgentCard();
    return client;
  }
}
