"""Governance: molt rate limits, human veto, audit. Enforced outside the cognitive loop."""

import time
from dataclasses import dataclass

from .persistence import (
    Store,
    audit_log,
    get_governance_value,
    set_governance_value,
)


@dataclass
class GovernanceConfig:
    """Governance settings: who can molt, rate limits, veto."""

    molt_rate_limit_sec: float = 60.0
    allowed_molt_triggers: list[str] = None
    human_veto_paused: bool = False

    def __post_init__(self) -> None:
        if self.allowed_molt_triggers is None:
            self.allowed_molt_triggers = ["system", "human"]


def can_molt(store: Store, config: GovernanceConfig) -> tuple[bool, str]:
    """
    Return (allowed, reason). Checks rate limit and veto.
    """
    if config.human_veto_paused:
        paused = get_governance_value(store, "paused")
        if paused == "1":
            return False, "Entity is paused (human veto)"
    last = get_governance_value(store, "last_molt_at")
    if last:
        try:
            t = float(last)
            if (time.time() - t) < config.molt_rate_limit_sec:
                return False, f"Molt rate limit: wait {config.molt_rate_limit_sec}s between molts"
        except ValueError:
            pass
    return True, ""


def trigger_molt(
    store: Store,
    entity_version: str,
    config: GovernanceConfig,
    graph_hash: str = "",
    memory_hash: str = "",
    artifact_refs: list[str] | None = None,
) -> tuple[bool, str]:
    """
    Trigger a molt: validate governance, write checkpoint, bump version, audit.
    New graph/bindings/prompts are applied by the caller (e.g. load new graph).
    Returns (success, message).
    """
    allowed, reason = can_molt(store, config)
    if not allowed:
        return False, reason
    artifact_refs = artifact_refs or []
    store.write_checkpoint(entity_version, graph_hash or "molt", memory_hash or "", artifact_refs)
    set_governance_value(store, "last_molt_at", str(time.time()))
    set_governance_value(store, "entity_version", entity_version)
    audit_log(store, "molt", f"version={entity_version} graph_hash={graph_hash}")
    return True, "Molt completed"


def pause(store: Store) -> None:
    """Human veto: pause the entity (no further work until resumed)."""
    set_governance_value(store, "paused", "1")
    audit_log(store, "pause", "human veto")


def resume(store: Store) -> None:
    """Resume after pause."""
    set_governance_value(store, "paused", "0")
    audit_log(store, "resume", "")


def is_paused(store: Store) -> bool:
    """Return True if entity is paused."""
    return get_governance_value(store, "paused") == "1"


def emergency_shutdown(store: Store) -> None:
    """Record emergency shutdown in audit log."""
    audit_log(store, "emergency_shutdown", "")
