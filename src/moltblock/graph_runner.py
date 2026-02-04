"""Execute an agent graph: load DAG, run nodes in topological order, then verifier."""

import time

from .agents import run_role
from .config import ModelBinding, default_code_entity_bindings
from .gateway import LLMGateway
from .graph_schema import AgentGraph
from .memory import WorkingMemory
from .persistence import Store, hash_graph, hash_memory, record_outcome
from .verifier import run_verifier


class GraphRunner:
    """
    Runs a declarative agent graph: nodes (role + binding), edges (data flow).
    After all nodes run, verifier runs on the final node's output and gating is applied.
    """

    def __init__(
        self,
        graph: AgentGraph,
        bindings: dict[str, ModelBinding] | None = None,
    ) -> None:
        self.graph = graph
        bindings = bindings or default_code_entity_bindings()
        self._gateways: dict[str, LLMGateway] = {}
        for node in graph.nodes:
            if node.role == "verifier":
                continue
            key = node.binding
            if key not in self._gateways:
                if key not in bindings:
                    raise ValueError(f"Binding key {key!r} not in bindings")
                self._gateways[key] = LLMGateway(bindings[key])

    def run(
        self,
        task: str,
        test_code: str | None = None,
        store: Store | None = None,
        entity_version: str = "0.2.0",
        write_checkpoint_after: bool = False,
    ) -> WorkingMemory:
        """
        Execute graph: task in -> run nodes in topo order -> run verifier on final node -> gating.
        If store is provided and verification passed: admit to verified memory; optionally write checkpoint.
        Returns working memory with slots filled and authoritative_artifact set iff verification passed.
        """
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

        order = self.graph.topological_order()
        for node_id in order:
            node = next((n for n in self.graph.nodes if n.id == node_id), None)
            if not node or node.role == "verifier":
                continue
            preds = self.graph.predecessors(node_id)
            inputs = {p: memory.get_slot(p) for p in preds}
            gateway = self._gateways.get(node.binding)
            if not gateway:
                raise ValueError(f"No gateway for binding {node.binding!r}")
            out = run_role(node.role, gateway, task, inputs, memory.long_term_context, store)
            memory.set_slot(node_id, out)

        final_id = self.graph.get_final_node_id()
        if final_id:
            memory.final_candidate = memory.get_slot(final_id)
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
                graph_config = self.graph.model_dump_json()
                graph_hash = hash_graph(graph_config)
                refs = [artifact_ref]
                mem_hash = hash_memory(refs)
                store.write_checkpoint(entity_version, graph_hash, mem_hash, refs)

        return memory
