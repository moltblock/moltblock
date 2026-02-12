import { describe, it, expect } from "vitest";
import { WorkingMemory } from "../src/memory.js";

describe("WorkingMemory", () => {
  it("initializes with empty defaults", () => {
    const wm = new WorkingMemory();
    expect(wm.task).toBe("");
    expect(wm.draft).toBe("");
    expect(wm.critique).toBe("");
    expect(wm.finalCandidate).toBe("");
    expect(wm.verificationPassed).toBe(false);
    expect(wm.verificationEvidence).toBe("");
    expect(wm.authoritativeArtifact).toBe("");
    expect(wm.longTermContext).toBe("");
    expect(wm.slots).toEqual({});
    expect(wm.meta).toEqual({});
  });

  it("setTask updates task", () => {
    const wm = new WorkingMemory();
    wm.setTask("Do something");
    expect(wm.task).toBe("Do something");
  });

  it("setDraft updates draft", () => {
    const wm = new WorkingMemory();
    wm.setDraft("draft content");
    expect(wm.draft).toBe("draft content");
  });

  it("setCritique updates critique", () => {
    const wm = new WorkingMemory();
    wm.setCritique("needs work");
    expect(wm.critique).toBe("needs work");
  });

  it("setFinalCandidate updates finalCandidate", () => {
    const wm = new WorkingMemory();
    wm.setFinalCandidate("final version");
    expect(wm.finalCandidate).toBe("final version");
  });

  describe("setVerification", () => {
    it("sets authoritative artifact on pass", () => {
      const wm = new WorkingMemory();
      wm.setFinalCandidate("the code");
      wm.setVerification(true, "all tests pass");

      expect(wm.verificationPassed).toBe(true);
      expect(wm.verificationEvidence).toBe("all tests pass");
      expect(wm.authoritativeArtifact).toBe("the code");
    });

    it("does not set authoritative artifact on fail", () => {
      const wm = new WorkingMemory();
      wm.setFinalCandidate("the code");
      wm.setVerification(false, "tests failed");

      expect(wm.verificationPassed).toBe(false);
      expect(wm.authoritativeArtifact).toBe("");
    });
  });

  describe("slots", () => {
    it("setSlot and getSlot work correctly", () => {
      const wm = new WorkingMemory();
      wm.setSlot("node1", "output1");
      expect(wm.getSlot("node1")).toBe("output1");
    });

    it("getSlot returns empty string for missing key", () => {
      const wm = new WorkingMemory();
      expect(wm.getSlot("nonexistent")).toBe("");
    });
  });
});
