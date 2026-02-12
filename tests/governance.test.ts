import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Store } from "../src/persistence.js";
import {
  createGovernanceConfig,
  canMolt,
  triggerMolt,
  pause,
  resume,
  isPaused,
  emergencyShutdown,
} from "../src/governance.js";

describe("governance", () => {
  let store: Store;

  beforeEach(() => {
    store = new Store({ path: ":memory:", entityId: "test-gov" });
  });

  afterEach(() => {
    store.close();
  });

  describe("createGovernanceConfig", () => {
    it("returns defaults when no overrides", () => {
      const cfg = createGovernanceConfig();
      expect(cfg.moltRateLimitSec).toBe(60);
      expect(cfg.allowedMoltTriggers).toEqual(["system", "human"]);
      expect(cfg.humanVetoPaused).toBe(false);
    });

    it("applies overrides", () => {
      const cfg = createGovernanceConfig({ moltRateLimitSec: 120 });
      expect(cfg.moltRateLimitSec).toBe(120);
    });
  });

  describe("canMolt", () => {
    it("allows molt with fresh store", () => {
      const cfg = createGovernanceConfig();
      const result = canMolt(store, cfg);
      expect(result.allowed).toBe(true);
    });

    it("rejects molt within rate limit", () => {
      const cfg = createGovernanceConfig({ moltRateLimitSec: 9999 });
      triggerMolt(store, "1.0.0", cfg);

      const result = canMolt(store, cfg);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("rate limit");
    });

    it("rejects molt when paused with humanVetoPaused enabled", () => {
      const cfg = createGovernanceConfig({ humanVetoPaused: true });
      pause(store);

      const result = canMolt(store, cfg);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("paused");
    });
  });

  describe("triggerMolt", () => {
    it("succeeds on first molt", () => {
      const cfg = createGovernanceConfig();
      const result = triggerMolt(store, "1.0.0", cfg);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Molt completed");
    });

    it("writes a checkpoint", () => {
      const cfg = createGovernanceConfig();
      triggerMolt(store, "1.0.0", cfg, {
        graphHash: "gh1",
        memoryHash: "mh1",
      });
      const cps = store.listCheckpoints(10);
      expect(cps).toHaveLength(1);
      expect(cps[0]?.entity_version).toBe("1.0.0");
    });

    it("fails when rate-limited", () => {
      const cfg = createGovernanceConfig({ moltRateLimitSec: 9999 });
      triggerMolt(store, "1.0.0", cfg);

      const result = triggerMolt(store, "1.0.1", cfg);
      expect(result.success).toBe(false);
    });
  });

  describe("pause / resume / isPaused", () => {
    it("starts not paused", () => {
      expect(isPaused(store)).toBe(false);
    });

    it("pauses and resumes", () => {
      pause(store);
      expect(isPaused(store)).toBe(true);

      resume(store);
      expect(isPaused(store)).toBe(false);
    });
  });

  describe("emergencyShutdown", () => {
    it("does not throw", () => {
      expect(() => emergencyShutdown(store)).not.toThrow();
    });
  });
});
