"""LLM gateway config: per-role model binding (backend, base_url, api_key)."""

from pydantic import BaseModel, Field

# Load .env so MOLTBLOCK_ZAI_API_KEY etc. can be set there (never commit .env)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class ModelBinding(BaseModel):
    """One role's LLM backend: local (LM Studio/llama.cpp) or Z.ai / other cloud."""

    backend: str = Field(description="e.g. 'local' or 'zai' or 'openai'")
    base_url: str = Field(description="API base URL, e.g. http://localhost:1234/v1 or https://api.z.ai/...")
    api_key: str | None = Field(default=None, description="Bearer token; None for local")
    model: str = Field(default="default", description="Model name for chat completion")


def default_code_entity_bindings() -> dict[str, ModelBinding]:
    """Default model bindings for Code Entity (hybrid local + Z.ai). Keys from env or .env only.
    If MOLTBLOCK_ZAI_API_KEY is not set, critic and judge use local (LM Studio) so the loop runs with one backend."""
    import os
    zai_key = os.environ.get("MOLTBLOCK_ZAI_API_KEY", "").strip()
    local_url = os.environ.get("MOLTBLOCK_GENERATOR_BASE_URL", "http://localhost:1234/v1")
    local_model = os.environ.get("MOLTBLOCK_GENERATOR_MODEL", "local")
    use_zai = bool(zai_key)
    return {
        "generator": ModelBinding(
            backend="local",
            base_url=local_url,
            api_key=None,
            model=local_model,
        ),
        "critic": ModelBinding(
            backend="zai" if use_zai else "local",
            base_url=os.environ.get("MOLTBLOCK_CRITIC_BASE_URL", "https://api.z.ai/api/paas/v4") if use_zai else local_url,
            api_key=zai_key if use_zai else None,
            model=os.environ.get("MOLTBLOCK_CRITIC_MODEL", "glm-4.7-flash") if use_zai else local_model,
        ),
        "judge": ModelBinding(
            backend="zai" if use_zai else "local",
            base_url=os.environ.get("MOLTBLOCK_JUDGE_BASE_URL", "https://api.z.ai/api/paas/v4") if use_zai else local_url,
            api_key=zai_key if use_zai else None,
            model=os.environ.get("MOLTBLOCK_JUDGE_MODEL", "glm-4.7-flash") if use_zai else local_model,
        ),
        "verifier": ModelBinding(
            backend="local",
            base_url=os.environ.get("MOLTBLOCK_VERIFIER_BASE_URL", local_url),
            api_key=None,
            model=os.environ.get("MOLTBLOCK_VERIFIER_MODEL", local_model),
        ),
    }
