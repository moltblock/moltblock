"""LLM gateway config: per-role model binding. Load from JSON (moltblock.json) like OpenClaw, with env overrides."""

import json
import os
from pathlib import Path

from pydantic import BaseModel, Field

# Load .env so MOLTBLOCK_ZAI_API_KEY etc. can be set there (never commit .env)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


# --- JSON config schema (OpenClaw-style: ~/.moltblock/moltblock.json or ./moltblock.json) ---

class BindingEntry(BaseModel):
    """One role's binding from JSON. api_key optional; prefer env for secrets."""

    backend: str = Field(description="e.g. 'local' or 'zai' or 'openai'")
    base_url: str = Field(description="API base URL")
    model: str = Field(default="default", description="Model id for chat completion")
    api_key: str | None = Field(default=None, description="Bearer token; None for local. Prefer env.")


class AgentConfig(BaseModel):
    """Agent section in moltblock.json."""

    bindings: dict[str, BindingEntry] | None = Field(default=None, description="Per-role model bindings")


class MoltblockConfig(BaseModel):
    """Root config schema for moltblock.json. See Configuration Examples: docs.openclaw.ai."""

    agent: AgentConfig | None = Field(default=None, description="Agent defaults and bindings")


def _config_path() -> Path | None:
    """Resolve config file: MOLTBLOCK_CONFIG env, then ./moltblock.json, ./.moltblock/moltblock.json, ~/.moltblock/moltblock.json."""
    env_path = os.environ.get("MOLTBLOCK_CONFIG", "").strip()
    if env_path and Path(env_path).exists():
        return Path(env_path)
    cwd = Path.cwd()
    for candidate in (
        cwd / "moltblock.json",
        cwd / ".moltblock" / "moltblock.json",
        Path.home() / ".moltblock" / "moltblock.json",
    ):
        if candidate.exists():
            return candidate
    return None


def load_moltblock_config() -> MoltblockConfig | None:
    """Load and parse moltblock.json if present. Returns None if no file or parse error."""
    path = _config_path()
    if not path:
        return None
    try:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        return MoltblockConfig.model_validate(data)
    except (json.JSONDecodeError, Exception):
        return None


class ModelBinding(BaseModel):
    """One role's LLM backend: local (LM Studio/llama.cpp) or Z.ai / other cloud."""

    backend: str = Field(description="e.g. 'local' or 'zai' or 'openai'")
    base_url: str = Field(description="API base URL, e.g. http://localhost:1234/v1 or https://api.z.ai/...")
    api_key: str | None = Field(default=None, description="Bearer token; None for local")
    model: str = Field(default="default", description="Model name for chat completion")


def _env(key: str, default: str = "") -> str:
    return os.environ.get(key, default).strip()


def default_code_entity_bindings() -> dict[str, ModelBinding]:
    """Model bindings for Code Entity. Load from moltblock.json if present, then env overrides.
    If no JSON, uses env/.env only (backward compatible). API keys from env win over JSON."""
    cfg = load_moltblock_config()
    zai_key = _env("MOLTBLOCK_ZAI_API_KEY")
    local_url = _env("MOLTBLOCK_GENERATOR_BASE_URL") or "http://localhost:1234/v1"
    local_model = _env("MOLTBLOCK_GENERATOR_MODEL") or "local"

    def env_url(key: str, fallback: str) -> str:
        return _env(key) or fallback

    def env_model(key: str, fallback: str) -> str:
        return _env(key) or fallback

    bindings_from_json: dict[str, BindingEntry] = {}
    if cfg and cfg.agent and cfg.agent.bindings:
        bindings_from_json = cfg.agent.bindings

    def binding_for(role: str, default_backend: str, default_base: str, default_model: str, default_api_key: str | None) -> ModelBinding:
        entry = bindings_from_json.get(role)
        if entry:
            base_url = env_url(f"MOLTBLOCK_{role.upper()}_BASE_URL", entry.base_url)
            model = env_model(f"MOLTBLOCK_{role.upper()}_MODEL", entry.model)
            api_key = _env(f"MOLTBLOCK_{role.upper()}_API_KEY") or entry.api_key or (zai_key if entry.backend == "zai" else None)
            return ModelBinding(backend=entry.backend, base_url=base_url, api_key=api_key, model=model)
        # No JSON: legacy env-only behavior
        if role == "generator":
            return ModelBinding(backend="local", base_url=local_url, api_key=None, model=local_model)
        if role == "critic":
            use_zai = bool(zai_key)
            return ModelBinding(
                backend="zai" if use_zai else "local",
                base_url=env_url("MOLTBLOCK_CRITIC_BASE_URL", "https://api.z.ai/api/paas/v4" if use_zai else local_url),
                api_key=zai_key if use_zai else None,
                model=env_model("MOLTBLOCK_CRITIC_MODEL", "glm-4.7-flash" if use_zai else local_model),
            )
        if role == "judge":
            use_zai = bool(zai_key)
            return ModelBinding(
                backend="zai" if use_zai else "local",
                base_url=env_url("MOLTBLOCK_JUDGE_BASE_URL", "https://api.z.ai/api/paas/v4" if use_zai else local_url),
                api_key=zai_key if use_zai else None,
                model=env_model("MOLTBLOCK_JUDGE_MODEL", "glm-4.7-flash" if use_zai else local_model),
            )
        if role == "verifier":
            return ModelBinding(
                backend="local",
                base_url=env_url("MOLTBLOCK_VERIFIER_BASE_URL", local_url),
                api_key=None,
                model=env_model("MOLTBLOCK_VERIFIER_MODEL", local_model),
            )
        return ModelBinding(backend=default_backend, base_url=default_base, api_key=default_api_key, model=default_model)

    return {
        "generator": binding_for("generator", "local", local_url, local_model, None),
        "critic": binding_for("critic", "zai" if zai_key else "local", local_url, local_model, zai_key or None),
        "judge": binding_for("judge", "zai" if zai_key else "local", local_url, local_model, zai_key or None),
        "verifier": binding_for("verifier", "local", local_url, local_model, None),
    }
