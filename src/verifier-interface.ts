/**
 * Pluggable verifier interface: any verification strategy implements this contract.
 */

import type { WorkingMemory } from "./memory.js";

/** Result of a single verification run. */
export interface VerificationResult {
  passed: boolean;
  evidence: string;
  verifierName: string;
  /** Per-verifier details when running a composite verifier. */
  details?: VerificationResult[];
}

/** Context passed to verifiers alongside working memory. */
export interface VerifierContext {
  task?: string;
  testCode?: string;
  domain?: string;
  meta?: Record<string, unknown>;
}

/** A verifier that can gate artifacts before they gain authority. */
export interface Verifier {
  readonly name: string;
  verify(memory: WorkingMemory, context?: VerifierContext): Promise<VerificationResult>;
}
