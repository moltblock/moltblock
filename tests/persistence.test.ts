/**
 * Tests for persistence (verified memory + checkpoints).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  Store,
  hashGraph,
  hashMemory,
  recordOutcome,
  getRecentOutcomes,
  getStrategy,
  setStrategy,
} from "../src/persistence.js";

describe("persistence", () => {
  let store: Store;

  beforeEach(() => {
    store = new Store({ path: ":memory:", entityId: "test" });
  });

  afterEach(() => {
    store.close();
  });

  it("addVerified and getRecentVerified work correctly", () => {
    store.addVerified("ref1", "First", "code block 1");
    store.addVerified("ref2", "Second", "code block 2");

    const recent = store.getRecentVerified(5);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.artifact_ref).toBe("ref2");
    expect(recent[0]?.summary).toBe("Second");
    expect(recent[1]?.artifact_ref).toBe("ref1");
  });

  it("writeCheckpoint and listCheckpoints work correctly", () => {
    store.writeCheckpoint("0.2.0", "abc123", "mem456", ["ref1", "ref2"]);

    const cps = store.listCheckpoints(10);
    expect(cps).toHaveLength(1);
    expect(cps[0]?.entity_version).toBe("0.2.0");
    expect(cps[0]?.graph_hash).toBe("abc123");
    expect(cps[0]?.artifact_refs).toEqual(["ref1", "ref2"]);
  });

  it("hashGraph produces consistent hash", () => {
    const h = hashGraph('{"nodes":[]}');
    expect(h).toHaveLength(16);
    expect(hashGraph('{"nodes":[]}')).toBe(h);
  });

  it("hashMemory produces consistent hash", () => {
    const h = hashMemory(["a", "b"]);
    expect(h).toHaveLength(16);
    expect(hashMemory(["a", "b"])).toBe(h);
    // Order shouldn't matter since we sort
    expect(hashMemory(["b", "a"])).toBe(h);
  });

  it("recordOutcome and getRecentOutcomes work correctly", () => {
    recordOutcome(store, true, 1.0, "task1");
    recordOutcome(store, false, undefined, "task2");

    const outcomes = getRecentOutcomes(store, 5);
    expect(outcomes).toHaveLength(2);
    expect(outcomes[0]?.verification_passed).toBe(false);
    expect(outcomes[1]?.verification_passed).toBe(true);
  });

  it("getStrategy and setStrategy work correctly", () => {
    expect(getStrategy(store, "generator")).toBeNull();

    setStrategy(store, "generator", "Custom generator prompt.");
    expect(getStrategy(store, "generator")).toBe("Custom generator prompt.");

    // Setting again should create a new version
    setStrategy(store, "generator", "Updated prompt.");
    expect(getStrategy(store, "generator")).toBe("Updated prompt.");
  });
});
