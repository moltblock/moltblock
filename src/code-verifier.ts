/**
 * CodeVerifier: adapter that wraps the existing vitest-based runVerifier into the Verifier interface.
 */

import type { WorkingMemory } from "./memory.js";
import type { Verifier, VerificationResult, VerifierContext } from "./verifier-interface.js";
import { runVerifier } from "./verifier.js";

/**
 * Wraps the existing vitest verifier (runVerifier) into the pluggable Verifier interface.
 * Uses context.testCode for the test file, same as CodeEntity.
 */
export class CodeVerifier implements Verifier {
  readonly name = "CodeVerifier";

  async verify(memory: WorkingMemory, context?: VerifierContext): Promise<VerificationResult> {
    const testCode = context?.testCode;

    // runVerifier mutates memory.verificationPassed / verificationEvidence
    await runVerifier(memory, testCode);

    return {
      passed: memory.verificationPassed,
      evidence: memory.verificationEvidence || (memory.verificationPassed ? "Verification passed." : "Verification failed."),
      verifierName: this.name,
    };
  }
}
