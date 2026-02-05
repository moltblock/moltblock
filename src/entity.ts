/**
 * Entity: minimal runnable loop — task in -> graph (Generator/Critic/Judge) -> Verifier -> artifact out.
 */

import { runCritic, runGenerator, runJudge } from "./agents.js";
import { defaultCodeEntityBindings, type ModelBinding } from "./config.js";
import { LLMGateway } from "./gateway.js";
import { GraphRunner } from "./graph-runner.js";
import { AgentGraph } from "./graph-schema.js";
import { WorkingMemory } from "./memory.js";
import { Store, hashMemory, recordOutcome } from "./persistence.js";
import { runVerifier } from "./verifier.js";

/**
 * Code Entity: Generator -> Critic -> Judge -> Verifier.
 * Uses working memory and per-role LLM gateways.
 */
export class CodeEntity {
  private gateways: Record<string, LLMGateway>;

  constructor(bindings?: Record<string, ModelBinding>) {
    const resolvedBindings = bindings ?? defaultCodeEntityBindings();
    this.gateways = {
      generator: new LLMGateway(resolvedBindings["generator"]!),
      critic: new LLMGateway(resolvedBindings["critic"]!),
      judge: new LLMGateway(resolvedBindings["judge"]!),
    };
  }

  /**
   * One full loop: task in -> Generator -> Critic -> Judge -> Verifier -> gating.
   * If store is provided and verification passed: admit to verified memory; optionally write checkpoint.
   * Returns working memory with authoritative_artifact set only if verification passed.
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

    // Run the agent pipeline
    await runGenerator(this.gateways["generator"]!, memory, store ?? null);
    await runCritic(this.gateways["critic"]!, memory, store ?? null);
    await runJudge(this.gateways["judge"]!, memory, store ?? null);
    await runVerifier(memory, testCode);

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
        const graphHash = "fixed-code-entity";
        const refs = [artifactRef];
        const memHash = hashMemory(refs);
        store.writeCheckpoint(entityVersion, graphHash, memHash, refs);
      }
    }

    return memory;
  }
}

/**
 * Load an Entity from a declarative graph (JSON/YAML). Returns a GraphRunner.
 */
export function loadEntityWithGraph(
  graphPath: string,
  bindings?: Record<string, ModelBinding>
): GraphRunner {
  const graph = AgentGraph.load(graphPath);
  return new GraphRunner(graph, bindings);
}
