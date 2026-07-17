# Agent Runs — Streaming Execution, Tool Inventory, and x402 Payments

**Async-generator SSE streaming for agent conversations, per-run tool policy, and the public agent discovery card.**

**Module:** `client.agent`

```typescript
for await (const event of client.agent.run({
  message: "Summarise the top DeFi news today",
  thread_id: "conv-abc123",          // optional; auto-generated if omitted
  context: { user_timezone: "Europe/Berlin" },  // optional extra context
  emit_ui: true,                     // optional; default: true. Controls SURFACE_UPDATE emission.
  tool_policy: {                     // optional; per-run tool exclusions
    exclude_names: ["platform/web_search"],
  },
})) {
  console.log(event.event, event.data);
}
```

`client.agent.run()` is an async generator that yields `SseEvent` objects.

## Agent Tool Inventory

List all tools available to your agent, including their source and access mode.

```typescript
const tools = await client.agent.tools();
for (const tool of tools) {
  console.log(`${tool.name} (${tool.source}): ${tool.access_mode}`);
}
```

**Available Tools:** The agent automatically discovers and can call:
- Built-in Teardrop tools
- Marketplace tools you're subscribed to (see [Marketplace](marketplace.md))
- Custom webhook tools registered in your org (see [Tools & MCP Servers](tools-and-mcp.md))
- MCP servers you've registered (see [Tools & MCP Servers](tools-and-mcp.md))

## x402 On-chain Payments

If the agent returns `402 Payment Required`, the SDK throws `PaymentRequiredError`.
Resolve the payment externally and retry with the payment header:

```typescript
import { PaymentRequiredError } from "teardrop-sdk";

try {
  for await (const event of client.agent.run({ message: "..." })) { ... }
} catch (e) {
  if (e instanceof PaymentRequiredError) {
    // Sign the payment externally, then retry
    for await (const event of client.agent.run(
      { message: "..." },
      { paymentHeader: signedPayload },
    )) { ... }
  }
}
```

## Event Types

| Event | Key Fields | Description |
|-------|-----------|-------------|
| `RUN_STARTED` | `run_id`, `thread_id` | First event of every run |
| `TEXT_MESSAGE_START` | `message_id` | Streaming text turn begins |
| `TEXT_MESSAGE_CONTENT` | `delta` | Streaming text chunk |
| `TEXT_MESSAGE_END` | `message_id` | Streaming text turn ends |
| `TOOL_CALL_START` | `tool_call_id`, `tool_name`, `args` | Agent is calling a tool |
| `TOOL_CALL_END` | `tool_call_id`, `tool_name`, `output` | Tool returned |
| `Custom` (`TOOL_OUTPUT`) | `name`, `value` | Structured tool output |
| `SURFACE_UPDATE` | `surface_id`, `components` | UI surface payload |
| `USAGE_SUMMARY` | `tokens_in`, `tokens_out`, `cost_usdc`, `cache_read_tokens`, `cache_creation_tokens` | Per-run usage & tokens |
| `BILLING_SETTLEMENT` | `run_id`, `amount_usdc`, `tx_hash` | Credit deducted |
| `ERROR` | `error` | Non-fatal error during run |
| `DONE` | `run_id` | Stream complete |

The canonical event schema is defined in [../spec/events.schema.json](../spec/events.schema.json).

## Collecting Text

Use the `collectText` helper to assemble all `TEXT_MESSAGE_CONTENT` deltas:

```typescript
import { collectText } from "teardrop-sdk";

const text = await collectText(client.agent.run({ message: "Say hi" }));
// → "Hi there!"
```

## Agent Card

Fetch the A2A agent card from `/.well-known/agent-card.json`. Result is cached
for 5 minutes.

```typescript
const card = await client.getAgentCard();
// → { name, description, url, skills: [...] }
```

Alternatively, create a client and pre-warm the cache atomically:

```typescript
const client = await TeardropClient.fromAgentCard(
  "https://api.teardrop.dev",
  { email: "...", secret: "..." },
);
```

---

**See also:** [Memory](memory.md) for persistent per-org memory read during runs ·
[Marketplace](marketplace.md) and [Tools & MCP Servers](tools-and-mcp.md) for extending
agent capabilities · [Error Handling](error-handling.md) for `PaymentRequiredError` and
retry patterns · [../spec/events.schema.json](../spec/events.schema.json) for the
canonical SSE event schema · [../README.md](../README.md)
