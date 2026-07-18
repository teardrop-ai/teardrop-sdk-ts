import { describe, expect, it } from "vitest";
import {
  decodeTestJwt,
  expectAbsent,
  makeAuthedClient,
  makeClient,
  testUrl,
} from "./helpers";

const testAgentUrl = process.env.TEARDROP_TEST_A2A_AGENT_URL;
const allowA2AMutation = process.env.TEARDROP_TEST_ALLOW_A2A_MUTATION === "1";
const orgAdminToken = process.env.TEARDROP_TEST_A2A_ORG_ADMIN_TOKEN;
const platformAdminToken = process.env.TEARDROP_TEST_A2A_PLATFORM_ADMIN_TOKEN;
const adminOrgId = process.env.TEARDROP_TEST_A2A_ORG_ID;

describe.skipIf(!testUrl || !allowA2AMutation || !testAgentUrl)(
  "Integration — A2AModule",
  () => {
    it.skipIf(!orgAdminToken && !platformAdminToken)(
      "supports trusted-agent lifecycle and delegation history",
      async () => {
        if (orgAdminToken && platformAdminToken) {
          throw new Error(
            "Configure only one of TEARDROP_TEST_A2A_ORG_ADMIN_TOKEN or TEARDROP_TEST_A2A_PLATFORM_ADMIN_TOKEN",
          );
        }
        if (platformAdminToken && !adminOrgId) {
          throw new Error(
            "TEARDROP_TEST_A2A_ORG_ID is required with TEARDROP_TEST_A2A_PLATFORM_ADMIN_TOKEN",
          );
        }

        const client = makeClient();
        const token = platformAdminToken ?? orgAdminToken!;
        client.setToken(token);
        const claims = decodeTestJwt(token);
        if (!platformAdminToken && (claims?.role !== "admin" || !claims.org_id)) {
          throw new Error(
            "TEARDROP_TEST_A2A_ORG_ADMIN_TOKEN must contain role=admin and org_id",
          );
        }

        let createdId: string | null = null;

        try {
          const created = platformAdminToken
            ? await client.admin.addA2AAgent({
                org_id: adminOrgId!,
                agent_url: testAgentUrl!,
                label: "SDK integration test agent",
                require_x402: false,
                jwt_forward: false,
              })
            : await client.a2a.addAgent({
                agent_url: testAgentUrl!,
                label: "SDK integration test agent",
                require_x402: false,
                jwt_forward: false,
              });
          createdId = created.id;

          const listed = platformAdminToken
            ? await client.admin.listA2AAgents(adminOrgId!)
            : await client.a2a.listAgents();
          expect(listed.some((agent) => agent.id === created.id)).toBe(true);

          if (!platformAdminToken) {
            const delegations = await client.a2a.delegations({ limit: 5 });
            expect(Array.isArray(delegations)).toBe(true);
          }
        } finally {
          if (createdId) {
            if (platformAdminToken) {
              const deleted = await client.admin.deleteA2AAgent(createdId);
              expect(deleted.deleted).toBe(createdId);
              await expectAbsent(
                () => client.admin.listA2AAgents(adminOrgId!),
                (agent) => agent.id === createdId,
              );
            } else {
              const deleted = await client.a2a.removeAgent(createdId);
              expect(deleted.deleted).toBe(createdId);
              await expectAbsent(
                () => client.a2a.listAgents(),
                (agent) => agent.id === createdId,
              );
            }
          }
        }
      },
    );

    it.skipIf(!process.env.TEARDROP_TEST_A2A_MEMBER_TOKEN)(
      "rejects trusted-agent mutation for a normal member",
      async () => {
        const client = makeClient();
        client.setToken(process.env.TEARDROP_TEST_A2A_MEMBER_TOKEN!);
        await expect(
          client.a2a.addAgent({
            agent_url: testAgentUrl!,
            label: "SDK integration test member rejection",
            require_x402: false,
            jwt_forward: false,
          }),
        ).rejects.toMatchObject({ status: 403 });
      },
    );
  },
);