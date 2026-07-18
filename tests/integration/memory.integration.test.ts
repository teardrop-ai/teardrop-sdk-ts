import { describe, expect, it } from "vitest";
import {
  expectAbsent,
  makeAuthedClient,
  randomSuffix,
  testUrl,
} from "./helpers";

describe.skipIf(!testUrl)("Integration — MemoryModule", () => {
  it("supports create/list/delete lifecycle", async () => {
    const client = await makeAuthedClient();
    const content = `sdk integration memory ${randomSuffix()}`;
    let createdId: string | null = null;

    try {
      const created = await client.memory.create({ content });
      createdId = created.id;
      expect(created.content).toBe(content);

      const listed = await client.memory.list({ limit: 100 });
      expect(listed.items.some((entry) => entry.id === created.id)).toBe(true);
    } finally {
      if (createdId) {
        await client.memory.delete(createdId);
        await expectAbsent(
          async () => (await client.memory.list({ limit: 100 })).items,
          (entry) => entry.id === createdId,
        );
      }
    }
  });
});