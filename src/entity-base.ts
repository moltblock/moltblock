/**
 * Generic Entity: pluggable verifier and domain support for any task type.
 * CodeEntity remains unchanged for backward compatibility.
 */

import { runCritic, runGenerator, runJudge } from "./agents.js";
import { defaultCodeEntityBindings, type ModelBinding } from "./config.js";
import { LLMGateway } from "./gateway.js";
import { WorkingMemory } from "./memory.js";
import { Store, hashMemory, recordOutcome } from "./persistence.js";
import { PolicyVerifier } from "./policy-verifier.js";
import { validateTask } from "./validation.js";
import type { Verifier, VerifierContext } from "./verifier-interface.js";

/** Options for constructing a generic Entity. */
export interface EntityOptions {
  /** Verifier to gate artifacts. Defaults to PolicyVerifier. */
  verifier?: Verifier;
  /** Domain for agent prompts. Defaults to "general". */
  domain?: string;
  /** Per-role model bindings. Auto-detected if omitted. */
  bindings?: Record<string, ModelBinding>;
}

/**
 * Generic Entity: same Generator -> Critic -> Judge pipeline as CodeEntity,
 * but with a pluggable verifier and domain-aware prompts.
 * Supports degraded fallback: if critic/judge fails, execution continues with available data.
 */
export class Entity {
  private gateways: Record<string, LLMGateway>;
  private verifier: Verifier;
  private domain: string;

  constructor(options?: EntityOptions) {
    const resolvedBindings = options?.bindings ?? defaultCodeEntityBindings();
    this.verifier = options?.verifier ?? new PolicyVerifier();
    this.domain = options?.domain ?? "general";

    this.gateways = {
      generator: new LLMGateway(resolvedBindings["generator"]!),
      critic: new LLMGateway(resolvedBindings["critic"]!),
      judge: new LLMGateway(resolvedBindings["judge"]!),
    };
  }

  /**
   * One full loop: task -> Generator -> Critic -> Judge -> Verifier -> gating.
   * Returns working memory with authoritative_artifact set only if verification passed.
   *
   * Degraded fallback:
   * - Generator fails -> return immediately with verification failed + error evidence
   * - Critic fails -> proceed to judge with empty critique
   * - Judge fails -> use draft as final candidate
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
      entityVersion = "0.5.0",
      writeCheckpointAfter = false,
    } = options;

    // Validate input
    const taskValidation = validateTask(task);
    if (!taskValidation.valid) {
      throw new Error(`Invalid task: ${taskValidation.error}`);
    }

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

    // Generator — if it fails, we have nothing to work with
    try {
      await runGenerator(this.gateways["generator"]!, memory, store ?? null, this.domain);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      memory.meta["generatorError"] = errMsg;
      memory.setVerification(false, `Generator failed: ${errMsg}`);
      return memory;
    }

    // Critic — if it fails, proceed to judge with empty critique (degraded)
    try {
      await runCritic(this.gateways["critic"]!, memory, store ?? null, this.domain);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      memory.meta["criticError"] = errMsg;
      memory.setCritique("");
    }

    // Judge — if it fails, use draft as final candidate (degraded)
    try {
      await runJudge(this.gateways["judge"]!, memory, store ?? null, this.domain);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      memory.meta["judgeError"] = errMsg;
      memory.setFinalCandidate(memory.draft);
    }

    // Run pluggable verifier
    const ctx: VerifierContext = {
      task,
      testCode,
      domain: this.domain,
    };
    const result = await this.verifier.verify(memory, ctx);
    memory.setVerification(result.passed, result.evidence);

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
        const graphHash = `entity-${this.domain}`;
        const refs = [artifactRef];
        const memHash = hashMemory(refs);
        store.writeCheckpoint(entityVersion, graphHash, memHash, refs);
      }
    }

    return memory;
  }
}
