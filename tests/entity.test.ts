/**
 * Tests for Code Entity and verifier (no LLM calls).
 */

import { describe, it, expect } from "vitest";
import { WorkingMemory } from "../src/memory.js";
import { extractCodeBlock, runVerifier } from "../src/verifier.js";

describe("verifier", () => {
  it("extractCodeBlock returns unchanged text when no fence", () => {
    expect(extractCodeBlock("function f() {}")).toBe("function f() {}");
  });

  it("extractCodeBlock removes markdown fence", () => {
    const text = "```typescript\nfunction f() {}\n```";
    expect(extractCodeBlock(text)).toContain("function f() {}");
    expect(extractCodeBlock(text)).not.toContain("```");
  });

  it("extractCodeBlock handles fence without language", () => {
    const text = "```\nconst x = 1;\n```";
    const result = extractCodeBlock(text);
    expect(result).toContain("const x = 1;");
    expect(result).not.toContain("```");
  });
});

describe("runVerifier", () => {
  it("passes syntax check for valid code", async () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate("function add(a: number, b: number): number { return a + b; }");

    await runVerifier(mem, undefined);

    expect(mem.verificationPassed).toBe(true);
    expect(mem.authoritativeArtifact).toBe(
      "function add(a: number, b: number): number { return a + b; }"
    );
  });

  it("fails syntax check for unmatched braces", async () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate("function add(a: number, b: number { return a + b; }");

    await runVerifier(mem, undefined);

    expect(mem.verificationPassed).toBe(false);
    expect(mem.verificationEvidence).toContain("Syntax error");
  });

  it("fails syntax check for unmatched brackets", async () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate("const arr = [1, 2, 3;");

    await runVerifier(mem, undefined);

    expect(mem.verificationPassed).toBe(false);
  });

  it("fails when no final candidate", async () => {
    const mem = new WorkingMemory();

    await runVerifier(mem, undefined);

    expect(mem.verificationPassed).toBe(false);
    expect(mem.verificationEvidence).toContain("No final candidate");
  });

  it("handles code with comments correctly", async () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate(`
      // This is a comment
      function add(a: number, b: number): number {
        /* multi-line
           comment */
        return a + b;
      }
    `);

    await runVerifier(mem, undefined);

    expect(mem.verificationPassed).toBe(true);
  });

  it("handles code with strings containing braces", async () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate(`
      const msg = "Hello {world}";
      const obj = { key: "value" };
    `);

    await runVerifier(mem, undefined);

    expect(mem.verificationPassed).toBe(true);
  });
});

describe("WorkingMemory", () => {
  it("setTask updates task", () => {
    const mem = new WorkingMemory();
    mem.setTask("test task");
    expect(mem.task).toBe("test task");
  });

  it("setDraft updates draft", () => {
    const mem = new WorkingMemory();
    mem.setDraft("draft code");
    expect(mem.draft).toBe("draft code");
  });

  it("setCritique updates critique", () => {
    const mem = new WorkingMemory();
    mem.setCritique("code review");
    expect(mem.critique).toBe("code review");
  });

  it("setFinalCandidate updates finalCandidate", () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate("final code");
    expect(mem.finalCandidate).toBe("final code");
  });

  it("setVerification with pass sets authoritativeArtifact", () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate("final code");
    mem.setVerification(true, "Tests passed");

    expect(mem.verificationPassed).toBe(true);
    expect(mem.verificationEvidence).toBe("Tests passed");
    expect(mem.authoritativeArtifact).toBe("final code");
  });

  it("setVerification with fail does not set authoritativeArtifact", () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate("final code");
    mem.setVerification(false, "Tests failed");

    expect(mem.verificationPassed).toBe(false);
    expect(mem.authoritativeArtifact).toBe("");
  });

  it("setSlot and getSlot work correctly", () => {
    const mem = new WorkingMemory();
    mem.setSlot("generator", "generated output");

    expect(mem.getSlot("generator")).toBe("generated output");
    expect(mem.getSlot("nonexistent")).toBe("");
  });
});
