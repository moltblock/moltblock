"""Tests for agent graph schema and runner (no LLM)."""

from pathlib import Path

import pytest

from moltblock.graph_schema import AgentGraph, GraphEdge, GraphNode


def test_graph_load_json() -> None:
    config_path = Path(__file__).resolve().parent.parent / "config" / "code_entity_graph.json"
    graph = AgentGraph.load(config_path)
    assert len(graph.nodes) == 3
    assert len(graph.edges) == 2
    ids = {n.id for n in graph.nodes}
    assert ids == {"generator", "critic", "judge"}
    assert graph.get_final_node_id() == "judge"


def test_graph_topo_order() -> None:
    graph = AgentGraph(
        nodes=[
            GraphNode(id="a", role="generator", binding="g"),
            GraphNode(id="b", role="critic", binding="c"),
            GraphNode(id="c", role="judge", binding="j"),
        ],
        edges=[
            GraphEdge(from_node="a", to_node="b"),
            GraphEdge(from_node="b", to_node="c"),
        ],
    )
    order = graph.topological_order()
    assert order.index("a") < order.index("b")
    assert order.index("b") < order.index("c")


def test_graph_predecessors_successors() -> None:
    graph = AgentGraph(
        nodes=[
            GraphNode(id="gen", role="generator", binding="g"),
            GraphNode(id="crit", role="critic", binding="c"),
        ],
        edges=[GraphEdge(from_node="gen", to_node="crit")],
    )
    assert graph.predecessors("crit") == ["gen"]
    assert graph.successors("gen") == ["crit"]
    assert graph.predecessors("gen") == []
    assert graph.successors("crit") == []
