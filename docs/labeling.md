# Labeling — Definitions, Predictions, and Results

**Org-scoped labeling data for model evaluation and human-in-the-loop scoring.**

**Module:** `client.labeling`

## Discover available definitions

```typescript
const definitions = await client.labeling.listDefinitions();

const active = definitions.filter((d) => d.active);
```

## Review predictions and scored outcomes

```typescript
const predictions = await client.labeling.listPredictions({ limit: 25 });
const results = await client.labeling.listResults({ limit: 50 });
```

## Bind a schedule to a definition

```typescript
const binding = await client.labeling.bind({
  schedule_id: "sched-123",
  definition_key: "toxicity",
  definition_version: 1,
});
```

## Override a scored result

```typescript
const override = await client.labeling.override("target-42", {
  label: "spam",
  status: "correct",
  score: 0.98,
  rationale: "Matches the policy and target taxonomy.",
  source: "manual",
});
```

The SDK exposes the read-mostly labeling surface and keeps the internal prediction-capture tool private by design.

---

**See also:** [Automation](automation.md) · [README](../README.md)
