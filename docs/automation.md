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

const runHistory = await client.schedules.runs(schedule.id, {
  limit: 20,
  cursor: "2026-06-28T12:00:25Z",
});
// → { items: ScheduledRunResult[], next_cursor }
```

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
const rotated = await client.eventTriggers.rotateSecret(trigger.id);
```

`client.eventTriggers.fire()` uses the trigger secret header instead of JWT
auth, matching the public webhook endpoint at `POST /agent/events/{trigger_token}`.

---

**See also:** [Agent Runs](agent-runs.md) for the underlying run execution model ·
[../README.md](../README.md)
