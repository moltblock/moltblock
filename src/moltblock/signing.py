"""Entity signing: sign artifacts for attribution and handoff between entities."""

import hashlib
import hmac
import os
from base64 import b64decode, b64encode


def _get_secret(entity_id: str) -> bytes:
    """Secret for signing (from env MOLTBLOCK_SIGNING_KEY or entity-specific MOLTBLOCK_SIGNING_KEY_<id>)."""
    key = os.environ.get(f"MOLTBLOCK_SIGNING_KEY_{entity_id.upper()}", os.environ.get("MOLTBLOCK_SIGNING_KEY", ""))
    if not key:
        key = f"default-secret-{entity_id}"
    return key.encode("utf-8") if isinstance(key, str) else key


def sign_artifact(entity_id: str, payload: str | bytes) -> str:
    """Sign an artifact payload; return base64-encoded signature."""
    if isinstance(payload, str):
        payload = payload.encode("utf-8")
    sig = hmac.new(_get_secret(entity_id), payload, hashlib.sha256).digest()
    return b64encode(sig).decode("ascii")


def verify_artifact(entity_id: str, payload: str | bytes, signature_b64: str) -> bool:
    """Verify a signed artifact. Returns True if valid."""
    try:
        expected = sign_artifact(entity_id, payload)
        return hmac.compare_digest(expected, signature_b64)
    except Exception:
        return False


def artifact_hash(payload: str | bytes) -> str:
    """Stable hash of artifact content (for storage/reference)."""
    if isinstance(payload, str):
        payload = payload.encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:32]
