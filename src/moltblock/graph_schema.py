"""Agent graph schema: DAG of nodes (role + model_binding) and edges (data flow)."""

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field


class GraphNode(BaseModel):
    """One node in the agent graph: id, role, and which model binding to use."""

    id: str = Field(description="Unique node id (e.g. generator, critic, judge)")
    role: str = Field(description="Role name: generator, critic, judge, router, etc.")
    binding: str = Field(description="Key into bindings dict (e.g. generator, critic)")


class GraphEdge(BaseModel):
    """Edge: from node output -> to node input."""

    model_config = ConfigDict(populate_by_name=True)

    from_node: str = Field(alias="from", description="Source node id")
    to_node: str = Field(alias="to", description="Target node id")


class AgentGraph(BaseModel):
    """Declarative agent graph: nodes and edges. Verifier runs on final node(s) output."""

    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    final_node: str | None = Field(
        default=None,
        description="Node whose output is the final candidate for verification (default: node with no outgoing edges)",
    )

    def predecessors(self, node_id: str) -> list[str]:
        """Return list of node ids that have an edge into node_id."""
        return [e.from_node for e in self.edges if e.to_node == node_id]

    def successors(self, node_id: str) -> list[str]:
        """Return list of node ids that node_id has an edge to."""
        return [e.to_node for e in self.edges if e.from_node == node_id]

    def topological_order(self) -> list[str]:
        """Return node ids in topological order (inputs before outputs)."""
        node_ids = {n.id for n in self.nodes}
        in_degree = {nid: 0 for nid in node_ids}
        for e in self.edges:
            if e.to_node in node_ids:
                in_degree[e.to_node] += 1
        order: list[str] = []
        while len(order) < len(node_ids):
            ready = [nid for nid in node_ids if nid not in order and in_degree[nid] == 0]
            if not ready:
                break
            order.extend(ready)
            for nid in ready:
                for s in self.successors(nid):
                    in_degree[s] -= 1
        return order

    def get_final_node_id(self) -> str | None:
        """Node whose output goes to verifier. Explicit final_node or single node with no outgoing edges."""
        if self.final_node:
            return self.final_node
        candidates = [n.id for n in self.nodes if not self.successors(n.id)]
        return candidates[0] if len(candidates) == 1 else None

    @classmethod
    def load(cls, path: str | Path) -> "AgentGraph":
        """Load graph from JSON or YAML file."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(path)
        raw = path.read_text(encoding="utf-8")
        if path.suffix.lower() in (".yaml", ".yml"):
            try:
                import yaml
                data = yaml.safe_load(raw)
            except ImportError:
                raise ImportError("PyYAML required for YAML graphs: pip install pyyaml")
        else:
            import json
            data = json.loads(raw)
        return cls.model_validate(data)
