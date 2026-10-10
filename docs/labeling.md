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

## Submit a signed prediction

Submit an externally generated prediction for a scorecard definition. Supply an
idempotency key and the signer's address and signature with the prediction:

```typescript
const submitted = await client.labeling.submitPrediction({
  definition_key: "toxicity",
  definition_version: 1,
  predictions: { label: "spam" },
  idempotency_key: "prediction-request-123",
  signer_address: "0x...",
  signature: "0x...",
});
// → { created, id, payload_sha256, status }
```

Retrieve the signed prediction's proof by its returned ID:

```typescript
const proof = await client.labeling.getPredictionProof(submitted.id);
console.log(proof.status, proof.leaf_sha256, proof.anchor);
```

The proof includes its leaf preimage and, once available, the Merkle-tree and
on-chain anchor details. `anchor` is `null` while the prediction is not yet
anchored.

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

The SDK supports reading labeling data and submitting externally signed
predictions; the internal prediction-capture tool remains private by design.

---

**See also:** [Automation](automation.md) · [README](../README.md)
