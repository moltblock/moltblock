/**
 * Agent graph schema: DAG of nodes (role + model_binding) and edges (data flow).
 */

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const GraphNodeSchema = z.object({
  id: z.string().describe("Unique node id (e.g. generator, critic, judge)"),
  role: z.string().describe("Role name: generator, critic, judge, router, etc."),
  binding: z.string().describe("Key into bindings dict (e.g. generator, critic)"),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  from: z.string().describe("Source node id"),
  to: z.string().describe("Target node id"),
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const AgentGraphSchema = z.object({
  nodes: z.array(GraphNodeSchema).default([]),
  edges: z.array(GraphEdgeSchema).default([]),
  final_node: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Node whose output is the final candidate for verification (default: node with no outgoing edges)"
    ),
});

export type AgentGraphData = z.infer<typeof AgentGraphSchema>;

/**
 * Declarative agent graph: nodes and edges. Verifier runs on final node(s) output.
 */
export class AgentGraph {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
  readonly finalNode: string | null;

  constructor(data: AgentGraphData) {
    this.nodes = data.nodes;
    this.edges = data.edges;
    this.finalNode = data.final_node ?? null;
  }

  /**
   * Return list of node ids that have an edge into nodeId.
   */
  predecessors(nodeId: string): string[] {
    return this.edges.filter((e) => e.to === nodeId).map((e) => e.from);
  }

  /**
   * Return list of node ids that nodeId has an edge to.
   */
  successors(nodeId: string): string[] {
    return this.edges.filter((e) => e.from === nodeId).map((e) => e.to);
  }

  /**
   * Return node ids in topological order (inputs before outputs).
   */
  topologicalOrder(): string[] {
    const nodeIds = new Set(this.nodes.map((n) => n.id));
    const inDegree: Record<string, number> = {};
    for (const nid of nodeIds) {
      inDegree[nid] = 0;
    }
    for (const e of this.edges) {
      if (nodeIds.has(e.to)) {
        inDegree[e.to] = (inDegree[e.to] ?? 0) + 1;
      }
    }

    const order: string[] = [];
    while (order.length < nodeIds.size) {
      const ready = [...nodeIds].filter(
        (nid) => !order.includes(nid) && inDegree[nid] === 0
      );
      if (ready.length === 0) {
        break; // cycle or done
      }
      order.push(...ready);
      for (const nid of ready) {
        for (const s of this.successors(nid)) {
          if (inDegree[s] !== undefined) {
            inDegree[s]--;
          }
        }
      }
    }
    return order;
  }

  /**
   * Node whose output goes to verifier. Explicit final_node or single node with no outgoing edges.
   */
  getFinalNodeId(): string | null {
    if (this.finalNode) {
      return this.finalNode;
    }
    const candidates = this.nodes
      .filter((n) => this.successors(n.id).length === 0)
      .map((n) => n.id);
    return candidates.length === 1 ? (candidates[0] ?? null) : null;
  }

  /**
   * Serialize to JSON string.
   */
  toJSON(): string {
    return JSON.stringify({
      nodes: this.nodes,
      edges: this.edges,
      final_node: this.finalNode,
    });
  }

  /**
   * Load graph from JSON or YAML file.
   */
  static load(filePath: string): AgentGraph {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Graph file not found: ${resolved}`);
    }
    const raw = fs.readFileSync(resolved, "utf-8");
    const ext = path.extname(filePath).toLowerCase();

    let data: unknown;
    if (ext === ".yaml" || ext === ".yml") {
      // Dynamic import for yaml
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const yaml = require("js-yaml");
        data = yaml.load(raw);
      } catch {
        throw new Error("js-yaml required for YAML graphs: npm install js-yaml");
      }
    } else {
      data = JSON.parse(raw);
    }

    const parsed = AgentGraphSchema.parse(data);
    return new AgentGraph(parsed);
  }

  /**
   * Create graph from data object.
   */
  static fromData(data: AgentGraphData): AgentGraph {
    return new AgentGraph(AgentGraphSchema.parse(data));
  }
}
