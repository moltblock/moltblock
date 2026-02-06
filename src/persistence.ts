/**
 * Long-term verified memory and checkpoints (SQLite persistence).
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { z } from "zod";
import type {
  CheckpointEntry,
  InboxEntry,
  OutcomeEntry,
  VerifiedMemoryEntry,
} from "./types.js";

/**
 * Persistence for verified memory (admission only after verification) and
 * immutable checkpoints (entity version, graph hash, memory hash, artifact refs).
 */
export class Store {
  readonly entityId: string;
  readonly path: string;
  private db: Database.Database;

  constructor(options: { path?: string; entityId?: string } = {}) {
    this.entityId = options.entityId ?? "default";
    const p = options.path ?? path.join(".moltblock", "store.db");
    this.path = p;

    if (p !== ":memory:") {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
    }

    this.db = new Database(p);

    if (p !== ":memory:") {
      try {
        fs.chmodSync(p, 0o600);
      } catch {
        // chmod may fail on some platforms (e.g. Windows)
      }
    }

    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS verified_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id TEXT NOT NULL,
        artifact_ref TEXT NOT NULL,
        summary TEXT,
        content_preview TEXT,
        created_at REAL NOT NULL
      )
    `);
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_vm_entity ON verified_memory(entity_id)");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id TEXT NOT NULL,
        entity_version TEXT NOT NULL,
        graph_hash TEXT NOT NULL,
        memory_hash TEXT NOT NULL,
        artifact_refs TEXT NOT NULL,
        created_at REAL NOT NULL
      )
    `);
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_cp_entity ON checkpoints(entity_id)");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS outcomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id TEXT NOT NULL,
        task_ref TEXT,
        verification_passed INTEGER NOT NULL,
        latency_sec REAL,
        created_at REAL NOT NULL
      )
    `);
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_out_entity ON outcomes(entity_id)");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id TEXT NOT NULL,
        role TEXT NOT NULL,
        version INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at REAL NOT NULL
      )
    `);
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_strat_entity ON strategies(entity_id)");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        detail TEXT,
        created_at REAL NOT NULL
      )
    `);
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_id)");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS governance_state (
        entity_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at REAL NOT NULL,
        PRIMARY KEY (entity_id, key)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS inbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id TEXT NOT NULL,
        from_entity_id TEXT NOT NULL,
        artifact_ref TEXT NOT NULL,
        payload_text TEXT,
        payload_hash TEXT NOT NULL,
        signature TEXT NOT NULL,
        created_at REAL NOT NULL
      )
    `);
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_inbox_entity ON inbox(entity_id)");
  }

  /**
   * Admit a verified artifact into long-term memory (call only after verification pass).
   */
  addVerified(artifactRef: string, summary?: string, contentPreview?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO verified_memory (entity_id, artifact_ref, summary, content_preview, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      this.entityId,
      artifactRef,
      summary ?? null,
      (contentPreview ?? "").slice(0, 2000),
      Date.now() / 1000
    );
  }

  /**
   * Return the k most recent verified entries for this entity (for agent context).
   */
  getRecentVerified(k = 5): VerifiedMemoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT artifact_ref, summary, content_preview, created_at
      FROM verified_memory WHERE entity_id = ? ORDER BY id DESC LIMIT ?
    `);
    const rows = stmt.all(this.entityId, k) as Array<{
      artifact_ref: string;
      summary: string | null;
      content_preview: string | null;
      created_at: number;
    }>;
    return rows.map((r) => ({
      artifact_ref: r.artifact_ref,
      summary: r.summary,
      content_preview: r.content_preview,
      created_at: r.created_at,
    }));
  }

  /**
   * Append an immutable checkpoint.
   */
  writeCheckpoint(
    entityVersion: string,
    graphHash: string,
    memoryHash: string,
    artifactRefs: string[]
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO checkpoints (entity_id, entity_version, graph_hash, memory_hash, artifact_refs, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      this.entityId,
      entityVersion,
      graphHash,
      memoryHash,
      JSON.stringify(artifactRefs),
      Date.now() / 1000
    );
  }

  /**
   * List recent checkpoints for this entity.
   */
  listCheckpoints(limit = 20): CheckpointEntry[] {
    const stmt = this.db.prepare(`
      SELECT entity_version, graph_hash, memory_hash, artifact_refs, created_at
      FROM checkpoints WHERE entity_id = ? ORDER BY id DESC LIMIT ?
    `);
    const rows = stmt.all(this.entityId, limit) as Array<{
      entity_version: string;
      graph_hash: string;
      memory_hash: string;
      artifact_refs: string;
      created_at: number;
    }>;
    return rows.map((r) => ({
      entity_version: r.entity_version,
      graph_hash: r.graph_hash,
      memory_hash: r.memory_hash,
      artifact_refs: z.array(z.string()).catch([]).parse(JSON.parse(r.artifact_refs)),
      created_at: r.created_at,
    }));
  }

  /** Get internal db for helper functions */
  getDb(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Stable hash for graph config (for checkpoint).
 */
export function hashGraph(graphConfig: string | Buffer): string {
  const data =
    typeof graphConfig === "string" ? Buffer.from(graphConfig, "utf-8") : graphConfig;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Stable hash for memory state (e.g. last N artifact refs).
 */
export function hashMemory(verifiedRefs: string[]): string {
  const data = JSON.stringify(verifiedRefs.sort());
  return crypto.createHash("sha256").update(data).digest("hex");
}

// --- Audit and governance ---

/**
 * Append an audit log entry (molt, veto, shutdown, etc.).
 */
export function auditLog(store: Store, eventType: string, detail?: string): void {
  const db = store.getDb();
  const stmt = db.prepare(
    "INSERT INTO audit_log (entity_id, event_type, detail, created_at) VALUES (?, ?, ?, ?)"
  );
  stmt.run(store.entityId, eventType, detail ?? "", Date.now() / 1000);
}

/**
 * Get a governance state value (e.g. last_molt_at, paused).
 */
export function getGovernanceValue(store: Store, key: string): string | null {
  const db = store.getDb();
  const stmt = db.prepare(
    "SELECT value FROM governance_state WHERE entity_id = ? AND key = ?"
  );
  const row = stmt.get(store.entityId, key) as { value: string } | undefined;
  return row?.value ?? null;
}

/**
 * Set a governance state value.
 */
export function setGovernanceValue(store: Store, key: string, value: string): void {
  const db = store.getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO governance_state (entity_id, key, value, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(store.entityId, key, value, Date.now() / 1000);
}

// --- Inbox (multi-entity handoff) ---

/**
 * Add a signed artifact to this entity's inbox (store is the recipient).
 */
export function putInbox(
  store: Store,
  fromEntityId: string,
  artifactRef: string,
  payloadHash: string,
  signature: string,
  payloadText?: string
): void {
  const db = store.getDb();
  const stmt = db.prepare(`
    INSERT INTO inbox (entity_id, from_entity_id, artifact_ref, payload_text, payload_hash, signature, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    store.entityId,
    fromEntityId,
    artifactRef,
    payloadText ?? "",
    payloadHash,
    signature,
    Date.now() / 1000
  );
}

