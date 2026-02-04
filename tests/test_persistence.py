"""Tests for persistence (verified memory + checkpoints)."""

import pytest

from moltblock.persistence import Store, hash_graph, hash_memory


def test_store_add_and_get_verified() -> None:
    store = Store(path=":memory:", entity_id="test")
    store.add_verified("ref1", summary="First", content_preview="code block 1")
    store.add_verified("ref2", summary="Second", content_preview="code block 2")
    recent = store.get_recent_verified(5)
    assert len(recent) == 2
    assert recent[0]["artifact_ref"] == "ref2"
    assert recent[0]["summary"] == "Second"
    assert recent[1]["artifact_ref"] == "ref1"


def test_store_checkpoint() -> None:
    store = Store(path=":memory:", entity_id="test")
    store.write_checkpoint("0.2.0", "abc123", "mem456", ["ref1", "ref2"])
    cps = store.list_checkpoints(10)
    assert len(cps) == 1
    assert cps[0]["entity_version"] == "0.2.0"
    assert cps[0]["graph_hash"] == "abc123"
    assert cps[0]["artifact_refs"] == ["ref1", "ref2"]


def test_hash_graph() -> None:
    h = hash_graph('{"nodes":[]}')
    assert len(h) == 16
    assert hash_graph('{"nodes":[]}') == h


def test_hash_memory() -> None:
    h = hash_memory(["a", "b"])
    assert len(h) == 16
    assert hash_memory(["a", "b"]) == h


def test_record_outcome_and_get_recent() -> None:
    from moltblock.persistence import get_recent_outcomes, record_outcome
    store = Store(path=":memory:", entity_id="test")
    record_outcome(store, True, latency_sec=1.0, task_ref="task1")
    record_outcome(store, False, task_ref="task2")
    outcomes = get_recent_outcomes(store, 5)
    assert len(outcomes) == 2
    assert outcomes[0]["verification_passed"] is False
    assert outcomes[1]["verification_passed"] is True


def test_get_set_strategy() -> None:
    from moltblock.persistence import get_strategy, set_strategy
    store = Store(path=":memory:", entity_id="test")
    assert get_strategy(store, "generator") is None
    set_strategy(store, "generator", "Custom generator prompt.")
    assert get_strategy(store, "generator") == "Custom generator prompt."
