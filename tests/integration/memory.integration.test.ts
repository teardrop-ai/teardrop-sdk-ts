import { describe, expect, it } from "vitest";
import {
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
        let cursor: string | undefined;
        let found = false;
        for (let page = 0; page < 10; page += 1) {
          const listed = await client.memory.list({ limit: 100, cursor });
          found = listed.items.some((entry) => entry.id === createdId);
          if (found || !listed.next_cursor) break;
          cursor = listed.next_cursor;
        }
        expect(found).toBe(false);
      }
    }
  }, 30_000);
});
