/**
 * Working memory: shared state for one task (drafts, critique, final artifact, verification result).
 */

/**
 * In-memory scratchpad for a single run of the agent graph.
 */
export class WorkingMemory {
  task = "";
  draft = "";
  critique = "";
  finalCandidate = "";
  verificationPassed = false;
  verificationEvidence = "";
  authoritativeArtifact = "";
  meta: Record<string, unknown> = {};
  /** Graph runner: node_id -> output (filled by graph execution) */
  slots: Record<string, string> = {};
  /** Injected from long-term memory for agent context (read-only) */
  longTermContext = "";

  setTask(task: string): void {
    this.task = task;
  }

  setDraft(draft: string): void {
    this.draft = draft;
  }

  setCritique(critique: string): void {
    this.critique = critique;
  }

  setFinalCandidate(candidate: string): void {
    this.finalCandidate = candidate;
  }

  setVerification(passed: boolean, evidence = ""): void {
    this.verificationPassed = passed;
    this.verificationEvidence = evidence;
    if (passed) {
      this.authoritativeArtifact = this.finalCandidate;
    }
  }

  setSlot(nodeId: string, content: string): void {
    this.slots[nodeId] = content;
  }

  getSlot(nodeId: string): string {
    return this.slots[nodeId] ?? "";
  }
}
