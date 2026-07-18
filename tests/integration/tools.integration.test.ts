import { describe, expect, it } from "vitest";
import {
  expectDeleted,
  makeAuthedClient,
  randomSuffix,
  testUrl,
} from "./helpers";

const testWebhookUrl = process.env.TEARDROP_TEST_WEBHOOK_URL;
const toolWebhookUrl = testWebhookUrl ?? "https://example.com";

describe.skipIf(!testUrl)("Integration — ToolsModule", () => {
  it("supports create/list/get/update/delete lifecycle", async () => {
    const client = await makeAuthedClient();
    const id = `sdk-int-tool-${randomSuffix()}`;
    let createdId: string | null = null;

    try {
      const created = await client.tools.create({
        name: id,
        description: "Integration test webhook tool",
        input_schema: {
          type: "object",
          properties: { value: { type: "string" } },
        },
        webhook_url: toolWebhookUrl,
        timeout_seconds: 10,
      });
      createdId = created.id;

      const listed = await client.tools.list();
      expect(listed.some((tool) => tool.id === created.id)).toBe(true);

      const fetched = await client.tools.get(created.id);
      expect(fetched.name).toBe(id);

      const updated = await client.tools.update(created.id, {
        description: "Updated integration test webhook tool",
        is_active: false,
      });
      expect(updated.description).toBe("Updated integration test webhook tool");
      expect(updated.is_active).toBe(false);
    } finally {
      if (createdId) {
        await client.tools.delete(createdId);
        await expectDeleted(() => client.tools.get(createdId!));
      }
    }
  });

  it.skipIf(!testWebhookUrl)("tests a webhook through the SDK", async () => {
    const client = await makeAuthedClient();
    const result = await client.tools.testWebhook({
      webhook_url: testWebhookUrl!,
      webhook_method: "GET",
      timeout_seconds: 10,
    });

    expect(typeof result.success).toBe("boolean");
    expect(typeof result.latency_ms).toBe("number");
  });
});