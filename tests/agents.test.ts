/**
 * Tests for agents.ts: runGenerator, runCritic, runJudge, runRole (Milestone 2b).
 */

import { describe, it, expect, afterEach } from "vitest";
import { runGenerator, runCritic, runJudge, runRole } from "../src/agents.js";
import { WorkingMemory } from "../src/memory.js";
import { MockLLMGateway, FailingGateway } from "./helpers/mock-gateway.js";
import { createTestStore } from "./helpers/mock-store.js";
import { setStrategy } from "../src/persistence.js";
import { SIMPLE_TASK, SIMPLE_CODE, SIMPLE_CRITIQUE, SIMPLE_FINAL } from "./helpers/fixtures.js";

describe("runGenerator", () => {
  it("sets memory.draft from gateway response", async () => {
    const gw = new MockLLMGateway({ defaultResponse: SIMPLE_CODE });
    const memory = new WorkingMemory();
    memory.setTask(SIMPLE_TASK);

    await runGenerator(gw as never, memory);

    expect(memory.draft).toBe(SIMPLE_CODE);
  });

  it("includes task in prompt", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "code here" });
    const memory = new WorkingMemory();
    memory.setTask(SIMPLE_TASK);

    await runGenerator(gw as never, memory);

    expect(gw.calls.length).toBe(1);
    const userMsg = gw.calls[0]!.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain(SIMPLE_TASK);
  });

  it("appends long-term context when present", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "code" });
    const memory = new WorkingMemory();
    memory.setTask("task");
    memory.longTermContext = "Previous verified: add function";

    await runGenerator(gw as never, memory);

    const userMsg = gw.calls[0]!.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("Relevant verified knowledge");
    expect(userMsg?.content).toContain("add function");
  });

  it("uses strategy from store when available", async () => {
    const store = createTestStore();
    setStrategy(store, "generator", "Custom generator system prompt");

    const gw = new MockLLMGateway({ defaultResponse: "code" });
    const memory = new WorkingMemory();
    memory.setTask("task");

    await runGenerator(gw as never, memory, store);

    const sysMsg = gw.calls[0]!.messages.find((m) => m.role === "system");
    expect(sysMsg?.content).toBe("Custom generator system prompt");
    store.close();
  });

  it("uses default code domain prompt when no store strategy", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "code" });
    const memory = new WorkingMemory();
    memory.setTask("task");

    await runGenerator(gw as never, memory, null, "code");

    const sysMsg = gw.calls[0]!.messages.find((m) => m.role === "system");
    expect(sysMsg?.content).toContain("Generator");
  });
});

describe("runCritic", () => {
  it("includes draft in prompt and sets memory.critique", async () => {
    const gw = new MockLLMGateway({ defaultResponse: SIMPLE_CRITIQUE });
    const memory = new WorkingMemory();
    memory.setTask(SIMPLE_TASK);
    memory.setDraft(SIMPLE_CODE);

    await runCritic(gw as never, memory);

    expect(memory.critique).toBe(SIMPLE_CRITIQUE);
    const userMsg = gw.calls[0]!.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("Draft code:");
    expect(userMsg?.content).toContain(SIMPLE_CODE);
  });
});

describe("runJudge", () => {
  it("includes draft + critique in prompt and sets memory.finalCandidate", async () => {
    const gw = new MockLLMGateway({ defaultResponse: SIMPLE_FINAL });
    const memory = new WorkingMemory();
    memory.setTask(SIMPLE_TASK);
    memory.setDraft(SIMPLE_CODE);
    memory.setCritique(SIMPLE_CRITIQUE);

    await runJudge(gw as never, memory);

    expect(memory.finalCandidate).toBe(SIMPLE_FINAL);
    const userMsg = gw.calls[0]!.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("Draft:");
    expect(userMsg?.content).toContain("Critique:");
  });
});

describe("runRole", () => {
  it("runs generator role", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "generated output" });
    const result = await runRole("generator", gw as never, "task", {});
    expect(result).toBe("generated output");
  });

  it("runs critic role with generator input", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "critique output" });
    const result = await runRole("critic", gw as never, "task", { generator: "draft code" });
    expect(result).toBe("critique output");

    const userMsg = gw.calls[0]!.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("draft code");
  });

  it("runs judge role with generator and critic inputs", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "final output" });
    const result = await runRole("judge", gw as never, "task", {
      generator: "draft",
      critic: "critique",
    });
    expect(result).toBe("final output");

    const userMsg = gw.calls[0]!.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("Draft:");
    expect(userMsg?.content).toContain("Critique:");
  });

  it("runs router role", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "code" });
    const result = await runRole("router", gw as never, "write a function", {});
    expect(result).toBe("code");
  });

  it("throws on unknown role", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "output" });
    await expect(
      runRole("unknown-role", gw as never, "task", {})
    ).rejects.toThrow(/Unknown role/);
  });

  it("passes long-term context to generator", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "output" });
    await runRole("generator", gw as never, "task", {}, "some context");

    const userMsg = gw.calls[0]!.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("some context");
  });

  it("passes long-term context to critic", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "output" });
    await runRole("critic", gw as never, "task", { generator: "draft" }, "context");

    const userMsg = gw.calls[0]!.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("context");
  });

  it("uses domain prompts when specified", async () => {
    const gw = new MockLLMGateway({ defaultResponse: "output" });
    await runRole("generator", gw as never, "task", {}, "", null, "general");

    const sysMsg = gw.calls[0]!.messages.find((m) => m.role === "system");
    expect(sysMsg?.content).toBeDefined();
    // General domain has different prompt than code domain
    expect(sysMsg?.content).not.toContain("TypeScript");
  });

  it("uses store strategy when available", async () => {
    const store = createTestStore();
    setStrategy(store, "generator", "My custom prompt");

    const gw = new MockLLMGateway({ defaultResponse: "output" });
    await runRole("generator", gw as never, "task", {}, "", store, "code");

    const sysMsg = gw.calls[0]!.messages.find((m) => m.role === "system");
    expect(sysMsg?.content).toBe("My custom prompt");
    store.close();
  });
});
