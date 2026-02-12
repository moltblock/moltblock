/**
 * Shared test fixtures: tasks, code samples, graph configs.
 */

import type { AgentGraphData } from "../../src/graph-schema.js";

/** Simple task string for tests. */
export const SIMPLE_TASK = "Implement a function add(a: number, b: number) that returns a + b.";

/** Simple test code for verifier tests. */
export const SIMPLE_TEST_CODE = `
import { expect, test } from "vitest";
test("add", () => {
  expect(add(1, 2)).toBe(3);
});
`;

/** Simple generated code response. */
export const SIMPLE_CODE = `function add(a: number, b: number): number {
  return a + b;
}`;

/** Simple critique response. */
export const SIMPLE_CRITIQUE = "The code is correct but could add type validation.";

/** Simple judge final response. */
export const SIMPLE_FINAL = `export function add(a: number, b: number): number {
  return a + b;
}`;

/** A 3-node generator->critic->judge graph config. */
export const STANDARD_GRAPH: AgentGraphData = {
  nodes: [
    { id: "generator", role: "generator", binding: "generator" },
    { id: "critic", role: "critic", binding: "critic" },
    { id: "judge", role: "judge", binding: "judge" },
  ],
  edges: [
    { from: "generator", to: "critic" },
    { from: "generator", to: "judge" },
    { from: "critic", to: "judge" },
  ],
};

/** A graph with a router node prepended. */
export const ROUTER_GRAPH: AgentGraphData = {
  nodes: [
    { id: "router", role: "router", binding: "generator" },
    { id: "generator", role: "generator", binding: "generator" },
    { id: "critic", role: "critic", binding: "critic" },
    { id: "judge", role: "judge", binding: "judge" },
  ],
  edges: [
    { from: "router", to: "generator" },
    { from: "generator", to: "critic" },
    { from: "generator", to: "judge" },
    { from: "critic", to: "judge" },
  ],
};