/**
 * Return recent inbox entries for this entity (recipient).
 */
export function getInbox(store: Store, limit = 20): InboxEntry[] {
  const db = store.getDb();
  const stmt = db.prepare(`
    SELECT from_entity_id, artifact_ref, payload_text, payload_hash, signature, created_at
    FROM inbox WHERE entity_id = ? ORDER BY id DESC LIMIT ?
  `);
  const rows = stmt.all(store.entityId, limit) as Array<{
    from_entity_id: string;
    artifact_ref: string;
    payload_text: string;
    payload_hash: string;
    signature: string;
    created_at: number;
  }>;
  return rows.map((r) => ({
    from_entity_id: r.from_entity_id,
    artifact_ref: r.artifact_ref,
    payload_text: r.payload_text,
    payload_hash: r.payload_hash,
    signature: r.signature,
    created_at: r.created_at,
  }));
}

// --- Outcomes and strategies (recursive improvement) ---

/**
 * Record one task outcome for measurement.
 */
export function recordOutcome(
  store: Store,
  verificationPassed: boolean,
  latencySec?: number,
  taskRef?: string
): void {
  const db = store.getDb();
  const stmt = db.prepare(`
    INSERT INTO outcomes (entity_id, task_ref, verification_passed, latency_sec, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    store.entityId,
    taskRef ?? "",
    verificationPassed ? 1 : 0,
    latencySec ?? null,
    Date.now() / 1000
  );
}

/**
 * Return the k most recent outcomes for this entity.
 */
export function getRecentOutcomes(store: Store, k = 20): OutcomeEntry[] {
  const db = store.getDb();
  const stmt = db.prepare(`
    SELECT task_ref, verification_passed, latency_sec, created_at
    FROM outcomes WHERE entity_id = ? ORDER BY id DESC LIMIT ?
  `);
  const rows = stmt.all(store.entityId, k) as Array<{
    task_ref: string;
    verification_passed: number;
    latency_sec: number | null;
    created_at: number;
  }>;
  return rows.map((r) => ({
    task_ref: r.task_ref,
    verification_passed: r.verification_passed === 1,
    latency_sec: r.latency_sec,
    created_at: r.created_at,
  }));
}

/**
 * Return current strategy (prompt) for role, or null if not set.
 */
export function getStrategy(store: Store, role: string): string | null {
  const db = store.getDb();
  const stmt = db.prepare(
    "SELECT content FROM strategies WHERE entity_id = ? AND role = ? ORDER BY version DESC LIMIT 1"
  );
  const row = stmt.get(store.entityId, role) as { content: string } | undefined;
  return row?.content ?? null;
}

/**
 * Set strategy (prompt) for role; inserts new version.
 */
export function setStrategy(store: Store, role: string, content: string): void {
  const db = store.getDb();
  const versionStmt = db.prepare(
    "SELECT COALESCE(MAX(version), 0) as maxVersion FROM strategies WHERE entity_id = ? AND role = ?"
  );
  const versionRow = versionStmt.get(store.entityId, role) as { maxVersion: number };
  const version = (versionRow?.maxVersion ?? 0) + 1;

  const stmt = db.prepare(`
    INSERT INTO strategies (entity_id, role, version, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(store.entityId, role, version, content, Date.now() / 1000);
}
