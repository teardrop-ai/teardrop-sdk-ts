import { describe, expect, it } from "vitest";
import { TeardropClient } from "../../src/client";
import { AuthenticationError } from "../../src/errors";
import {
  makeAuthedClient,
  testUrl,
} from "./helpers";

const allowCredentialRotation =
  process.env.TEARDROP_TEST_ALLOW_CREDENTIAL_ROTATION === "1" &&
  process.env.TEARDROP_TEST_CREDENTIAL_ROTATION_DISPOSABLE_ORG === "1";

describe.skipIf(!testUrl)("Integration — CredentialsModule", () => {
  it("lists organization credentials without exposing secrets", async () => {
    const client = await makeAuthedClient();
    const credentials = await client.credentials.list();
    expect(Array.isArray(credentials)).toBe(true);
    for (const credential of credentials) {
      expect(typeof credential.client_id).toBe("string");
      expect("client_secret" in credential).toBe(false);
    }
  });

  it.skipIf(!allowCredentialRotation)(
    "invalidates the previous client credential after rotation",
    async () => {
      const client = await makeAuthedClient();
      const previous = await client.credentials.regenerate();
      const current = await client.credentials.regenerate();

      const staleClient = new TeardropClient({
        baseUrl: testUrl!,
        client_id: previous.client_id,
        client_secret: previous.client_secret,
      });
      await expect(staleClient.auth.me()).rejects.toBeInstanceOf(
        AuthenticationError,
      );

      const currentClient = new TeardropClient({
        baseUrl: testUrl!,
        client_id: current.client_id,
        client_secret: current.client_secret,
      });
      const me = await currentClient.auth.me();
      expect(typeof me.org_id).toBe("string");
    },
  );
});