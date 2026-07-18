import { describe, expect, it } from "vitest";
import {
  expectAbsent,
  makeAuthedClient,
  testUrl,
} from "./helpers";

const siweMessage = process.env.TEARDROP_TEST_SIWE_MESSAGE;
const siweSignature = process.env.TEARDROP_TEST_SIWE_SIGNATURE;
const allowAgentWalletMutation =
  process.env.TEARDROP_TEST_ALLOW_AGENT_WALLET_MUTATION === "1";

describe.skipIf(!testUrl)("Integration — Wallet modules", () => {
  it("lists linked wallets", async () => {
    const client = await makeAuthedClient();
    const wallets = await client.wallets.list();
    expect(Array.isArray(wallets)).toBe(true);
  });

  it.skipIf(!siweMessage || !siweSignature)(
    "links and unlinks a wallet with a SIWE fixture",
    async () => {
      const client = await makeAuthedClient();
      const wallet = await client.wallets.link({
        siwe_message: siweMessage!,
        siwe_signature: siweSignature!,
      });

      try {
        expect(typeof wallet.id).toBe("string");
        expect(typeof wallet.address).toBe("string");
      } finally {
        await client.wallets.delete(wallet.id);
        await expectAbsent(
          () => client.wallets.list(),
          (item) => item.id === wallet.id,
        );
      }
    },
  );

  it.skipIf(!allowAgentWalletMutation)(
    "provisions, reads, and deactivates an agent wallet",
    async () => {
      const client = await makeAuthedClient();
      const provisioned = await client.agentWallets.provision();
      expect(typeof provisioned.id).toBe("string");

      try {
        const fetched = await client.agentWallets.get({ includeBalance: true });
        expect(fetched.id).toBe(provisioned.id);
        expect(typeof fetched.address).toBe("string");
      } finally {
        const deactivated = await client.agentWallets.deactivate();
        expect(deactivated.status).toBe("deactivated");
      }
    },
  );
});