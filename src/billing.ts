import type { HttpTransport } from "./transport";
import type {
  BillingHistoryEntry,
  BillingPricingResponse,
  CreditBalance,
  CreditHistoryEntry,
  Invoice,
  StripeTopupRequest,
  StripeTopupResponse,
  StripeTopupStatusResponse,
  UsdcTopupRequest,
  UsdcTopupRequirements,
} from "./types";

export class BillingModule {
  constructor(private readonly http: HttpTransport) {}

  /** Tool pricing table (no auth required). */
  async pricing(): Promise<BillingPricingResponse> {
    return this.http.request<BillingPricingResponse>("GET", "/billing/pricing", {
      auth: false,
    });
  }

  /** Org credit balance. */
  async balance(): Promise<CreditBalance> {
    return this.http.request<CreditBalance>("GET", "/billing/balance");
  }

  /** Run billing history (flat array). */
  async history(params?: { limit?: number }): Promise<BillingHistoryEntry[]> {
    return this.http.request<BillingHistoryEntry[]>("GET", "/billing/history", {
      params: { limit: params?.limit },
    });
  }

  /** Invoice list. */
  async invoices(params?: { limit?: number }): Promise<Invoice[]> {
    return this.http.request<Invoice[]>("GET", "/billing/invoices", {
      params: { limit: params?.limit },
    });
  }

  /** Single run invoice. */
  async invoice(runId: string): Promise<Invoice> {
    return this.http.request<Invoice>(
      "GET",
      `/billing/invoice/${encodeURIComponent(runId)}`,
    );
  }

  /** Credit topup history. */
  async creditHistory(params?: {
    limit?: number;
    operation?: "debit" | "topup";
  }): Promise<CreditHistoryEntry[]> {
    return this.http.request<CreditHistoryEntry[]>(
      "GET",
      "/billing/credit-history",
      { params: { limit: params?.limit, operation: params?.operation } },
    );
  }

  /** Start a Stripe checkout session. */
  async topupStripe(data: StripeTopupRequest): Promise<StripeTopupResponse> {
    return this.http.request<StripeTopupResponse>(
      "POST",
      "/billing/topup/stripe",
      { body: data },
    );
  }

  /** Check Stripe checkout session status. */
  async topupStripeStatus(sessionId: string): Promise<StripeTopupStatusResponse> {
    return this.http.request<StripeTopupStatusResponse>(
      "GET",
      "/billing/topup/stripe/status",
      { params: { session_id: sessionId } },
    );
  }

  /** USDC topup parameters. */
  async topupUsdcRequirements(amountUsdc: number): Promise<UsdcTopupRequirements> {
    return this.http.request<UsdcTopupRequirements>(
      "GET",
      "/billing/topup/usdc/requirements",
      { params: { amount_usdc: amountUsdc } },
    );
  }

  /** Submit on-chain USDC topup. */
  async topupUsdc(
    data: UsdcTopupRequest,
  ): Promise<{ credited_usdc: number }> {
    return this.http.request<{ credited_usdc: number }>(
      "POST",
      "/billing/topup/usdc",
      { body: data },
    );
  }
}
