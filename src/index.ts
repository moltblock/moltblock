/**
 * Moltblock — framework for evolving composite intelligences (Entities).
 */

export const VERSION = "0.11.1";

// Types
export type {
  ModelBinding,
  BindingEntry,
  AgentConfig,
  MoltblockConfig,
  ChatMessage,
  VerifiedMemoryEntry,
  CheckpointEntry,
  OutcomeEntry,
  InboxEntry,
  StrategySuggestion,
  ReceivedArtifact,
  GovernanceConfig,
} from "./types.js";

// Memory
export { WorkingMemory } from "./memory.js";

// Signing
export { signArtifact, verifyArtifact, artifactHash } from "./signing.js";

// Config
export {
  loadMoltblockConfig,
  defaultCodeEntityBindings,
  detectProvider,
  getConfigSource,
  loadPolicyRules,
  BindingEntrySchema,
  AgentConfigSchema,
  MoltblockConfigSchema,
  ModelBindingSchema,
  PolicyRuleSchema,
  type BindingOverrides,
  type ConfigSource,
  type PolicyRuleConfig,
} from "./config.js";

// Persistence
export {
  Store,
  hashGraph,
  hashMemory,
  auditLog,
  getGovernanceValue,
  setGovernanceValue,
  putInbox,
  getInbox,
  recordOutcome,
  getRecentOutcomes,
  getStrategy,
  setStrategy,
} from "./persistence.js";

// Gateway
export { LLMGateway, sanitizeBaseUrl } from "./gateway.js";

// Agents
export {
  runGenerator,
  runCritic,
  runJudge,
  runRole,
} from "./agents.js";

// Graph
export {
  AgentGraph,
  GraphNodeSchema,
  GraphEdgeSchema,
  AgentGraphSchema,
  type GraphNode,
  type GraphEdge,
  type AgentGraphData,
} from "./graph-schema.js";

// Graph Runner
export { GraphRunner, type GraphRunnerOptions } from "./graph-runner.js";

// Verifier (legacy vitest-based)
export { extractCodeBlock, runVitestOnCode, runVerifier } from "./verifier.js";

// Verifier Interface (pluggable)
export type {
  Verifier,
  VerificationResult,
  VerifierContext,
} from "./verifier-interface.js";

// Policy Verifier
export { PolicyVerifier, type PolicyRule } from "./policy-verifier.js";

// Code Verifier (adapter)
export { CodeVerifier } from "./code-verifier.js";

// Composite Verifier
export { CompositeVerifier, type CompositeVerifierOptions } from "./composite-verifier.js";

// Domain Prompts
export {
  getDomainPrompts,
  registerDomain,
  listDomains,
  type DomainPrompts,
} from "./domain-prompts.js";

// Risk Classification
export { classifyRisk, type RiskLevel, type RiskClassification } from "./risk.js";

// Governance
export {
  createGovernanceConfig,
  canMolt,
  triggerMolt,
  pause,
  resume,
  isPaused,
  emergencyShutdown,
} from "./governance.js";

// Handoff
export { sendArtifact, receiveArtifacts } from "./handoff.js";

// Improvement
export {
  critiqueStrategies,
  applySuggestion,
  runEval,
  runImprovementCycle,
} from "./improvement.js";

// Validation
export {
  validateTask,
  validateTestCode,
  MAX_TASK_LENGTH,
  MIN_TASK_LENGTH,
  type ValidationResult,
} from "./validation.js";

// Entity (code-specific, backward compat)
export { CodeEntity, loadEntityWithGraph } from "./entity.js";

// Entity (generic, pluggable)
export { Entity, type EntityOptions } from "./entity-base.js";
