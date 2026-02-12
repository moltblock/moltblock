#!/usr/bin/env python3
"""Test Z.ai API key: one chat completion using ZAI_API_KEY from env or .env."""

import sys
from pathlib import Path

# Load from repo root so .env is found
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "src"))

# Load .env and get binding
from moltblock.config import default_code_entity_bindings
from moltblock.gateway import LLMGateway

bindings = default_code_entity_bindings()
critic = bindings["critic"]

if not critic.api_key:
    print("FAIL: ZAI_API_KEY is not set (check .env or environment).")
    sys.exit(1)

print("Using Z.ai base_url:", critic.base_url, "model:", critic.model)
gateway = LLMGateway(critic)
try:
    out = gateway.complete(
        [{"role": "user", "content": "Reply with exactly: OK"}],
        max_tokens=10,
    )
    out = (out or "").strip()
    if "OK" in out or out:
        print("PASS: Z.ai key is valid. Response:", out[:80])
    else:
        print("PASS: Z.ai responded (empty content). Key is valid.")
except Exception as e:
    print("FAIL:", type(e).__name__, str(e))
    sys.exit(1)
