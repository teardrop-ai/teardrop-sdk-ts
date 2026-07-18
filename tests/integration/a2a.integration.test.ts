import { describe, expect, it } from "vitest";
import {
  expectAbsent,
  makeAuthedClient,
  testUrl,
} from "./helpers";

const testAgentUrl =
  process.env.TEARDROP_TEST_A2A_AGENT_URL ?? "https://agent.example.com";

describe.skipIf(!testUrl)("Integration — A2AModule", () => {
  it("supports trusted-agent lifecycle and delegation history", async () => {
    const client = await makeAuthedClient();
    let createdId: string | null = null;

    try {
      const created = await client.a2a.addAgent({
        agent_url: testAgentUrl,
        label: "SDK integration test agent",
        require_x402: false,
        jwt_forward: false,
      });
      createdId = created.id;

      const listed = await client.a2a.listAgents();
      expect(listed.some((agent) => agent.id === created.id)).toBe(true);

      const delegations = await client.a2a.delegations({ limit: 5 });
      expect(Array.isArray(delegations)).toBe(true);
    } finally {
      if (createdId) {
        const deleted = await client.a2a.removeAgent(createdId);
        expect(deleted.deleted).toBe(createdId);
        await expectAbsent(
          () => client.a2a.listAgents(),
          (agent) => agent.id === createdId,
        );
      }
    }
  });
});