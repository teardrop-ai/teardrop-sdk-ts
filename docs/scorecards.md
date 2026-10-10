# Scorecards — Tasks, Leaderboards, and Scores

**Discover prediction tasks and inspect evaluation scores for individual subjects.**

**Module:** `client.scorecards`

## List scorecard tasks

```typescript
const tasks = await client.scorecards.listTasks();
for (const task of tasks.items) {
  console.log(task.definition_key, task.definition_version);
  console.log(task.prediction_schema, task.config);
}
```

The response is an `{ items }` envelope and is not cursor-paginated. Use the
definition key and version to request scores.

## Get a leaderboard

```typescript
const leaderboard = await client.scorecards.leaderboard(
  "forecasting",
  1,
  { window_days: 30 },
);

console.log(
  leaderboard.definition_sha256,
  leaderboard.min_sample,
  leaderboard.items,
);
```

The leaderboard preserves its definition metadata alongside `items`; it is not
cursor-paginated. Score metrics such as `coverage`, `mean_brier`,
`adjusted_brier`, and `accuracy` may be `null`. Calibration bins are optional.

## Get one subject's scorecard

```typescript
const scorecard = await client.scorecards.getScorecard(
  "forecasting",
  1,
  "agent-id",
  { window_days: 30 },
);

console.log(scorecard.item.subject, scorecard.item.eligible);
```

To submit predictions for a task, see [Labeling](labeling.md).

---

**See also:** [Type Reference](type-reference.md) · [README](../README.md)
