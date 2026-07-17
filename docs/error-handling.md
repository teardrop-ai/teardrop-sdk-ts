# Error Handling — Exception Hierarchy and Retry Patterns

**All `teardrop-sdk` exceptions inherit from `TeardropError`, mapped 1:1 to HTTP status codes.**

**Module:** cross-cutting (all resource modules)

```typescript
import {
  TeardropError,
  AuthenticationError,    // 401
  PaymentRequiredError,   // 402 — .requirements, .accepts, .paymentHeader
  ForbiddenError,         // 403
  NotFoundError,          // 404
  ConflictError,          // 409
  ValidationError,        // 422
  RateLimitError,         // 429 — .retryAfter (seconds)
  GatewayError,           // 502 / 504
  TeardropApiError,       // all other non-2xx
} from "teardrop-sdk";

try {
  for await (const event of client.agent.run({ message: "..." })) { ... }
} catch (e) {
  if (e instanceof RateLimitError) {
    await new Promise(r => setTimeout(r, e.retryAfter * 1000));
  }
}
```

---

**See also:** [Agent Runs](agent-runs.md) for `PaymentRequiredError` retry-with-payment
flow · [Marketplace](marketplace.md) for `PaymentRequiredError` during subscribed tool
calls · [../README.md](../README.md)
