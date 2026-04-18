/** Base exception for all Teardrop SDK errors. */
export class TeardropError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeardropError";
  }
}

/** Raised on non-2xx API responses. */
export class TeardropApiError extends TeardropError {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "TeardropApiError";
  }
}

/** 401 Unauthorized. */
export class AuthenticationError extends TeardropApiError {
  constructor(message = "Authentication failed") {
    super(401, "UNAUTHORIZED", message);
    this.name = "AuthenticationError";
  }
}

/** 402 Payment Required — x402 billing gate. */
export class PaymentRequiredError extends TeardropApiError {
  public readonly requirements: Record<string, unknown>;
  public readonly accepts: Record<string, unknown>[];
  public readonly paymentHeader: string;

  constructor(
    message = "Payment required",
    opts: {
      requirements?: Record<string, unknown>;
      accepts?: Record<string, unknown>[];
      paymentHeader?: string;
    } = {},
  ) {
    super(402, "PAYMENT_REQUIRED", message);
    this.name = "PaymentRequiredError";
    this.requirements = opts.requirements ?? {};
    this.accepts = opts.accepts ?? [];
    this.paymentHeader = opts.paymentHeader ?? "";
  }
}

/** 403 Forbidden. */
export class ForbiddenError extends TeardropApiError {
  constructor(message = "Forbidden") {
    super(403, "FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

/** 404 Not Found. */
export class NotFoundError extends TeardropApiError {
  constructor(message = "Not found") {
    super(404, "NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

/** 409 Conflict. */
export class ConflictError extends TeardropApiError {
  constructor(message = "Conflict") {
    super(409, "CONFLICT", message);
    this.name = "ConflictError";
  }
}

/** 422 Validation Error. */
export class ValidationError extends TeardropApiError {
  constructor(message = "Validation error") {
    super(422, "VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}

/** 429 Rate Limit Exceeded. */
export class RateLimitError extends TeardropApiError {
  public readonly retryAfter: number;

  constructor(message = "Rate limit exceeded", retryAfter = 60) {
    super(429, "RATE_LIMITED", message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/** 502 / 504 Bad Gateway. */
export class GatewayError extends TeardropApiError {
  constructor(message = "Bad gateway", status = 502) {
    super(status, "GATEWAY_ERROR", message);
    this.name = "GatewayError";
  }
}
