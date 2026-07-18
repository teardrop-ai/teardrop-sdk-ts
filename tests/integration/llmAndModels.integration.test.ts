import { describe, expect, it } from "vitest";
import { makeAuthedClient, makeClient, testUrl } from "./helpers";
import type { ProviderType } from "../../src/types";

const allowLlmMutation = process.env.TEARDROP_TEST_ALLOW_LLM_MUTATION === "1";
const testLlmProvider = process.env.TEARDROP_TEST_LLM_PROVIDER ?? "anthropic";
const testLlmModel =
  process.env.TEARDROP_TEST_LLM_MODEL ?? "claude-3-5-haiku-latest";

describe.skipIf(!testUrl)("Integration — LLM and model modules", () => {
  it("returns public model benchmarks without authentication", async () => {
    const client = makeClient();
    const result = await client.models.benchmarks();
    expect(Array.isArray(result.models)).toBe(true);
    expect(typeof result.updated_at).toBe("string");
  });

  it("returns organization model benchmarks after authentication", async () => {
    const client = await makeAuthedClient();
    const result = await client.models.orgBenchmarks();
    expect(Array.isArray(result.models)).toBe(true);
    expect(typeof result.updated_at).toBe("string");
  });

  it("reads the organization LLM configuration", async () => {
    const client = await makeAuthedClient();
    const result = await client.llm.get();
    expect(typeof result.provider).toBe("string");
    expect(typeof result.model).toBe("string");
    expect(typeof result.configured).toBe("boolean");
  });

  it.skipIf(!allowLlmMutation)(
    "sets and resets an organization LLM configuration",
    async () => {
      const client = await makeAuthedClient();

      try {
        const configured = await client.llm.set({
          provider: testLlmProvider as ProviderType,
          model: testLlmModel,
          routing_preference: "default",
        });
        expect(configured.provider).toBe(testLlmProvider);
        expect(configured.model).toBe(testLlmModel);
      } finally {
        const deleted = await client.llm.reset();
        expect(deleted.status).toBe("deleted");
        const restored = await client.llm.get();
        expect(restored.configured).toBe(false);
      }
    },
  );
});