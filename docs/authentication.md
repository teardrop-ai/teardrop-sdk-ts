# Authentication — Login, Registration, and Org Credentials

**Credentials, tokens, invites, and machine-to-machine API keys for `teardrop-sdk`.**

**Module:** `client.auth`, `client.credentials`

Credentials are passed to the `TeardropClient` constructor. The `TokenManager`
acquires a JWT automatically on the first request and refreshes it before
expiry (5-minute pre-expiry window).

| Method | Constructor / call |
|--------|-------------------|
| Email + password | `email: "...", secret: "..."` |
| Client credentials (M2M) | `client_id: "...", client_secret: "..."` |
| Pre-authenticated static token | `token: "..."` |
| SIWE (Sign-In with Ethereum) | Call `client.auth.login({ siwe_message, siwe_signature })` |

## SIWE Login Flow

```typescript
// 1. Fetch a single-use nonce
const { nonce } = await client.auth.siweNonce();

// 2. Build and sign an EIP-4361 message client-side
const message = buildSiweMessage({ nonce, ... });
const signature = wallet.signMessage(message);

// 3. Exchange for a JWT — stored automatically for subsequent calls
await client.auth.login({ siwe_message: message, siwe_signature: signature });
```

## Email Registration

```typescript
const tokens = await client.auth.register({
  org_name: "My Company",
  email: "you@example.com",
  password: "...",
  // optional: attribution source (max 64 chars)
  acquisition_source: "docs",
});
```

## Invite-based Registration

```typescript
// Org admin creates an invite link (roles: "member" or "user")
const invite = await client.auth.invite({ email: "colleague@example.com", role: "member" });
// → { token, invite_url, expires_at }

// Invitee registers
await client.auth.registerInvite({ token: invite.token, email: "...", password: "..." });
```

## Verify Email

```typescript
// Verify email before first login
await client.auth.verifyEmail(emailToken);

// Resend verification email
await client.auth.resendVerification("you@example.com");
```

## Token Refresh / Logout

```typescript
const newTokens = await client.auth.refresh(refreshToken);
await client.auth.logout(refreshToken);
```

## Inspect Identity

```typescript
const me = await client.auth.me();
// → { sub, user_id, org_id, org_name, org_slug, role, auth_method, email, ... }
```

## x402 Payment-First Bootstrap

Pay to create an org and receive a JWT plus a one-time client credential.
Resolve the x402 payment challenge externally, then pass the signed payment
header:

```typescript
import { PaymentRequiredError } from "teardrop-sdk";

// 1. Attempt a call that requires payment, catch the challenge
try {
  for await (const _event of client.agent.run({ message: "..." })) {
    // Consume the stream until the payment challenge is raised.
  }
} catch (e) {
  if (e instanceof PaymentRequiredError) {
    // 2. Sign the payment externally using e.paymentHeader
    const signed = await signX402Payment(e.paymentHeader);

    // 3. Bootstrap the org
    const boot = await client.auth.loginX402(signed);
    // → { access_token, token_type, expires_in, org_id, client_id, client_secret? }
    // client_secret is present only on first bootstrap; store it securely.
  }
}
```

## Org Credentials

Manage machine-to-machine API credentials for your organization.

```typescript
// List existing credentials
const creds = await client.credentials.list();
// → OrgCredentialsEntry[]

// Rotate credentials (returns new client_id + client_secret)
const newCreds = await client.credentials.regenerate();
// → { client_id, client_secret }
// Store client_secret securely — it is not stored server-side
```

Rotation invalidates all previous organization credentials and cannot be
restored through the SDK. Run rotation integration tests only against a
disposable organization.

---

**See also:** [Error Handling](error-handling.md) for `AuthenticationError` (401) and
`ForbiddenError` (403) · [Agent Runs](agent-runs.md) for `client.getAgentCard()` /
`TeardropClient.fromAgentCard()` bootstrap · [../spec/openapi.json](../spec/openapi.json)
for the canonical auth endpoint schemas · [../README.md](../README.md)
