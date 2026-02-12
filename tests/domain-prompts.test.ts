import { describe, it, expect } from "vitest";
import { getDomainPrompts, registerDomain, listDomains } from "../src/domain-prompts.js";

describe("domain-prompts", () => {
  describe("getDomainPrompts", () => {
    it("returns code domain prompts", () => {
      const prompts = getDomainPrompts("code");
      expect(prompts.generator).toContain("TypeScript");
      expect(prompts.critic).toContain("Critic");
      expect(prompts.judge).toContain("Judge");
    });

    it("returns general domain prompts", () => {
      const prompts = getDomainPrompts("general");
      expect(prompts.generator).toContain("Generator");
      expect(prompts.critic).toContain("Critic");
      expect(prompts.judge).toContain("Judge");
      // Should NOT mention TypeScript specifically
      expect(prompts.generator).not.toContain("TypeScript");
    });

    it("falls back to general for unknown domain", () => {
      const prompts = getDomainPrompts("nonexistent-domain");
      const general = getDomainPrompts("general");
      expect(prompts.generator).toBe(general.generator);
      expect(prompts.critic).toBe(general.critic);
      expect(prompts.judge).toBe(general.judge);
    });
  });

  describe("registerDomain", () => {
    it("registers a custom domain", () => {
      registerDomain("test-custom", {
        generator: "Custom generator prompt",
        critic: "Custom critic prompt",
        judge: "Custom judge prompt",
      });
      const prompts = getDomainPrompts("test-custom");
      expect(prompts.generator).toBe("Custom generator prompt");
      expect(prompts.critic).toBe("Custom critic prompt");
      expect(prompts.judge).toBe("Custom judge prompt");
    });

    it("overwrites existing domain", () => {
      registerDomain("test-overwrite", {
        generator: "First",
        critic: "First",
        judge: "First",
      });
      registerDomain("test-overwrite", {
        generator: "Second",
        critic: "Second",
        judge: "Second",
      });
      const prompts = getDomainPrompts("test-overwrite");
      expect(prompts.generator).toBe("Second");
    });
  });

  describe("listDomains", () => {
    it("includes code and general", () => {
      const domains = listDomains();
      expect(domains).toContain("code");
      expect(domains).toContain("general");
    });

    it("includes custom registered domains", () => {
      registerDomain("test-list-domain", {
        generator: "g",
        critic: "c",
        judge: "j",
      });
      const domains = listDomains();
      expect(domains).toContain("test-list-domain");
    });
  });
});
