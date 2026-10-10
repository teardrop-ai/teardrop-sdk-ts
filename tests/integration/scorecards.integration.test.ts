import { describe, expect, it } from "vitest";
import { makeAuthedClient, testUrl } from "./helpers";

describe.skipIf(!testUrl)("Integration — ScorecardsModule", () => {
  it("lists tasks and reads available leaderboard and subject scores", async ({
    skip,
  }) => {
    const client = await makeAuthedClient();
    const tasks = await client.scorecards.listTasks();
    expect(Array.isArray(tasks.items)).toBe(true);

    const task = tasks.items[0];
    if (!task) {
      skip("No scorecard tasks are currently available");
      return;
    }

    const leaderboard = await client.scorecards.leaderboard(
      task.definition_key,
      task.definition_version,
    );
    expect(leaderboard.definition_key).toBe(task.definition_key);
    expect(Array.isArray(leaderboard.items)).toBe(true);

    const firstItem = leaderboard.items[0];
    if (!firstItem) return;

    const scorecard = await client.scorecards.getScorecard(
      task.definition_key,
      task.definition_version,
      firstItem.subject,
    );
    expect(scorecard.item.subject).toBe(firstItem.subject);
  });
});
