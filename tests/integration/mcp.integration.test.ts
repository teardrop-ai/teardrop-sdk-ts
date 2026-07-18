import { describe, expect, it } from "vitest";
import {
  expectDeleted,
  makeAuthedClient,
  randomSuffix,
  testUrl,
} from "./helpers";

const testMcpUrl = process.env.TEARDROP_TEST_MCP_URL;
const testMcpTool = process.env.TEARDROP_TEST_MCP_TOOL;

describe.skipIf(!testUrl || !testMcpUrl)("Integration — McpModule", () => {
  it("supports server CRUD and discovery lifecycle", async () => {
    const client = await makeAuthedClient();
    const name = `sdk-int-mcp-${randomSuffix()}`;
    let createdId: string | null = null;

    try {
      const created = await client.mcp.create({
        name,
        url: testMcpUrl!,
        auth_type: "none",
        timeout_seconds: 15,
      });
      createdId = created.id;

      const listed = await client.mcp.list();
      expect(listed.some((server) => server.id === created.id)).toBe(true);

      const fetched = await client.mcp.get(created.id);
      expect(fetched.name).toBe(name);

      const updated = await client.mcp.update(created.id, {
        is_active: false,
      });
      expect(updated.is_active).toBe(false);

      const discovery = await client.mcp.discover(created.id);
      expect(discovery.server_id).toBe(created.id);
      expect(Array.isArray(discovery.tools)).toBe(true);
    } finally {
      if (createdId) {
        await client.mcp.delete(createdId);
        await expectDeleted(() => client.mcp.get(createdId!));
      }
    }
  });

  it.skipIf(!testMcpTool)("tests an MCP tool through the SDK", async () => {
    const client = await makeAuthedClient();
    const name = `sdk-int-mcp-tool-${randomSuffix()}`;
    let createdId: string | null = null;

    try {
      const created = await client.mcp.create({
        name,
        url: testMcpUrl!,
        auth_type: "none",
        timeout_seconds: 15,
      });
      createdId = created.id;

      const result = await client.mcp.testTool(created.id, {
        tool_name: testMcpTool!,
        args: {},
      });
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.latency_ms).toBe("number");
    } finally {
      if (createdId) {
        await client.mcp.delete(createdId);
        await expectDeleted(() => client.mcp.get(createdId!));
      }
    }
  });
});