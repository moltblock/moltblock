/**
 * Governance: molt rate limits, human veto, audit. Enforced outside the cognitive loop.
 */

import type { GovernanceConfig } from "./types.js";
import {
  Store,
  auditLog,
  getGovernanceValue,
  setGovernanceValue,
} from "./persistence.js";

/**
 * Create a governance config with defaults.
 */
export function createGovernanceConfig(
  overrides: Partial<GovernanceConfig> = {}
): GovernanceConfig {
  return {
    moltRateLimitSec: overrides.moltRateLimitSec ?? 60.0,
    allowedMoltTriggers: overrides.allowedMoltTriggers ?? ["system", "human"],
    humanVetoPaused: overrides.humanVetoPaused ?? false,
  };
}

/**
 * Return [allowed, reason]. Checks rate limit and veto.
 */
export function canMolt(
  store: Store,
  config: GovernanceConfig
): { allowed: boolean; reason: string } {
  if (config.humanVetoPaused) {
    const paused = getGovernanceValue(store, "paused");
    if (paused === "1") {
      return { allowed: false, reason: "Entity is paused (human veto)" };
    }
  }

  const last = getGovernanceValue(store, "last_molt_at");
  if (last) {
    try {
      const t = parseFloat(last);
      const now = Date.now() / 1000;
      if (now - t < config.moltRateLimitSec) {
        return {
          allowed: false,
          reason: `Molt rate limit: wait ${config.moltRateLimitSec}s between molts`,
        };
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { allowed: true, reason: "" };
}

/**
 * Trigger a molt: validate governance, write checkpoint, bump version, audit.
 * New graph/bindings/prompts are applied by the caller (e.g. load new graph).
 * Returns { success, message }.
 */
export function triggerMolt(
  store: Store,
  entityVersion: string,
  config: GovernanceConfig,
  options: {
    graphHash?: string;
    memoryHash?: string;
    artifactRefs?: string[];
  } = {}
): { success: boolean; message: string } {
  const { graphHash = "", memoryHash = "", artifactRefs = [] } = options;

  const { allowed, reason } = canMolt(store, config);
  if (!allowed) {
    return { success: false, message: reason };
  }

  store.writeCheckpoint(
    entityVersion,
    graphHash || "molt",
    memoryHash || "",
    artifactRefs
  );

  const now = Date.now() / 1000;
  setGovernanceValue(store, "last_molt_at", now.toString());
  setGovernanceValue(store, "entity_version", entityVersion);
  auditLog(store, "molt", `version=${entityVersion} graph_hash=${graphHash}`);

  return { success: true, message: "Molt completed" };
}

/**
 * Human veto: pause the entity (no further work until resumed).
 */
export function pause(store: Store): void {
  setGovernanceValue(store, "paused", "1");
  auditLog(store, "pause", "human veto");
}

/**
 * Resume after pause.
 */
export function resume(store: Store): void {
  setGovernanceValue(store, "paused", "0");
  auditLog(store, "resume", "");
}

/**
 * Return true if entity is paused.
 */
export function isPaused(store: Store): boolean {
  return getGovernanceValue(store, "paused") === "1";
}

/**
 * Record emergency shutdown in audit log.
 */
export function emergencyShutdown(store: Store): void {
  auditLog(store, "emergency_shutdown", "");
}
