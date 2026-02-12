import { describe, it, expect } from "vitest";
import { LLMGateway } from "../src/gateway.js";

describe("LLMGateway", () => {
  it("constructs without throwing", () => {
    const gw = new LLMGateway({
      baseUrl: "http://localhost:1234/v1",
      model: "test-model",
    });
    expect(gw).toBeDefined();
  });

  it("constructs with apiKey", () => {
    const gw = new LLMGateway({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4",
      apiKey: "sk-test",
    });
    expect(gw).toBeDefined();
  });

  it("complete throws descriptive error on network failure", async () => {
    const gw = new LLMGateway({
      baseUrl: "http://localhost:1/v1",
      model: "nonexistent",
    });

    await expect(
      gw.complete([{ role: "user", content: "hello" }])
    ).rejects.toThrow(/LLM request failed/);
  });
});
