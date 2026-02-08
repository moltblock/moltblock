/**
 * Moltblock — framework for evolving composite intelligences (Entities).
 */

export const VERSION = "0.2.0";

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
  BindingEntrySchema,
  AgentConfigSchema,
  MoltblockConfigSchema,
  ModelBindingSchema,
  type BindingOverrides,
  type ConfigSource,
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
export { LLMGateway } from "./gateway.js";

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
export { GraphRunner } from "./graph-runner.js";

// Verifier
export { extractCodeBlock, runVitestOnCode, runVerifier } from "./verifier.js";

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

// Entity
export { CodeEntity, loadEntityWithGraph } from "./entity.js";
