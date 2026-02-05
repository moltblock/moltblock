/**
 * Tests for agent graph schema (no LLM).
 */

import path from "node:path";
import { describe, it, expect } from "vitest";
import { AgentGraph } from "../src/graph-schema.js";

describe("graph-schema", () => {
  it("loads graph from JSON file", () => {
    const configPath = path.resolve(
      import.meta.dirname,
      "..",
      "config",
      "code_entity_graph.json"
    );
    const graph = AgentGraph.load(configPath);

    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);

    const ids = new Set(graph.nodes.map((n) => n.id));
    expect(ids).toEqual(new Set(["generator", "critic", "judge"]));
    expect(graph.getFinalNodeId()).toBe("judge");
  });

  it("computes topological order correctly", () => {
    const graph = AgentGraph.fromData({
      nodes: [
        { id: "a", role: "generator", binding: "g" },
        { id: "b", role: "critic", binding: "c" },
        { id: "c", role: "judge", binding: "j" },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
    });

    const order = graph.topologicalOrder();
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("c"));
  });

  it("computes predecessors and successors correctly", () => {
    const graph = AgentGraph.fromData({
      nodes: [
        { id: "gen", role: "generator", binding: "g" },
        { id: "crit", role: "critic", binding: "c" },
      ],
      edges: [{ from: "gen", to: "crit" }],
    });

    expect(graph.predecessors("crit")).toEqual(["gen"]);
    expect(graph.successors("gen")).toEqual(["crit"]);
    expect(graph.predecessors("gen")).toEqual([]);
    expect(graph.successors("crit")).toEqual([]);
  });

  it("getFinalNodeId returns node with no outgoing edges", () => {
    const graph = AgentGraph.fromData({
      nodes: [
        { id: "a", role: "generator", binding: "g" },
        { id: "b", role: "judge", binding: "j" },
      ],
      edges: [{ from: "a", to: "b" }],
    });

    expect(graph.getFinalNodeId()).toBe("b");
  });

  it("getFinalNodeId uses explicit final_node", () => {
    const graph = AgentGraph.fromData({
      nodes: [
        { id: "a", role: "generator", binding: "g" },
        { id: "b", role: "judge", binding: "j" },
      ],
      edges: [{ from: "a", to: "b" }],
      final_node: "a",
    });

    expect(graph.getFinalNodeId()).toBe("a");
  });

  it("toJSON serializes graph correctly", () => {
    const graph = AgentGraph.fromData({
      nodes: [{ id: "gen", role: "generator", binding: "g" }],
      edges: [],
      final_node: "gen",
    });

    const json = JSON.parse(graph.toJSON());
    expect(json.nodes).toHaveLength(1);
    expect(json.final_node).toBe("gen");
  });
});
