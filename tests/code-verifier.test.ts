import { describe, it, expect, vi } from "vitest";
import { CodeVerifier } from "../src/code-verifier.js";
import { WorkingMemory } from "../src/memory.js";

// Mock the vitest-based verifier to avoid actually spawning processes
vi.mock("../src/verifier.js", () => ({
  runVerifier: async (memory: WorkingMemory, _testCode?: string) => {
    // Simulate: if finalCandidate contains "valid", pass; otherwise fail
    if (memory.finalCandidate.includes("valid")) {
      memory.setVerification(true, "Tests passed.");
    } else {
      memory.setVerification(false, "Tests failed.");
    }
  },
}));

describe("CodeVerifier", () => {
  const verifier = new CodeVerifier();

  it("has correct name", () => {
    expect(verifier.name).toBe("CodeVerifier");
  });

  it("returns VerificationResult with passed=true on valid code", async () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate("valid code here");
    const result = await verifier.verify(mem, { testCode: "test code" });
    expect(result.passed).toBe(true);
    expect(result.verifierName).toBe("CodeVerifier");
    expect(result.evidence).toContain("passed");
  });

  it("returns VerificationResult with passed=false on invalid code", async () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate("broken code");
    const result = await verifier.verify(mem, { testCode: "test code" });
    expect(result.passed).toBe(false);
    expect(result.verifierName).toBe("CodeVerifier");
    expect(result.evidence).toContain("failed");
  });

  it("works without context", async () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate("valid snippet");
    const result = await verifier.verify(mem);
    expect(result.passed).toBe(true);
  });

  it("returns structured VerificationResult", async () => {
    const mem = new WorkingMemory();
    mem.setFinalCandidate("valid code");
    const result = await verifier.verify(mem);
    expect(result).toHaveProperty("passed");
    expect(result).toHaveProperty("evidence");
    expect(result).toHaveProperty("verifierName");
  });
});
