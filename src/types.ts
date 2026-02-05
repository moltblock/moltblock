/**
 * Shared TypeScript interfaces for Moltblock.
 */

/** One role's LLM backend configuration */
export interface ModelBinding {
  backend: string;
  baseUrl: string;
  apiKey: string | null;
  model: string;
}

/** JSON config binding entry (from moltblock.json) */
export interface BindingEntry {
  backend: string;
  base_url: string;
  model?: string;
  api_key?: string | null;
}

/** Agent section in moltblock.json */
export interface AgentConfig {
  bindings?: Record<string, BindingEntry>;
}

/** Root config schema for moltblock.json */
export interface MoltblockConfig {
  agent?: AgentConfig;
}

/** Chat message format for LLM */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Verified memory entry from persistence */
export interface VerifiedMemoryEntry {
  artifact_ref: string;
  summary: string | null;
  content_preview: string | null;
  created_at: number;
}

/** Checkpoint entry from persistence */
export interface CheckpointEntry {
  entity_version: string;
  graph_hash: string;
  memory_hash: string;
  artifact_refs: string[];
  created_at: number;
}

/** Outcome entry from persistence */
export interface OutcomeEntry {
  task_ref: string;
  verification_passed: boolean;
  latency_sec: number | null;
  created_at: number;
}

/** Inbox entry for multi-entity handoff */
export interface InboxEntry {
  from_entity_id: string;
  artifact_ref: string;
  payload_text: string;
  payload_hash: string;
  signature: string;
  created_at: number;
}

/** Strategy suggestion from improvement loop */
export interface StrategySuggestion {
  role: string;
  suggestion: string;
}

/** Result from artifact verification */
export interface ReceivedArtifact {
  from_entity_id: string;
  artifact_ref: string;
  payload_text: string;
  verified: boolean;
}

/** Governance configuration */
export interface GovernanceConfig {
  moltRateLimitSec: number;
  allowedMoltTriggers: string[];
  humanVetoPaused: boolean;
}
