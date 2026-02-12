/**
 * Integration test: full pipeline with mocked LLM (Milestone 2e).
 * Task -> draft -> critique -> final -> verify -> artifact.
 */

import { describe, it, expect, afterEach } from "vitest";
import { WorkingMemory } from "../src/memory.js";
import { Store, recordOutcome, getRecentOutcomes } from "../src/persistence.js";
import { PolicyVerifier } from "../src/policy-verifier.js";
import type { Verifier, VerificationResult, VerifierContext } from "../src/verifier-interface.js";
import { SIMPLE_TASK, SIMPLE_CODE, SIMPLE_CRITIQUE, SIMPLE_FINAL } from "./helpers/fixtures.js";
import { createTestStore } from "./helpers/mock-store.js";

/** A pass-through verifier for integration tests. */
class PassVerifier implements Verifier {
  readonly name = "PassVerifier";
  async verify(_memory: WorkingMemory, _context?: VerifierContext): Promise<VerificationResult> {
    return { passed: true, evidence: "All checks passed", verifierName: this.name };
  }
}

describe("Integration: full pipeline simulation", () => {
  let store: Store;

  afterEach(() => {
    try {
      store?.close();
    } catch {
      // already closed
    }
  });

  it("complete pipeline produces authoritative artifact", () => {
    const memory = new WorkingMemory();
    memory.setTask(SIMPLE_TASK);

    // Simulate generator
    memory.setDraft(SIMPLE_CODE);
    expect(memory.draft).toBe(SIMPLE_CODE);

    // Simulate critic
    memory.setCritique(SIMPLE_CRITIQUE);
    expect(memory.critique).toBe(SIMPLE_CRITIQUE);

    // Simulate judge
    memory.setFinalCandidate(SIMPLE_FINAL);
    expect(memory.finalCandidate).toBe(SIMPLE_FINAL);

    // Simulate verification passing
    memory.setVerification(true, "All tests passed");
    expect(memory.verificationPassed).toBe(true);
    expect(memory.authoritativeArtifact).toBe(SIMPLE_FINAL);
  });

  it("pipeline with policy verifier rejects dangerous artifacts", async () => {
    const memory = new WorkingMemory();
    memory.setTask("clean up temp files");
    memory.setFinalCandidate("rm -rf /");

    const verifier = new PolicyVerifier();
    const result = await verifier.verify(memory, { task: "clean up" });

    expect(result.passed).toBe(false);
    expect(result.evidence).toContain("cmd-rm-rf");
  });

  it("pipeline with policy verifier accepts safe artifacts", async () => {
    const memory = new WorkingMemory();
    memory.setTask("add two numbers");
    memory.setFinalCandidate(SIMPLE_FINAL);

    const verifier = new PolicyVerifier();
    const result = await verifier.verify(memory, { task: "add two numbers" });

    expect(result.passed).toBe(true);
  });

  it("with store: records outcome and admits artifact", () => {
    store = createTestStore();
    const memory = new WorkingMemory();
    memory.setTask(SIMPLE_TASK);
    memory.setDraft(SIMPLE_CODE);
    memory.setCritique(SIMPLE_CRITIQUE);
    memory.setFinalCandidate(SIMPLE_FINAL);
    memory.setVerification(true, "Tests passed");

    // Record outcome
    recordOutcome(store, true, 1.5, SIMPLE_TASK.slice(0, 100));

    // Admit to verified memory
    const artifactRef = `artifact_${Date.now()}`;
    store.addVerified(artifactRef, "Test artifact", SIMPLE_FINAL);

    // Verify stored correctly
    const outcomes = getRecentOutcomes(store);
    expect(outcomes.length).toBe(1);
    expect(outcomes[0]!.verification_passed).toBe(true);

    const verified = store.getRecentVerified(5);
    expect(verified.length).toBe(1);
    expect(verified[0]!.content_preview).toBe(SIMPLE_FINAL);
  });

  it("with store: checkpoint records entity state", () => {
    store = createTestStore();

    store.addVerified("art-1", "First artifact", "content 1");
    store.writeCheckpoint("0.9.0", "graph-hash-123", "mem-hash-456", ["art-1"]);

    const checkpoints = store.listCheckpoints();
    expect(checkpoints.length).toBe(1);
    expect(checkpoints[0]!.entity_version).toBe("0.9.0");
    expect(checkpoints[0]!.artifact_refs).toEqual(["art-1"]);
  });
});
