"""Long-term verified memory and checkpoints (SQLite persistence)."""

import hashlib
import json
import sqlite3
from pathlib import Path
from typing import Any


class Store:
    """
    Persistence for verified memory (admission only after verification) and
    immutable checkpoints (entity version, graph hash, memory hash, artifact refs).
    """

    def __init__(self, path: str | Path | None = None, entity_id: str = "default") -> None:
        self.entity_id = entity_id
        p = path if path is not None else Path(".moltblock") / "store.db"
        self.path = Path(p) if p != ":memory:" else p
        self._memory_conn: sqlite3.Connection | None = None
        if self.path != ":memory:" and hasattr(self.path, "parent"):
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _conn(self) -> sqlite3.Connection:
        if self.path == ":memory:":
            if self._memory_conn is None:
                self._memory_conn = sqlite3.connect(":memory:")
                self._apply_schema(self._memory_conn)
            return self._memory_conn
        return sqlite3.connect(str(self.path))

    def _apply_schema(self, c: sqlite3.Connection) -> None:
        c.execute("""
            CREATE TABLE IF NOT EXISTS verified_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id TEXT NOT NULL,
                artifact_ref TEXT NOT NULL,
                summary TEXT,
                content_preview TEXT,
                created_at REAL NOT NULL
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_vm_entity ON verified_memory(entity_id)")
        c.execute("""
            CREATE TABLE IF NOT EXISTS checkpoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id TEXT NOT NULL,
                entity_version TEXT NOT NULL,
                graph_hash TEXT NOT NULL,
                memory_hash TEXT NOT NULL,
                artifact_refs TEXT NOT NULL,
                created_at REAL NOT NULL
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_cp_entity ON checkpoints(entity_id)")
        c.execute("""
            CREATE TABLE IF NOT EXISTS outcomes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id TEXT NOT NULL,
                task_ref TEXT,
                verification_passed INTEGER NOT NULL,
                latency_sec REAL,
                created_at REAL NOT NULL
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_out_entity ON outcomes(entity_id)")
        c.execute("""
            CREATE TABLE IF NOT EXISTS strategies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id TEXT NOT NULL,
                role TEXT NOT NULL,
                version INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at REAL NOT NULL
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_strat_entity ON strategies(entity_id)")
        c.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                detail TEXT,
                created_at REAL NOT NULL
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_id)")
        c.execute("""
            CREATE TABLE IF NOT EXISTS governance_state (
                entity_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                updated_at REAL NOT NULL,
                PRIMARY KEY (entity_id, key)
            )
        """)
        c.execute("""
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
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_inbox_entity ON inbox(entity_id)")
        c.commit()

    def _init_schema(self) -> None:
        if self.path == ":memory:":
            self._memory_conn = sqlite3.connect(":memory:")
            self._apply_schema(self._memory_conn)
            return
        with sqlite3.connect(str(self.path)) as c:
            self._apply_schema(c)

    def add_verified(
        self,
        artifact_ref: str,
        summary: str | None = None,
        content_preview: str | None = None,
    ) -> None:
        """Admit a verified artifact into long-term memory (call only after verification pass)."""
        import time
        with self._conn() as c:
            c.execute(
                """INSERT INTO verified_memory (entity_id, artifact_ref, summary, content_preview, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (self.entity_id, artifact_ref, summary, (content_preview or "")[:2000], time.time()),
            )
            c.commit()

    def get_recent_verified(self, k: int = 5) -> list[dict[str, Any]]:
        """Return the k most recent verified entries for this entity (for agent context)."""
        with self._conn() as c:
            cur = c.execute(
                """SELECT artifact_ref, summary, content_preview, created_at
                   FROM verified_memory WHERE entity_id = ? ORDER BY id DESC LIMIT ?""",
                (self.entity_id, k),
            )
            rows = cur.fetchall()
        return [
            {"artifact_ref": r[0], "summary": r[1], "content_preview": r[2], "created_at": r[3]}
            for r in rows
        ]

    def write_checkpoint(
        self,
        entity_version: str,
        graph_hash: str,
        memory_hash: str,
        artifact_refs: list[str],
    ) -> None:
        """Append an immutable checkpoint."""
        import time
        refs_json = json.dumps(artifact_refs)
        with self._conn() as c:
            c.execute(
                """INSERT INTO checkpoints (entity_id, entity_version, graph_hash, memory_hash, artifact_refs, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (self.entity_id, entity_version, graph_hash, memory_hash, refs_json, time.time()),
            )
            c.commit()

    def list_checkpoints(self, limit: int = 20) -> list[dict[str, Any]]:
        """List recent checkpoints for this entity."""
        with self._conn() as c:
            cur = c.execute(
                """SELECT entity_version, graph_hash, memory_hash, artifact_refs, created_at
                   FROM checkpoints WHERE entity_id = ? ORDER BY id DESC LIMIT ?""",
                (self.entity_id, limit),
            )
            rows = cur.fetchall()
        return [
            {
                "entity_version": r[0],
                "graph_hash": r[1],
                "memory_hash": r[2],
                "artifact_refs": json.loads(r[3]),
                "created_at": r[4],
            }
            for r in rows
        ]


def hash_graph(graph_config: str | bytes) -> str:
    """Stable hash for graph config (for checkpoint)."""
    if isinstance(graph_config, str):
        graph_config = graph_config.encode("utf-8")
    return hashlib.sha256(graph_config).hexdigest()[:16]


def hash_memory(verified_refs: list[str]) -> str:
    """Stable hash for memory state (e.g. last N artifact refs)."""
    return hashlib.sha256(json.dumps(verified_refs, sort_keys=True).encode()).hexdigest()[:16]


# --- Audit and governance ---

def audit_log(store: Store, event_type: str, detail: str | None = None) -> None:
    """Append an audit log entry (molt, veto, shutdown, etc.)."""
    import time
    with store._conn() as c:
        c.execute(
            "INSERT INTO audit_log (entity_id, event_type, detail, created_at) VALUES (?, ?, ?, ?)",
            (store.entity_id, event_type, detail or "", time.time()),
        )
        c.commit()


def get_governance_value(store: Store, key: str) -> str | None:
    """Get a governance state value (e.g. last_molt_at, paused)."""
    with store._conn() as c:
        cur = c.execute(
            "SELECT value FROM governance_state WHERE entity_id = ? AND key = ?",
            (store.entity_id, key),
        )
        row = cur.fetchone()
    return row[0] if row else None


def set_governance_value(store: Store, key: str, value: str) -> None:
    """Set a governance state value."""
    import time
    with store._conn() as c:
        c.execute(
            """INSERT OR REPLACE INTO governance_state (entity_id, key, value, updated_at)
               VALUES (?, ?, ?, ?)""",
            (store.entity_id, key, value, time.time()),
        )
        c.commit()


# --- Inbox (multi-entity handoff) ---

def put_inbox(
    store: Store,
    from_entity_id: str,
    artifact_ref: str,
    payload_hash: str,
    signature: str,
    payload_text: str | None = None,
) -> None:
    """Add a signed artifact to this entity's inbox (store is the recipient)."""
    import time
    with store._conn() as c:
        c.execute(
            """INSERT INTO inbox (entity_id, from_entity_id, artifact_ref, payload_text, payload_hash, signature, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (store.entity_id, from_entity_id, artifact_ref, payload_text or "", payload_hash, signature, time.time()),
        )
        c.commit()


def get_inbox(store: Store, limit: int = 20) -> list[dict[str, Any]]:
    """Return recent inbox entries for this entity (recipient)."""
    with store._conn() as c:
        cur = c.execute(
            """SELECT from_entity_id, artifact_ref, payload_text, payload_hash, signature, created_at
               FROM inbox WHERE entity_id = ? ORDER BY id DESC LIMIT ?""",
            (store.entity_id, limit),
        )
        rows = cur.fetchall()
    return [
        {
            "from_entity_id": r[0],
            "artifact_ref": r[1],
            "payload_text": r[2],
            "payload_hash": r[3],
            "signature": r[4],
            "created_at": r[5],
        }
        for r in rows
    ]


# --- Outcomes and strategies (recursive improvement) ---

def record_outcome(
    store: Store,
    verification_passed: bool,
    latency_sec: float | None = None,
    task_ref: str | None = None,
) -> None:
    """Record one task outcome for measurement."""
    import time
    with store._conn() as c:
        c.execute(
            """INSERT INTO outcomes (entity_id, task_ref, verification_passed, latency_sec, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (store.entity_id, task_ref or "", 1 if verification_passed else 0, latency_sec, time.time()),
        )
        c.commit()


def get_recent_outcomes(store: Store, k: int = 20) -> list[dict[str, Any]]:
    """Return the k most recent outcomes for this entity."""
    with store._conn() as c:
        cur = c.execute(
            """SELECT task_ref, verification_passed, latency_sec, created_at
               FROM outcomes WHERE entity_id = ? ORDER BY id DESC LIMIT ?""",
            (store.entity_id, k),
        )
        rows = cur.fetchall()
    return [
        {"task_ref": r[0], "verification_passed": bool(r[1]), "latency_sec": r[2], "created_at": r[3]}
        for r in rows
    ]


def get_strategy(store: Store, role: str) -> str | None:
    """Return current strategy (prompt) for role, or None if not set."""
    with store._conn() as c:
        cur = c.execute(
            "SELECT content FROM strategies WHERE entity_id = ? AND role = ? ORDER BY version DESC LIMIT 1",
            (store.entity_id, role),
        )
        row = cur.fetchone()
    return row[0] if row else None


def set_strategy(store: Store, role: str, content: str) -> None:
    """Set strategy (prompt) for role; inserts new version."""
    import time
    with store._conn() as c:
        cur = c.execute(
            "SELECT COALESCE(MAX(version), 0) FROM strategies WHERE entity_id = ? AND role = ?",
            (store.entity_id, role),
        )
        row = cur.fetchone()
        version = (row[0] or 0) + 1
        c.execute(
            """INSERT INTO strategies (entity_id, role, version, content, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (store.entity_id, role, version, content, time.time()),
        )
        c.commit()
