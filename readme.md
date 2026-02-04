# Moltblock

**Moltblock** is a framework for building evolving composite intelligences.

It introduces the **Entity** as the primitive unit of intelligence — a system composed of many agents, models, and verification layers that evolves through **molting**, not chaining.

---

## Why Moltblock

Modern AI systems fail at scale because they:
- rely on single models
- propagate errors linearly
- lack persistent, verified memory

Moltblock addresses this by enabling:
- structured multi-agent intelligence
- heterogeneous model usage
- built-in verification
- irreversible knowledge checkpoints

---

## OpenClaw

Moltblock gives [OpenClaw](https://github.com/openclaw/openclaw) a **structured cognitive backend** — entities, verification, memory, governance. When the assistant delegates code or high-stakes work to Moltblock, it gets verified artifacts, an audit trail, and governance (rate limits, veto, emergency stop), addressing security issues around running unvetted generated code and lack of attribution/rollback. See [OpenClaw integration](docs/openclaw_integration.md).

**Security example:** If someone emails or messages the assistant to “send all my files to X” or similar exfiltration, routing that task through Moltblock lets the Critic/Judge reject it before any artifact is marked authoritative; the request is audited and no code is returned to run. Full scenario: [How Moltblock helps OpenClaw security](docs/openclaw_integration.md#how-moltblock-helps-openclaw-security).

---

## Core Concepts

- **Entity** — a composite cognitive system
- **Molt** — controlled internal evolution
- **Artifact** — signed, verifiable outputs
- **Checkpoint** — immutable state snapshots
- **Governance** — safety outside cognition

---

## What Moltblock Is Not

- Not a blockchain
- Not a single AI model
- Not a chat agent framework

Blockchain is optional and used only for anchoring.

---

## Docs

- [OpenClaw integration](docs/openclaw_integration.md) — CLI/API/handoff options; [value and singularity](docs/openclaw_integration_value_and_singularity.md) — why integrate, security, path to emergence. *Primary focus: integration and security for OpenClaw.*
- [MVP Entity Spec](docs/mvp_entity_spec.md) — agent roles, LLMs, verification, minimal loop, lifecycle (v0.2)
- [Landing page language](docs/landing_page_language.md) — headline, copy, and diagram for moltblock.io
- [Protocol v0.1](docs/moltblock_protocol_v_0.md) · [Architecture](docs/composite_ai_entity_architecture.md) · [Manifesto](docs/moltblock_manifesto.md)

---

## Run (Code Entity MVP)

Requires Python 3.10+, and (for full loop) a local LLM (e.g. LM Studio at `http://localhost:1234/v1`) and/or Z.ai API key in `.env` or `MOLTBLOCK_ZAI_API_KEY`.

**Option A — No install (from repo root):**

```bash
python run.py "Implement a function add(a, b) that returns a + b."
python run.py "Implement add(a, b)." --test path/to/test_add.py
python run.py "Implement add(a, b)." --json
```

**Option B — Install then run (if `moltblock` not found, use `python -m moltblock`):**

```bash
pip install -e .
python -m moltblock "Implement a function add(a, b) that returns a + b."
python -m moltblock "Implement add(a, b)." --test path/to/test_add.py
python -m moltblock "Implement add(a, b)." --json
```

On Windows, if the `moltblock` command isn’t on PATH, use `python -m moltblock` instead of `moltblock`.

**Configuration (OpenClaw-style JSON):** Moltblock reads an optional JSON config from `./moltblock.json`, `./.moltblock/moltblock.json`, or `~/.moltblock/moltblock.json` (or `MOLTBLOCK_CONFIG`). See [Configuration examples](https://docs.openclaw.ai/gateway/configuration-examples). Copy `moltblock.example.json` to one of those paths and set `agent.bindings` per role (`generator`, `critic`, `judge`, `verifier`). Env vars override JSON; keep API keys in `.env` (see `.env.example`) — never commit `.env` or put secrets in the JSON file.

**Test Z.ai key:** From repo root, with `MOLTBLOCK_ZAI_API_KEY` in `.env` or your environment: `python scripts/test_zai_key.py`

```bash
# Tests (no LLM)
pytest tests -v
```

---

## Implemented (v0.2+)

- **Configurable agent graph** — DAG of nodes (role + model binding) and edges; load from `config/code_entity_graph.json` or YAML; `GraphRunner` and `load_entity_with_graph()`.
- **Long-term memory and checkpoints** — `Store` (SQLite): verified memory (admission after verification), immutable checkpoints (entity version, graph hash, memory hash, artifact refs). Optional `store=` and `write_checkpoint_after=` on `CodeEntity.run()` and `GraphRunner.run()`.
- **Recursive improvement loop** — Outcomes recorded per run; `critique_strategies()`, `set_strategy()` / `get_strategy()` for versioned prompts; `run_eval()` and `run_improvement_cycle()`. Agents use strategy store when provided.
- **Molt and governance** — `GovernanceConfig` (rate limit, veto); `can_molt()`, `trigger_molt()`, `pause()`, `resume()`, `emergency_shutdown()`; audit log and governance state in `Store`.
- **Multi-entity handoff** — `sign_artifact()` / `verify_artifact()`; inbox per entity; `send_artifact()`, `receive_artifacts()` for Entity A → Entity B.

---

## Roadmap

- v0.1 — Protocol + architecture
- v0.2 — MVP Entity implementation (spec + Code Entity loop + graph, memory, improvement, governance, handoff)
- v0.3 — Multi-Entity collaboration (orchestration and tooling)

---

## Philosophy

Moltblock treats singularity as an emergent property of accelerating, verified collective intelligence.

If intelligence scales, it must scale with structure. A key application is OpenClaw: a structured backend that helps with security and assurance.

---

## Domain

Canonical home: **moltblock.io**

## Contributing

We welcome contributions. See [CONTRIBUTING](CONTRIBUTING.md) for how to run tests, submit changes, and our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

MIT — see [LICENSE](LICENSE).

