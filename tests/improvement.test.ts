import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Store, recordOutcome } from "../src/persistence.js";
import {
  critiqueStrategies,
  applySuggestion,
  runEval,
  runImprovementCycle,
} from "../src/improvement.js";
import { getStrategy } from "../src/persistence.js";

describe("improvement", () => {
  let store: Store;

  beforeEach(() => {
    store = new Store({ path: ":memory:", entityId: "test-improve" });
  });

  afterEach(() => {
    store.close();
  });

  describe("critiqueStrategies", () => {
    it("returns empty when fewer than 3 outcomes", () => {
      recordOutcome(store, false, 1.0, "task1");
      recordOutcome(store, false, 1.0, "task2");
      expect(critiqueStrategies(store)).toEqual([]);
    });

    it("returns suggestions when fail rate >= 50%", () => {
      recordOutcome(store, false, 1.0, "task1");
      recordOutcome(store, false, 1.0, "task2");
      recordOutcome(store, false, 1.0, "task3");

      const suggestions = critiqueStrategies(store);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]?.role).toBe("generator");
    });

    it("returns no suggestions when pass rate is high", () => {
      recordOutcome(store, true, 1.0, "task1");
      recordOutcome(store, true, 1.0, "task2");
      recordOutcome(store, true, 1.0, "task3");

      expect(critiqueStrategies(store)).toEqual([]);
    });

    it("uses general domain suggestions when domain is not code", () => {
      recordOutcome(store, false, 1.0, "task1");
      recordOutcome(store, false, 1.0, "task2");
      recordOutcome(store, false, 1.0, "task3");

      const suggestions = critiqueStrategies(store, 10, "general");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]?.suggestion).toContain("clear");
    });
  });

  describe("applySuggestion", () => {
    it("sets a strategy for a role", () => {
      applySuggestion(store, "generator", "New prompt.");
      expect(getStrategy(store, "generator")).toBe("New prompt.");
    });
  });

  describe("runEval", () => {
    it("counts passing tasks", async () => {
      const runTask = async () => true;
      const result = await runEval(runTask, ["a", "b", "c"]);
      expect(result.passed).toBe(3);
      expect(result.total).toBe(3);
    });

    it("counts failing tasks", async () => {
      const runTask = async () => false;
      const result = await runEval(runTask, ["a", "b"]);
      expect(result.passed).toBe(0);
      expect(result.total).toBe(2);
    });

    it("records outcomes to store when provided", async () => {
      const runTask = async () => true;
      await runEval(runTask, ["a"], store);

      const outcomes = store.db
        .prepare("SELECT * FROM outcomes")
        .all();
      expect(outcomes).toHaveLength(1);
    });

    it("treats thrown errors as failures", async () => {
      const runTask = async () => {
        throw new Error("boom");
      };
      const result = await runEval(runTask, ["a", "b"]);
      expect(result.passed).toBe(0);
      expect(result.total).toBe(2);
    });
  });

  describe("runImprovementCycle", () => {
    it("returns passed, total, and suggestions", async () => {
      const runTask = async () => false;
      const result = await runImprovementCycle(
        store,
        runTask,
        ["a", "b", "c"]
      );
      expect(result.total).toBe(3);
      expect(result.passed).toBe(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });
});
