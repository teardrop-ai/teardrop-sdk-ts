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

## A2A Delegation

Allow other organisations' agents to call your agent on behalf of their users.

```typescript
// Grant delegation rights to an org
const agent = await client.a2a.addAgent({
  agent_url: "https://partner-agent.example.com",
  label: "Partner Agent",
  permissions: ["run"],
});

const agents = await client.a2a.listAgents();

await client.a2a.removeAgent(agent.id);

// View delegation event history
const delegations = await client.a2a.delegations({ limit: 20 });
```

---

**See also:** [Authentication](authentication.md) for SIWE login flow ·
[Agent Runs](agent-runs.md) for the agent discovery card used in A2A ·
[../README.md](../README.md)
