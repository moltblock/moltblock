/**
 * Tests for graph-runner execution: partial results, continueOnError, node failures (Milestone 1b).
 */

import { describe, it, expect } from "vitest";
import { AgentGraph } from "../src/graph-schema.js";
import { GraphRunner } from "../src/graph-runner.js";
import { WorkingMemory } from "../src/memory.js";
import type { Verifier, VerificationResult, VerifierContext } from "../src/verifier-interface.js";

/** A verifier that always passes. */
class AlwaysPassVerifier implements Verifier {
  readonly name = "AlwaysPass";
  async verify(_memory: WorkingMemory, _context?: VerifierContext): Promise<VerificationResult> {
    return { passed: true, evidence: "auto-pass", verifierName: this.name };
  }
}

/** A verifier that always fails. */
class AlwaysFailVerifier implements Verifier {
  readonly name = "AlwaysFail";
  async verify(_memory: WorkingMemory, _context?: VerifierContext): Promise<VerificationResult> {
    return { passed: false, evidence: "auto-fail", verifierName: this.name };
  }
}

function makeMinimalGraph(): AgentGraph {
  return AgentGraph.fromData({
    nodes: [
      { id: "generator", role: "generator", binding: "generator" },
      { id: "critic", role: "critic", binding: "critic" },
      { id: "judge", role: "judge", binding: "judge" },
    ],
    edges: [
      { from: "generator", to: "critic" },
      { from: "generator", to: "judge" },
      { from: "critic", to: "judge" },
    ],
  });
}

const mockBindings = {
  generator: { backend: "local", baseUrl: "http://localhost:1/v1", apiKey: null, model: "test", maxRetries: 0, timeoutMs: 1000 },
  critic: { backend: "local", baseUrl: "http://localhost:1/v1", apiKey: null, model: "test", maxRetries: 0, timeoutMs: 1000 },
  judge: { backend: "local", baseUrl: "http://localhost:1/v1", apiKey: null, model: "test", maxRetries: 0, timeoutMs: 1000 },
};

describe("GraphRunner continueOnError", () => {
  it("throws on node failure by default", async () => {
    const graph = makeMinimalGraph();
    const runner = new GraphRunner(graph, mockBindings, {
      verifier: new AlwaysPassVerifier(),
    });

    await expect(
      runner.run("test task")
    ).rejects.toThrow();
  });

  it("continues on error when continueOnError=true", async () => {
    const graph = makeMinimalGraph();
    const runner = new GraphRunner(graph, mockBindings, {
      verifier: new AlwaysFailVerifier(),
    });

    const memory = await runner.run("test task", { continueOnError: true });

    // Should complete without throwing
    expect(memory).toBeDefined();
    expect(memory.task).toBe("test task");

    // Nodes should have errored
    const nodeErrors = memory.meta["nodeErrors"] as Record<string, string> | undefined;
    expect(nodeErrors).toBeDefined();
    expect(Object.keys(nodeErrors!).length).toBeGreaterThan(0);
  });

  it("records node errors in memory.meta.nodeErrors", async () => {
    const graph = makeMinimalGraph();
    const runner = new GraphRunner(graph, mockBindings, {
      verifier: new AlwaysPassVerifier(),
    });

    const memory = await runner.run("test task", { continueOnError: true });

    const nodeErrors = memory.meta["nodeErrors"] as Record<string, string>;
    expect(nodeErrors).toBeDefined();
    // All three nodes should have failed (unreachable localhost:1)
    expect(nodeErrors["generator"]).toBeDefined();
    expect(typeof nodeErrors["generator"]).toBe("string");
  });

  it("sets empty string for failed node slots", async () => {
    const graph = makeMinimalGraph();
    const runner = new GraphRunner(graph, mockBindings, {
      verifier: new AlwaysPassVerifier(),
    });

    const memory = await runner.run("test task", { continueOnError: true });

    expect(memory.getSlot("generator")).toBe("");
    expect(memory.getSlot("critic")).toBe("");
    expect(memory.getSlot("judge")).toBe("");
  });

  it("final candidate is empty string when all nodes fail", async () => {
    const graph = makeMinimalGraph();
    const runner = new GraphRunner(graph, mockBindings, {
      verifier: new AlwaysFailVerifier(),
    });

    const memory = await runner.run("test task", { continueOnError: true });
    expect(memory.finalCandidate).toBe("");
  });

  it("verification still runs after node failures with continueOnError", async () => {
    const graph = makeMinimalGraph();
    const runner = new GraphRunner(graph, mockBindings, {
      verifier: new AlwaysFailVerifier(),
    });

    const memory = await runner.run("test task", { continueOnError: true });
    expect(memory.verificationPassed).toBe(false);
    expect(memory.verificationEvidence).toBe("auto-fail");
  });
});

describe("GraphRunner with pluggable verifier", () => {
  it("uses AlwaysPassVerifier correctly", async () => {
    const graph = makeMinimalGraph();
    const runner = new GraphRunner(graph, mockBindings, {
      verifier: new AlwaysPassVerifier(),
    });

    const memory = await runner.run("test task", { continueOnError: true });
    expect(memory.verificationPassed).toBe(true);
    expect(memory.verificationEvidence).toBe("auto-pass");
  });

  it("uses AlwaysFailVerifier correctly", async () => {
    const graph = makeMinimalGraph();
    const runner = new GraphRunner(graph, mockBindings, {
      verifier: new AlwaysFailVerifier(),
    });

    const memory = await runner.run("test task", { continueOnError: true });
    expect(memory.verificationPassed).toBe(false);
  });
});
