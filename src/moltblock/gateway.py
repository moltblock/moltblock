"""LLM gateway: single interface for local (LM Studio/llama.cpp) and Z.ai / OpenAI-compatible APIs."""

from openai import OpenAI

from .config import ModelBinding


def _resolve_local_model(client: OpenAI, base_url: str, configured: str) -> str:
    """If model is 'local' or empty and base_url is localhost, use first available model from API."""
    if configured and configured != "local":
        return configured
    if "localhost" not in base_url and "127.0.0.1" not in base_url:
        return configured or "default"
    try:
        models = list(client.models.list())
        if models and models[0].id:
            return models[0].id
    except Exception:
        pass
    return configured or "default"


class LLMGateway:
    """One client per role; uses OpenAI-compatible API with base_url and optional api_key."""

    def __init__(self, binding: ModelBinding) -> None:
        self._binding = binding
        self._client = OpenAI(
            base_url=binding.base_url,
            api_key=binding.api_key or "not-needed",
        )
        self._model = _resolve_local_model(
            self._client, binding.base_url, binding.model
        )

    def complete(self, messages: list[dict[str, str]], max_tokens: int = 2048) -> str:
        """Send chat completion request; return assistant content."""
        resp = self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            max_tokens=max_tokens,
        )
        choice = resp.choices[0] if resp.choices else None
        if not choice or not choice.message:
            return ""
        return choice.message.content or ""
