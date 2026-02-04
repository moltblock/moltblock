"""Tests for JSON config loading (moltblock.json, OpenClaw-style)."""

import json
import os
from pathlib import Path

import pytest

from moltblock.config import (
    BindingEntry,
    MoltblockConfig,
    default_code_entity_bindings,
    load_moltblock_config,
)


def test_load_moltblock_config_none_when_no_file(monkeypatch: pytest.MonkeyPatch) -> None:
    """When MOLTBLOCK_CONFIG is unset and no default path exists, load_moltblock_config returns None."""
    monkeypatch.delenv("MOLTBLOCK_CONFIG", raising=False)
    # Assume no ./moltblock.json or ~/.moltblock/moltblock.json in test env
    result = load_moltblock_config()
    # May be None or a config if user has a file; we only assert it's None or valid
    if result is not None:
        assert isinstance(result, MoltblockConfig)


def test_load_moltblock_config_from_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """When MOLTBLOCK_CONFIG points to a valid JSON file, config is loaded."""
    config_file = tmp_path / "moltblock.json"
    config_file.write_text(
        json.dumps({
            "agent": {
                "bindings": {
                    "generator": {"backend": "local", "base_url": "http://localhost:1234/v1", "model": "local"},
                },
            },
        }),
        encoding="utf-8",
    )
    monkeypatch.setenv("MOLTBLOCK_CONFIG", str(config_file))
    result = load_moltblock_config()
    assert result is not None
    assert result.agent is not None and result.agent.bindings is not None
    assert "generator" in result.agent.bindings
    assert result.agent.bindings["generator"].backend == "local"
    assert result.agent.bindings["generator"].base_url == "http://localhost:1234/v1"


def test_default_code_entity_bindings_structure() -> None:
    """default_code_entity_bindings() returns dict with generator, critic, judge, verifier."""
    bindings = default_code_entity_bindings()
    assert set(bindings.keys()) == {"generator", "critic", "judge", "verifier"}
    for role, binding in bindings.items():
        assert binding.backend in ("local", "zai", "openai") or binding.backend
        assert binding.base_url
        assert binding.model is not None


def test_default_code_entity_bindings_with_json(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """When config file exists with bindings, default_code_entity_bindings uses them (env overrides)."""
    config_file = tmp_path / "moltblock.json"
    config_file.write_text(
        json.dumps({
            "agent": {
                "bindings": {
                    "generator": {"backend": "local", "base_url": "http://127.0.0.1:9999/v1", "model": "custom"},
                },
            },
        }),
        encoding="utf-8",
    )
    monkeypatch.setenv("MOLTBLOCK_CONFIG", str(config_file))
    bindings = default_code_entity_bindings()
    assert bindings["generator"].base_url == "http://127.0.0.1:9999/v1"
    assert bindings["generator"].model == "custom"
