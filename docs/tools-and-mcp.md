# Custom Webhook Tools & MCP Servers — Extending Agent Capabilities

**Register org-private webhook tools or external MCP (Model Context Protocol) servers the agent can call during runs.**

**Module:** `client.tools`, `client.mcp`

## Custom Webhook Tools

Register custom webhook-backed tools for your org that the agent can call
during runs. These are private to your organization and not shared on the
marketplace (unless explicitly published). For comparison with marketplace
tools and MCP servers, see [Marketplace vs. Custom Tools vs. MCP Servers](marketplace.md#marketplace-vs-custom-tools-vs-mcp-servers).

```typescript
// Register
const tool = await client.tools.create({
  name: "send_email",                     // lowercase, a-z0-9_
  description: "Send an email via Sendgrid",
  input_schema: {
    type: "object",
    properties: {
      to: { type: "string" },
      subject: { type: "string" },
      body: { type: "string" },
    },
    required: ["to", "subject", "body"],
  },
  webhook_url: "https://hooks.example.com/email",
  webhook_method: "POST",                 // optional, default POST
  auth_header_name: "X-Webhook-Secret",  // optional auth header
  auth_header_value: "whsec_...",
  timeout_seconds: 10,
});

const tools = await client.tools.list();
const fetched = await client.tools.get(tool.id);

// Partial update — only provided fields are sent
const updated = await client.tools.update(tool.id, { is_active: false });
await client.tools.delete(tool.id);
```

## MCP Servers

Register external MCP servers. The agent auto-discovers their tools at run
time and namespaces them as `{server_name}__{tool_name}`.

```typescript
import { parseMcpToolName } from "teardrop-sdk";

// Register
const server = await client.mcp.create({
  name: "stripe",                                   // becomes tool prefix
  url: "https://your-stripe-mcp.example.com/sse",
  auth_type: "bearer",                              // "none" | "bearer" | "header"
  auth_token: "sk-...",                             // write-only; never returned
  timeout_seconds: 15,
});

const servers = await client.mcp.list();
const fetched = await client.mcp.get(server.id);

// Partial update
await client.mcp.update(server.id, { auth_token: "sk-new-...", timeout_seconds: 30 });

// Live probe — bypasses agent TTL cache, does not mutate state
const discovery = await client.mcp.discover(server.id);
for (const tool of discovery.tools) {
  console.log(tool.name, tool.description);
}

const probe = await client.mcp.testTool(server.id, {
  tool_name: "create_refund",
  args: { charge_id: "ch_abc123" },
});
console.log(probe.success, probe.result, probe.error);

await client.mcp.delete(server.id);
```

### MCP Tool Names in Events

```typescript
for await (const event of client.agent.run("Issue a refund for ch_abc123")) {
  if (event.event === "TOOL_CALL_START") {
    const parsed = parseMcpToolName(event.data.tool_name);
    if (parsed.isMcp) {
      console.log(`MCP → ${parsed.serverName}.${parsed.toolName}`);
    }
  }
}

parseMcpToolName("stripe__create_refund");
// → { isMcp: true, serverName: "stripe", toolName: "create_refund" }

parseMcpToolName("web_search");
// → { isMcp: false }
```

### MCP Behavioural Notes

| | |
|---|---|
| Quota | 5 active servers per org by default; 422 on breach |
| Cache lag | New/updated servers are live within ~5 min (TTL 300 s); `/discover` bypasses cache |
| Auth write-only | `auth_token` is write-only; only `has_auth: boolean` is returned |
| Transport | Streamable HTTP only — stdio MCP servers are not supported |
| SSRF | Server-side URL validation blocks private IPs and localhost |

---

**See also:** [Marketplace](marketplace.md) for the public, monetizable alternative and
the full three-way comparison table · [Agent Runs](agent-runs.md) for how tools surface
in `TOOL_CALL_START` / `TOOL_CALL_END` events · [../README.md](../README.md)
