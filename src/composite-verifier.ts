/**
 * CompositeVerifier: runs multiple verifiers, all must pass.
 */

import type { WorkingMemory } from "./memory.js";
import type { Verifier, VerificationResult, VerifierContext } from "./verifier-interface.js";

export interface CompositeVerifierOptions {
  /** If true, stop at first failure. Defaults to true. */
  failFast?: boolean;
}

/**
 * Runs verifiers sequentially. All must pass for the composite to pass.
 * Fail-fast mode (default) stops at the first failure.
 * Collect-all mode runs every verifier and reports all results.
 */
export class CompositeVerifier implements Verifier {
  readonly name = "CompositeVerifier";
  private verifiers: Verifier[];
  private failFast: boolean;

  constructor(verifiers: Verifier[], options?: CompositeVerifierOptions) {
    if (verifiers.length === 0) {
      throw new Error("CompositeVerifier requires at least one verifier");
    }
    this.verifiers = verifiers;
    this.failFast = options?.failFast ?? true;
  }

  async verify(memory: WorkingMemory, context?: VerifierContext): Promise<VerificationResult> {
    const details: VerificationResult[] = [];
    let allPassed = true;

    for (const verifier of this.verifiers) {
      const result = await verifier.verify(memory, context);
      details.push(result);

      if (!result.passed) {
        allPassed = false;
        if (this.failFast) break;
      }
    }

    const evidence = details
      .map((d) => `[${d.verifierName}] ${d.passed ? "PASS" : "FAIL"}: ${d.evidence}`)
      .join("\n");

    return {
      passed: allPassed,
      evidence,
      verifierName: this.name,
      details,
    };
  }
}
