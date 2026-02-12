/**
 * Tests for gateway retry, timeout, and error sanitization (Milestone 1a).
 */

import { describe, it, expect } from "vitest";
import { LLMGateway, sanitizeBaseUrl } from "../src/gateway.js";

describe("Gateway retry and timeout", () => {
  it("constructs with default timeout and retries", () => {
    const gw = new LLMGateway({
      backend: "local",
      baseUrl: "http://localhost:1234/v1",
      apiKey: null,
      model: "test",
    });
    expect(gw).toBeDefined();
  });

  it("constructs with custom timeout and retries", () => {
    const gw = new LLMGateway({
      backend: "local",
      baseUrl: "http://localhost:1234/v1",
      apiKey: null,
      model: "test",
      timeoutMs: 5000,
      maxRetries: 0,
    });
    expect(gw).toBeDefined();
  });

  it("complete throws with sanitized error on network failure", async () => {
    const gw = new LLMGateway({
      backend: "local",
      baseUrl: "http://localhost:1/v1",
      apiKey: null,
      model: "nonexistent",
      maxRetries: 0,
      timeoutMs: 1000,
    });

    await expect(
      gw.complete([{ role: "user", content: "hello" }])
    ).rejects.toThrow(/LLM request failed/);
  });

  it("error message contains host not full URL", async () => {
    const gw = new LLMGateway({
      backend: "local",
      baseUrl: "http://localhost:1/v1/secret-path?key=abc123",
      apiKey: null,
      model: "nonexistent",
      maxRetries: 0,
      timeoutMs: 1000,
    });

    try {
      await gw.complete([{ role: "user", content: "hello" }]);
      expect.unreachable("Should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("host=localhost");
      expect(msg).not.toContain("secret-path");
      expect(msg).not.toContain("key=abc123");
    }
  });
});

describe("sanitizeBaseUrl", () => {
  it("extracts hostname from valid URL", () => {
    expect(sanitizeBaseUrl("https://api.openai.com/v1")).toBe("api.openai.com");
  });

  it("extracts hostname from URL with path and params", () => {
    expect(sanitizeBaseUrl("https://example.com:8080/path?key=secret")).toBe("example.com");
  });

  it("extracts hostname from URL with credentials", () => {
    expect(sanitizeBaseUrl("https://user:pass@host.example.com/api")).toBe("host.example.com");
  });

  it("returns <invalid-url> for invalid URL", () => {
    expect(sanitizeBaseUrl("not a url")).toBe("<invalid-url>");
  });

  it("returns localhost for localhost URL", () => {
    expect(sanitizeBaseUrl("http://localhost:1234/v1")).toBe("localhost");
  });
});
