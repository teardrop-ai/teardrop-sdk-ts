import type { HttpTransport } from "./transport";
import type {
  BillingHistoryEntry,
  BillingPricingResponse,
  CreditBalance,
  CreditHistoryEntry,
  CreditHistoryResponse,
  Invoice,
  InvoiceListResponse,
  PrincipalSpendLimitRequest,
  PrincipalSpendLimitResponse,
  StripeTopupRequest,
  StripeTopupResponse,
  StripeTopupStatusResponse,
  UsdcTopupRequest,
  UsdcTopupRequirements,
  UsdcTopupResponse,
} from "./types";
import { parseListResponse } from "./utils/parseListResponse";

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

  /** Run billing history (tolerates both bare array and envelope). */
  async history(params?: { limit?: number }): Promise<BillingHistoryEntry[]> {
    const data = await this.http.request<unknown>(
      "GET",
      "/billing/history",
      { params: { limit: params?.limit } },
    );
    return parseListResponse<BillingHistoryEntry>(data).items;
  }

  /** Invoice list (cursor-paginated). */
  async invoices(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<InvoiceListResponse> {
    const data = await this.http.request<unknown>(
      "GET",
      "/billing/invoices",
      { params: { limit: params?.limit, cursor: params?.cursor } },
    );
    const parsed = parseListResponse<Invoice>(data, { container: "items" });
    return { items: parsed.items, next_cursor: parsed.nextCursor };
  }

  /** Single run invoice. */
  async invoice(runId: string): Promise<Invoice> {
    return this.http.request<Invoice>(
      "GET",
      `/billing/invoice/${encodeURIComponent(runId)}`,
    );
  }

  /** Credit topup history (cursor-paginated). */
  async creditHistory(params?: {
    limit?: number;
    cursor?: string;
    operation?: "debit" | "topup";
  }): Promise<CreditHistoryResponse> {
    const data = await this.http.request<unknown>(
      "GET",
      "/billing/credit-history",
      {
        params: {
          limit: params?.limit,
          cursor: params?.cursor,
          operation: params?.operation,
        },
      },
    );
    const parsed = parseListResponse<CreditHistoryEntry>(data, {
      container: "items",
    });
    return { items: parsed.items, next_cursor: parsed.nextCursor };
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
  ): Promise<UsdcTopupResponse> {
    return this.http.request<UsdcTopupResponse>(
      "POST",
      "/billing/topup/usdc",
      { body: data },
    );
  }

  /** List per-principal daily spend limits. */
  async spendLimits(): Promise<PrincipalSpendLimitResponse[]> {
    const data = await this.http.request<unknown>(
      "GET",
      "/org/principals/spend-limits",
    );
    return parseListResponse<PrincipalSpendLimitResponse>(data).items;
  }

  /** Create or update a principal's daily spend limit. */
  async setSpendLimit(
    principalId: string,
    data: PrincipalSpendLimitRequest,
  ): Promise<PrincipalSpendLimitResponse> {
    return this.http.request<PrincipalSpendLimitResponse>(
      "PUT",
      `/org/principals/${encodeURIComponent(principalId)}/spend-limit`,
      { body: data },
    );
  }

  /** Remove a principal's daily spend limit. */
  async deleteSpendLimit(principalId: string): Promise<void> {
    await this.http.request<void>(
      "DELETE",
      `/org/principals/${encodeURIComponent(principalId)}/spend-limit`,
    );
  }
}
