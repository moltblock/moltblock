import { describe, it, expect } from "vitest";
import { CompositeVerifier } from "../src/composite-verifier.js";
import type { Verifier, VerificationResult, VerifierContext } from "../src/verifier-interface.js";
import { WorkingMemory } from "../src/memory.js";

/** Helper: verifier that always passes. */
function passingVerifier(name: string): Verifier {
  return {
    name,
    async verify(): Promise<VerificationResult> {
      return { passed: true, evidence: "OK", verifierName: name };
    },
  };
}

/** Helper: verifier that always fails. */
function failingVerifier(name: string): Verifier {
  return {
    name,
    async verify(): Promise<VerificationResult> {
      return { passed: false, evidence: "FAIL", verifierName: name };
    },
  };
}

describe("CompositeVerifier", () => {
  it("passes when all verifiers pass", async () => {
    const comp = new CompositeVerifier([passingVerifier("A"), passingVerifier("B")]);
    const mem = new WorkingMemory();
    const result = await comp.verify(mem);
    expect(result.passed).toBe(true);
    expect(result.verifierName).toBe("CompositeVerifier");
    expect(result.details).toHaveLength(2);
    expect(result.details![0]!.passed).toBe(true);
    expect(result.details![1]!.passed).toBe(true);
  });

  it("fails when any verifier fails", async () => {
    const comp = new CompositeVerifier([passingVerifier("A"), failingVerifier("B")]);
    const mem = new WorkingMemory();
    const result = await comp.verify(mem);
    expect(result.passed).toBe(false);
    expect(result.details).toHaveLength(2);
  });

  it("fail-fast stops at first failure by default", async () => {
    const comp = new CompositeVerifier([failingVerifier("X"), passingVerifier("Y")]);
    const mem = new WorkingMemory();
    const result = await comp.verify(mem);
    expect(result.passed).toBe(false);
    // Only one result because fail-fast
    expect(result.details).toHaveLength(1);
    expect(result.details![0]!.verifierName).toBe("X");
  });

  it("collect-all runs every verifier", async () => {
    const comp = new CompositeVerifier(
      [failingVerifier("X"), passingVerifier("Y"), failingVerifier("Z")],
      { failFast: false }
    );
    const mem = new WorkingMemory();
    const result = await comp.verify(mem);
    expect(result.passed).toBe(false);
    expect(result.details).toHaveLength(3);
  });

  it("throws if constructed with empty array", () => {
    expect(() => new CompositeVerifier([])).toThrow("at least one verifier");
  });

  it("includes combined evidence", async () => {
    const comp = new CompositeVerifier([passingVerifier("A"), failingVerifier("B")]);
    const mem = new WorkingMemory();
    const result = await comp.verify(mem);
    expect(result.evidence).toContain("[A] PASS");
    expect(result.evidence).toContain("[B] FAIL");
  });

  it("passes context to verifiers", async () => {
    let receivedContext: VerifierContext | undefined;
    const spy: Verifier = {
      name: "Spy",
      async verify(_mem: WorkingMemory, ctx?: VerifierContext): Promise<VerificationResult> {
        receivedContext = ctx;
        return { passed: true, evidence: "OK", verifierName: "Spy" };
      },
    };
    const comp = new CompositeVerifier([spy]);
    const mem = new WorkingMemory();
    await comp.verify(mem, { task: "test task", domain: "general" });
    expect(receivedContext).toBeDefined();
    expect(receivedContext!.task).toBe("test task");
    expect(receivedContext!.domain).toBe("general");
  });
});
