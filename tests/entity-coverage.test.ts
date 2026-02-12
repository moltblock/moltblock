/**
 * Tests for CodeEntity and Entity class branch coverage.
 * Uses vi.mock to mock agent and verifier functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WorkingMemory } from "../src/memory.js";
import { Store } from "../src/persistence.js";

// Mock agents and verifier to avoid real LLM calls
vi.mock("../src/agents.js", () => ({
  runGenerator: vi.fn(async (_gw: unknown, memory: WorkingMemory) => {
    memory.setDraft("mock draft");
  }),
  runCritic: vi.fn(async (_gw: unknown, memory: WorkingMemory) => {
    memory.setCritique("mock critique");
  }),
  runJudge: vi.fn(async (_gw: unknown, memory: WorkingMemory) => {
    memory.setFinalCandidate("mock final");
  }),
}));

vi.mock("../src/verifier.js", () => ({
  runVerifier: vi.fn(async (memory: WorkingMemory) => {
    memory.setVerification(true, "mock verification passed");
  }),
}));

// Mock gateway so constructor doesn't connect to real servers
// Must use a class that can be instantiated with `new`
vi.mock("../src/gateway.js", () => {
  class MockGateway {
    async complete() { return "mock response"; }
  }
  return {
    LLMGateway: MockGateway,
    sanitizeBaseUrl: function sanitizeBaseUrl(url: string) {
      try {
        return new URL(url).hostname;
      } catch {
        return "<invalid-url>";
      }
    },
  };
});

// Mock config to avoid file system reads
vi.mock("../src/config.js", async () => {
  const actual = await vi.importActual("../src/config.js") as Record<string, unknown>;
  return {
    ...actual,
    defaultCodeEntityBindings: function defaultCodeEntityBindings() {
      return {
        generator: { backend: "mock", baseUrl: "http://localhost:1/v1", apiKey: null, model: "test" },
        critic: { backend: "mock", baseUrl: "http://localhost:1/v1", apiKey: null, model: "test" },
        judge: { backend: "mock", baseUrl: "http://localhost:1/v1", apiKey: null, model: "test" },
      };
    },
  };
});

describe("CodeEntity", () => {
  let store: Store;

  beforeEach(() => {
    store = new Store({ path: ":memory:", entityId: "test" });
    vi.clearAllMocks();
  });

  afterEach(() => {
    store?.close();
  });

  it("runs full pipeline successfully", async () => {
    const { CodeEntity } = await import("../src/entity.js");
    const entity = new CodeEntity();
    const memory = await entity.run("Implement add function");

    expect(memory.draft).toBe("mock draft");
    expect(memory.critique).toBe("mock critique");
    expect(memory.finalCandidate).toBe("mock final");
    expect(memory.verificationPassed).toBe(true);
  });

  it("validates task input", async () => {
    const { CodeEntity } = await import("../src/entity.js");
    const entity = new CodeEntity();

    await expect(entity.run("")).rejects.toThrow(/Invalid task/);
  });

  it("runs without test code when testCode is empty string", async () => {
    const { CodeEntity } = await import("../src/entity.js");
    const entity = new CodeEntity();

    // Empty string is falsy, so testCode validation is skipped
    const memory = await entity.run("valid task", { testCode: "" });
    expect(memory.verificationPassed).toBe(true);
  });

  it("runs with store and records outcome", async () => {
    const { CodeEntity } = await import("../src/entity.js");
    const entity = new CodeEntity();
    const memory = await entity.run("test task", { store });

    expect(memory.verificationPassed).toBe(true);
    const db = store.getDb();
    const outcomes = db.prepare("SELECT * FROM outcomes WHERE entity_id = ?").all("test");
    expect(outcomes.length).toBe(1);
  });

  it("admits verified artifact to store", async () => {
    const { CodeEntity } = await import("../src/entity.js");
    const entity = new CodeEntity();
    await entity.run("test task", { store });

    const verified = store.getRecentVerified(5);
    expect(verified.length).toBe(1);
  });

  it("writes checkpoint when requested", async () => {
    const { CodeEntity } = await import("../src/entity.js");
    const entity = new CodeEntity();
    await entity.run("test task", {
      store,
      writeCheckpointAfter: true,
      entityVersion: "1.0.0",
    });

    const checkpoints = store.listCheckpoints();
    expect(checkpoints.length).toBe(1);
    expect(checkpoints[0]!.entity_version).toBe("1.0.0");
  });

  it("injects long-term context from store", async () => {
    store.addVerified("prev-art", "Previous result", "some prior content");

    const { CodeEntity } = await import("../src/entity.js");
    const entity = new CodeEntity();
    const memory = await entity.run("test task", { store });

    expect(memory.longTermContext).toContain("some prior content");
  });

  it("handles generator failure with degraded fallback", async () => {
    const agents = await import("../src/agents.js");
    vi.mocked(agents.runGenerator).mockRejectedValueOnce(new Error("LLM down"));

    const { CodeEntity } = await import("../src/entity.js");
    const entity = new CodeEntity();
    const memory = await entity.run("test task");

    expect(memory.verificationPassed).toBe(false);
    expect(memory.meta["generatorError"]).toBe("LLM down");
  });

  it("handles critic failure with degraded fallback", async () => {
    const agents = await import("../src/agents.js");
    vi.mocked(agents.runCritic).mockRejectedValueOnce(new Error("critic timeout"));

    const { CodeEntity } = await import("../src/entity.js");
    const entity = new CodeEntity();
    const memory = await entity.run("test task");

    expect(memory.meta["criticError"]).toBe("critic timeout");
    expect(memory.critique).toBe("");
  });

  it("handles judge failure with draft as fallback", async () => {
    const agents = await import("../src/agents.js");
    vi.mocked(agents.runJudge).mockRejectedValueOnce(new Error("judge error"));

    const { CodeEntity } = await import("../src/entity.js");
    const entity = new CodeEntity();
    const memory = await entity.run("test task");

    expect(memory.meta["judgeError"]).toBe("judge error");
    expect(memory.finalCandidate).toBe("mock draft");
  });
});

describe("Entity (generic)", () => {
  let store: Store;

  beforeEach(() => {
    store = new Store({ path: ":memory:", entityId: "test" });
    vi.clearAllMocks();
  });

  afterEach(() => {
    store?.close();
  });

  it("runs full pipeline successfully", async () => {
    const { Entity } = await import("../src/entity-base.js");
    const entity = new Entity();
    const memory = await entity.run("Write a poem about coding");

    expect(memory.draft).toBe("mock draft");
    expect(memory.finalCandidate).toBe("mock final");
  });

  it("validates task input", async () => {
    const { Entity } = await import("../src/entity-base.js");
    const entity = new Entity();

    await expect(entity.run("")).rejects.toThrow(/Invalid task/);
  });

  it("runs with store and records outcome", async () => {
    const { Entity } = await import("../src/entity-base.js");
    const entity = new Entity();
    await entity.run("test task", { store });

    const db = store.getDb();
    const outcomes = db.prepare("SELECT * FROM outcomes WHERE entity_id = ?").all("test");
    expect(outcomes.length).toBe(1);
  });

  it("writes checkpoint when requested", async () => {
    const { Entity } = await import("../src/entity-base.js");
    const entity = new Entity();
    await entity.run("test task", {
      store,
      writeCheckpointAfter: true,
      entityVersion: "2.0.0",
    });

    const checkpoints = store.listCheckpoints();
    expect(checkpoints.length).toBe(1);
  });

  it("injects long-term context from store", async () => {
    store.addVerified("art", "Summary", "prior context data");

    const { Entity } = await import("../src/entity-base.js");
    const entity = new Entity();
    const memory = await entity.run("test task", { store });

    expect(memory.longTermContext).toContain("prior context data");
  });

  it("handles generator failure with degraded fallback", async () => {
    const agents = await import("../src/agents.js");
    vi.mocked(agents.runGenerator).mockRejectedValueOnce(new Error("gen fail"));

    const { Entity } = await import("../src/entity-base.js");
    const entity = new Entity();
    const memory = await entity.run("test task");

    expect(memory.verificationPassed).toBe(false);
    expect(memory.meta["generatorError"]).toBe("gen fail");
  });

  it("handles critic failure with degraded fallback", async () => {
    const agents = await import("../src/agents.js");
    vi.mocked(agents.runCritic).mockRejectedValueOnce(new Error("crit fail"));

    const { Entity } = await import("../src/entity-base.js");
    const entity = new Entity();
    const memory = await entity.run("test task");

    expect(memory.meta["criticError"]).toBe("crit fail");
  });

  it("handles judge failure with draft as fallback", async () => {
    const agents = await import("../src/agents.js");
    vi.mocked(agents.runJudge).mockRejectedValueOnce(new Error("judge fail"));

    const { Entity } = await import("../src/entity-base.js");
    const entity = new Entity();
    const memory = await entity.run("test task");

    expect(memory.meta["judgeError"]).toBe("judge fail");
    expect(memory.finalCandidate).toBe("mock draft");
  });
});
