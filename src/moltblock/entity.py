"""Entity: minimal runnable loop — task in -> graph (Generator/Critic/Judge) -> Verifier -> artifact out."""

from pathlib import Path

from .agents import run_critic, run_generator, run_judge
from .config import ModelBinding, default_code_entity_bindings
from .gateway import LLMGateway
from .graph_runner import GraphRunner
from .graph_schema import AgentGraph
from .memory import WorkingMemory
from .persistence import Store, hash_memory, record_outcome
from .verifier import run_verifier


class CodeEntity:
    """
    Code Entity: Generator -> Critic -> Judge -> Verifier.
    Uses working memory and per-role LLM gateways.
    """

    def __init__(self, bindings: dict[str, ModelBinding] | None = None) -> None:
        bindings = bindings or default_code_entity_bindings()
        self._gateways = {
            "generator": LLMGateway(bindings["generator"]),
            "critic": LLMGateway(bindings["critic"]),
            "judge": LLMGateway(bindings["judge"]),
        }

    def run(
        self,
        task: str,
        test_code: str | None = None,
        store: Store | None = None,
        entity_version: str = "0.2.0",
        write_checkpoint_after: bool = False,
    ) -> WorkingMemory:
        """
        One full loop: task in -> Generator -> Critic -> Judge -> Verifier -> gating.
        If store is provided and verification passed: admit to verified memory; optionally write checkpoint.
        Returns working memory with authoritative_artifact set only if verification passed.
        """
        import time
        t0 = time.perf_counter()
        memory = WorkingMemory()
        memory.set_task(task)

        if store:
            recent = store.get_recent_verified(5)
            parts = []
            for e in recent:
                if e.get("content_preview"):
                    parts.append(e["content_preview"][:500])
                elif e.get("summary"):
                    parts.append(e["summary"])
            memory.long_term_context = "\n---\n".join(parts) if parts else ""

        run_generator(self._gateways["generator"], memory, store)
        run_critic(self._gateways["critic"], memory, store)
        run_judge(self._gateways["judge"], memory, store)
        run_verifier(memory, test_code=test_code)

        if store:
            record_outcome(store, memory.verification_passed, time.perf_counter() - t0, task[:100])
        if store and memory.verification_passed and memory.authoritative_artifact:
            artifact_ref = f"artifact_{int(time.time() * 1000)}"
            store.add_verified(
                artifact_ref,
                summary=f"Verified artifact ({len(memory.authoritative_artifact)} chars)",
                content_preview=memory.authoritative_artifact[:2000],
            )
            if write_checkpoint_after:
                graph_hash = "fixed-code-entity"
                refs = [artifact_ref]
                mem_hash = hash_memory(refs)
                store.write_checkpoint(entity_version, graph_hash, mem_hash, refs)

        return memory


def load_entity_with_graph(
    graph_path: str | Path,
    bindings: dict[str, ModelBinding] | None = None,
) -> GraphRunner:
    """Load an Entity from a declarative graph (JSON/YAML). Returns a GraphRunner."""
    graph = AgentGraph.load(graph_path)
    return GraphRunner(graph, bindings=bindings)
