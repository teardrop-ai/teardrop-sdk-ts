# Automation — Scheduled Runs & Event Triggers

**Unattended, interval-based agent runs and public inbound webhook triggers with best-effort HTTPS callbacks.**

**Module:** `client.schedules`, `client.eventTriggers`

## Scheduled Runs

Configure background agent runs on an interval. Schedules are org-scoped,
require JWT auth, and can optionally push best-effort HTTPS callbacks when a
run finishes.

```typescript
const schedule = await client.schedules.create({
  name: "Daily Summary",
  prompt: "Summarize portfolio balances",
  interval_seconds: 86_400,
  callback_url: "https://ops.example.com/teardrop/schedules",
});

const schedules = await client.schedules.list();
const updated = await client.schedules.update(schedule.id, { enabled: false });

const runHistory = await client.schedules.runs(schedule.id, { limit: 20 });
// → { items: ScheduledRunResult[], next_cursor }
if (runHistory.next_cursor != null) {
  const nextRunHistory = await client.schedules.runs(schedule.id, {
    limit: 20,
    cursor: runHistory.next_cursor,
  });
}
```

`callback_format` controls how run results are delivered to `callback_url`:
`"json"` (default) or `"text"`. The `"x"` format (X broadcast sink) is only
accepted when the X broadcast feature is enabled server-side; otherwise the
server rejects the request.

## Event Triggers

Register a public inbound trigger that maps JSON payload fields into a prompt
template. The routing token and signing secret are returned only once at
creation time, so store them immediately.

```typescript
const trigger = await client.eventTriggers.create({
  name: "On Payment Inbound",
  prompt: "Audit incoming payment of {{amount}} for user {{userId}}. Full tx: {{event_json}}",
  callback_url: "https://ops.example.com/teardrop/events",
});

const { trigger_token, secret } = trigger;

const accepted = await client.eventTriggers.fire(
  trigger_token,
  {
    amount: 125_000,
    userId: "user-123",
    txHash: "0xabc",
  },
  {
    secret,
    idempotencyKey: "payment-evt-123",
  },
);
// → { run_id, status: "accepted" | "duplicate", schedule_id, result_path }

const results = await client.eventTriggers.runs(trigger.id, { limit: 20 });
if (results.next_cursor != null) {
  const nextResults = await client.eventTriggers.runs(trigger.id, {
    limit: 20,
    cursor: results.next_cursor,
  });
}
const rotated = await client.eventTriggers.rotateSecret(trigger.id);
```

`client.eventTriggers.fire()` uses the trigger secret header instead of JWT
auth, matching the public webhook endpoint at `POST /agent/events/{trigger_token}`.
Both `schedules.runs()` and `eventTriggers.runs()` accept the opaque
`next_cursor` returned by the previous page; pass it through unchanged. ISO
timestamp cursor values are also accepted for compatibility.
Stop requesting pages when `next_cursor` is null or absent; omitting `cursor`
starts at the first page.

Create/update requests and trigger responses include optional nullable
`next_trigger_id`. Use `update(id, { next_trigger_id: null })` to clear it;
omit the field to leave it unchanged. Event-run history uses
`EventRunResultItem`, which adds optional nullable `chain_id` and `hop_index`.
Its `output_text` and `error` fields may also be absent or null, so check them
before use. `getRun()` task metadata values can be strings or numbers.

---

**See also:** [Agent Runs](agent-runs.md) for the underlying run execution model ·
[../README.md](../README.md)
