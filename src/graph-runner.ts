/**
 * Execute an agent graph: load DAG, run nodes in topological order, then verifier.
 */

import { runRole } from "./agents.js";
import { defaultCodeEntityBindings, type ModelBinding } from "./config.js";
import { LLMGateway } from "./gateway.js";
import { AgentGraph } from "./graph-schema.js";
import { WorkingMemory } from "./memory.js";
import { Store, hashGraph, hashMemory, recordOutcome } from "./persistence.js";
import { runVerifier } from "./verifier.js";
import type { Verifier, VerifierContext } from "./verifier-interface.js";

/** Options for configuring the GraphRunner beyond bindings. */
export interface GraphRunnerOptions {
  /** Pluggable verifier. If omitted, falls back to the existing vitest-based runVerifier. */
  verifier?: Verifier;
  /** Domain for agent prompts. Defaults to "code". */
  domain?: string;
}

/**
 * Runs a declarative agent graph: nodes (role + binding), edges (data flow).
 * After all nodes run, verifier runs on the final node's output and gating is applied.
 */
export class GraphRunner {
  private graph: AgentGraph;
  private gateways: Map<string, LLMGateway> = new Map();
  private pluggableVerifier?: Verifier;
  private domain: string;

  constructor(graph: AgentGraph, bindings?: Record<string, ModelBinding>, options?: GraphRunnerOptions) {
    this.graph = graph;
    this.pluggableVerifier = options?.verifier;
    this.domain = options?.domain ?? "code";
    const resolvedBindings = bindings ?? defaultCodeEntityBindings();

    for (const node of graph.nodes) {
      if (node.role === "verifier") {
        continue;
      }
      const key = node.binding;
      if (!this.gateways.has(key)) {
        const binding = resolvedBindings[key];
        if (!binding) {
          throw new Error(`Binding key '${key}' not in bindings`);
        }
        this.gateways.set(key, new LLMGateway(binding));
      }
    }
  }

  /**
   * Execute graph: task in -> run nodes in topo order -> run verifier on final node -> gating.
   * If store is provided and verification passed: admit to verified memory; optionally write checkpoint.
   * Returns working memory with slots filled and authoritative_artifact set iff verification passed.
   */
  async run(
    task: string,
    options: {
      testCode?: string;
      store?: Store;
      entityVersion?: string;
      writeCheckpointAfter?: boolean;
    } = {}
  ): Promise<WorkingMemory> {
    const {
      testCode,
      store,
      entityVersion = "0.2.0",
      writeCheckpointAfter = false,
    } = options;

    const t0 = performance.now();
    const memory = new WorkingMemory();
    memory.setTask(task);

    // Inject long-term context from verified memory
    if (store) {
      const recent = store.getRecentVerified(5);
      const parts: string[] = [];
      for (const e of recent) {
        if (e.content_preview) {
          parts.push(e.content_preview.slice(0, 500));
        } else if (e.summary) {
          parts.push(e.summary);
        }
      }
      memory.longTermContext = parts.length > 0 ? parts.join("\n---\n") : "";
    }

    // Run nodes in topological order
    const order = this.graph.topologicalOrder();
    for (const nodeId of order) {
      const node = this.graph.nodes.find((n) => n.id === nodeId);
      if (!node || node.role === "verifier") {
        continue;
      }

      const preds = this.graph.predecessors(nodeId);
      const inputs: Record<string, string> = {};
      for (const p of preds) {
        inputs[p] = memory.getSlot(p);
      }

      const gateway = this.gateways.get(node.binding);
      if (!gateway) {
        throw new Error(`No gateway for binding '${node.binding}'`);
      }

      const out = await runRole(
        node.role,
        gateway,
        task,
        inputs,
        memory.longTermContext,
        store ?? null,
        this.domain
      );
      memory.setSlot(nodeId, out);
    }

    // Set final candidate from final node
    const finalId = this.graph.getFinalNodeId();
    if (finalId) {
      memory.finalCandidate = memory.getSlot(finalId);
    }

    // Run verification: pluggable verifier if provided, otherwise legacy runVerifier
    if (this.pluggableVerifier) {
      const ctx: VerifierContext = { task, testCode, domain: this.domain };
      const result = await this.pluggableVerifier.verify(memory, ctx);
      memory.setVerification(result.passed, result.evidence);
    } else {
      await runVerifier(memory, testCode);
    }

    // Record outcome and persist if verification passed
    const latencySec = (performance.now() - t0) / 1000;
    if (store) {
      recordOutcome(store, memory.verificationPassed, latencySec, task.slice(0, 100));
    }

    if (store && memory.verificationPassed && memory.authoritativeArtifact) {
      const artifactRef = `artifact_${Date.now()}`;
      store.addVerified(
        artifactRef,
        `Verified artifact (${memory.authoritativeArtifact.length} chars)`,
        memory.authoritativeArtifact.slice(0, 2000)
      );

      if (writeCheckpointAfter) {
        const graphConfig = this.graph.toJSON();
        const graphHashVal = hashGraph(graphConfig);
        const refs = [artifactRef];
        const memHash = hashMemory(refs);
        store.writeCheckpoint(entityVersion, graphHashVal, memHash, refs);
      }
    }

    return memory;
  }
}
