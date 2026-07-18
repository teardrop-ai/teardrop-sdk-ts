import { describe, expect, it } from "vitest";
import { GatewayError } from "../../src/errors";
import type { McpDiscoverResponse, TestMcpToolResponse } from "../../src/types";
import {
  expectDeleted,
  makeAuthedClient,
  randomSuffix,
  testUrl,
} from "./helpers";

const testMcpUrl = process.env.TEARDROP_TEST_MCP_URL;
const testMcpTool = process.env.TEARDROP_TEST_MCP_TOOL;
const allowMcpUnavailable =
  process.env.TEARDROP_TEST_ALLOW_MCP_UNAVAILABLE === "1";

describe.skipIf(!testUrl || !testMcpUrl)("Integration — McpModule", () => {
  it("supports server CRUD and discovery lifecycle", async ({ skip }) => {
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

      let discovery: McpDiscoverResponse;
      try {
        discovery = await client.mcp.discover(created.id);
      } catch (error) {
        if (
          allowMcpUnavailable &&
          error instanceof GatewayError &&
          error.status === 502
        ) {
          skip("Configured MCP fixture is unavailable (502 gateway error)");
          return;
        }
        throw error;
      }
      expect(discovery.server_id).toBe(created.id);
      expect(Array.isArray(discovery.tools)).toBe(true);

      const updated = await client.mcp.update(created.id, {
        is_active: false,
      });
      expect(updated.is_active).toBe(false);
    } finally {
      if (createdId) {
        await client.mcp.delete(createdId);
        await expectDeleted(() => client.mcp.get(createdId!));
      }
    }
  });

  it.skipIf(!testMcpTool)(
    "tests an MCP tool through the SDK",
    async ({ skip }) => {
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

        let result: TestMcpToolResponse;
        try {
          result = await client.mcp.testTool(created.id, {
            tool_name: testMcpTool!,
            args: {},
          });
        } catch (error) {
          if (
            allowMcpUnavailable &&
            error instanceof GatewayError &&
            error.status === 502
          ) {
            skip("Configured MCP fixture is unavailable (502 gateway error)");
            return;
          }
          throw error;
        }
        expect(typeof result.success).toBe("boolean");
        expect(typeof result.latency_ms).toBe("number");
      } finally {
        if (createdId) {
          await client.mcp.delete(createdId);
          await expectDeleted(() => client.mcp.get(createdId!));
        }
      }
    },
  );
});