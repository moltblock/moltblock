"""Working memory: shared state for one task (drafts, critique, final artifact, verification result)."""

from dataclasses import dataclass, field


@dataclass
class WorkingMemory:
    """In-memory scratchpad for a single run of the agent graph."""

    task: str = ""
    draft: str = ""
    critique: str = ""
    final_candidate: str = ""
    verification_passed: bool = False
    verification_evidence: str = ""
    authoritative_artifact: str = ""
    meta: dict = field(default_factory=dict)
    # Graph runner: node_id -> output (filled by graph execution)
    slots: dict = field(default_factory=dict)
    # Injected from long-term memory for agent context (read-only)
    long_term_context: str = ""

    def set_task(self, task: str) -> None:
        self.task = task

    def set_draft(self, draft: str) -> None:
        self.draft = draft

    def set_critique(self, critique: str) -> None:
        self.critique = critique

    def set_final_candidate(self, candidate: str) -> None:
        self.final_candidate = candidate

    def set_verification(self, passed: bool, evidence: str = "") -> None:
        self.verification_passed = passed
        self.verification_evidence = evidence
        if passed:
            self.authoritative_artifact = self.final_candidate

    def set_slot(self, node_id: str, content: str) -> None:
        self.slots[node_id] = content

    def get_slot(self, node_id: str) -> str:
        return self.slots.get(node_id, "")
