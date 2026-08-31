# Wallets, Agent Wallets & A2A Delegation

**Link Ethereum wallets for SIWE/USDC, provision CDP smart wallets for autonomous agent transactions, and grant cross-org agent delegation.**

**Module:** `client.wallets`, `client.agentWallets`, `client.a2a`

## Wallets

Link Ethereum wallets to a user account for USDC payments and SIWE authentication.

```typescript
const wallet = await client.wallets.link({
  siwe_message: "...",
  siwe_signature: "...",
});

const wallets = await client.wallets.list();
await client.wallets.delete(wallet.id);
```

## Agent Wallets

Provision a CDP smart wallet for the org's agent, enabling it to sign
transactions autonomously.

```typescript
const wallet = await client.agentWallets.provision();
// → AgentWallet { id, address: "0x...", network: "base", status: "active" }

// Fetch with live on-chain balance
const info = await client.agentWallets.get({ includeBalance: true });

// Deactivate (admin only)
await client.agentWallets.deactivate();
```

Agent-wallet provisioning is available only when the server has agent wallets
enabled and valid CDP credentials. The supported chain IDs are `84532` (Base
Sepolia) and `8453` (Base). A disabled feature or unavailable CDP setup is an
environment prerequisite, while an unsupported chain configuration is a real
API configuration error.

## A2A Delegation

Allow other organisations' agents to call your agent on behalf of their users.

```typescript
// Grant delegation rights to an org
const agent = await client.a2a.addAgent({
  agent_url: "https://partner-agent.example.com",
  label: "Partner Agent",
  require_x402: false,
  jwt_forward: false,
});

const agents = await client.a2a.listAgents();

await client.a2a.removeAgent(agent.id);

// View delegation event history
const delegations = await client.a2a.delegations({ limit: 20 });
// Each event includes the delegated task type, status, cost, and settlement data.
// Delivery tracking fields (when present): delivery_status, delivery_error,
// delivery_resolved_at, delivery_settlement_tx.
```

Trusted-agent mutations require an org-admin JWT with both `role=admin` and an
`org_id` claim. Platform administrators should use
`client.admin.addA2AAgent({ org_id, agent_url, ... })` instead of the
organization-scoped `client.a2a.addAgent()` method.

### Async Inbound Task Status

Poll the status and terminal result of an asynchronous inbound task:

```typescript
const status = await client.a2a.messageStatus("task-id");
// → { status, result, ... } — shape depends on the task
```

### Admin: Possibly-Delivered Delegations

When a delegation response is lost but the delivery may have succeeded, admins
can list and resolve those delegations:

```typescript
// List delegations that may have been delivered despite a failed response
const pending = await client.admin.listPossiblyDeliveredDelegations({ org_id: "org-1" });
for (const item of pending) {
  console.log(item.id, item.delivery_status, item.refund_status);
}

// Resolve as confirmed (with settlement tx) or failed
const item = pending[0];
if (item) {
  const resolved = await client.admin.resolveA2ADelegation(item.id, {
    org_id: "org-1",
    outcome: "confirmed",
    settlement_tx: "0x...",
  });
  // → { id, org_id, outcome, refund_status }
}
```

---

**See also:** [Authentication](authentication.md) for SIWE login flow ·
[Agent Runs](agent-runs.md) for the agent discovery card used in A2A ·
[../README.md](../README.md)
