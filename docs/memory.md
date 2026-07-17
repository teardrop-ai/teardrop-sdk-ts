# Persistent Memory — Org-scoped Semantic Recall

**Store and retrieve memory entries that the agent reads automatically during runs.**

**Module:** `client.memory`

Semantic memory per org. Entries are automatically extracted from runs or
added manually via the API.

```typescript
// Store a manual memory (content: 1–500 characters)
const entry = await client.memory.create({ content: "The user prefers dark mode." });

// List memories with cursor pagination
const { memories, next_cursor } = await client.memory.list({ limit: 50 });
for (const e of memories) {
  console.log(`${e.content} (from run: ${e.source_run_id})`);
}

// Delete a memory
await client.memory.delete(entry.id);
```

---

**See also:** [Agent Runs](agent-runs.md) for how the agent reads memory during
`client.agent.run()` · [../README.md](../README.md)
