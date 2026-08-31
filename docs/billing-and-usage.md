# Billing & Usage — Balance, Invoices, Top-ups, and Usage Summaries

**Track org credit balance, pricing, invoice history, Stripe/USDC top-ups, and per-run usage.**

**Module:** `client.billing`, `client.usage`

## Balance

```typescript
const balance = await client.billing.balance();
// → { org_id, balance_usdc, spending_limit_usdc, is_paused, daily_spend_usdc }
```

USDC amounts are in atomic units (6 decimals). Use `formatUsdc()` / `parseUsdc()` helpers:

```typescript
import { formatUsdc, parseUsdc } from "teardrop-sdk";

formatUsdc(5_000_000);  // → "5.000000"
parseUsdc("1.50");      // → 1500000
```

## Pricing

```typescript
const pricing = await client.billing.pricing();  // no auth required
console.log(pricing.billing_enabled, pricing.network);
console.log(pricing.pricing?.name, pricing.pricing?.run_price_usdc);
```

When billing is disabled or no pricing rule is configured, `pricing.pricing` is
`null` or omitted.

## Billing History & Invoices

```typescript
const history = await client.billing.history({ limit: 50 });
const invoices = await client.billing.invoices({ limit: 20 });
const invoice = await client.billing.invoice(runId);
// → { run_id, tokens_in, tokens_out, tool_calls, total_usdc, settled_at }

const credits = await client.billing.creditHistory({ operation: "topup" });
// → { items: [{ id, amount_usdc, operation, balance_usdc_after, reason, created_at }, ...], next_cursor }
```

## Stripe Top-up

```typescript
const resp = await client.billing.topupStripe({
  amount_cents: 1000,                            // $10.00 in cents
  return_url: "https://app.example.com/billing",
});
// resp.client_secret — pass to Stripe.js to confirm payment
// resp.session_id   — use to poll status

const status = await client.billing.topupStripeStatus(resp.session_id);
// → { status: "complete" | "open" | "expired", new_balance_fmt: "$15.00" }
```

## USDC Top-up (on-chain x402)

```typescript
// Fetch payment requirements for a given amount
const reqs = await client.billing.topupUsdcRequirements(5_000_000);
// → { accepts: [...], x402Version: 2 }

const result = await client.billing.topupUsdc({
  amount_usdc: 5_000_000,
  payment_header: "...",   // x402 payment header value
});
```

## Usage Summary

```typescript
const summary = await client.usage.me({
  start: "2026-04-01",
  end: "2026-04-30",
});
// → { total_runs, total_tokens_in, total_tokens_out, total_tool_calls, total_duration_ms }
```

## Principal Spend Limits

Per-principal daily spend limits cap how much a principal (user or credential)
can spend per day:

```typescript
// List all principal spend limits
const limits = await client.billing.spendLimits();
// → PrincipalSpendLimitResponse[]

// Create or update a principal's daily limit (atomic USDC)
const limit = await client.billing.setSpendLimit("principal-id", {
  daily_limit_usdc: 5_000_000,   // $5.00
  is_paused: false,
});
// → { principal_id, daily_limit_usdc, is_paused, created_at, updated_at }

// Remove the limit
await client.billing.deleteSpendLimit("principal-id");
```

---

**See also:** [Marketplace](marketplace.md) for author earnings/withdrawals (a separate
balance from org billing) · [Error Handling](error-handling.md) for `PaymentRequiredError`
· [../README.md](../README.md)
