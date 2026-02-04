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

- [MVP Entity Spec](mvp_entity_spec.md) — agent roles, LLMs, verification, minimal loop, lifecycle (v0.2)
- [Landing page language](landing_page_language.md) — headline, copy, and diagram for moltblock.io
- [Protocol v0.1](moltblock_protocol_v_0.md) · [Architecture](composite_ai_entity_architecture.md) · [Manifesto](moltblock_manifesto.md)

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

Optional env: `MOLTBLOCK_GENERATOR_BASE_URL`, `MOLTBLOCK_ZAI_API_KEY`, `MOLTBLOCK_CRITIC_MODEL`, etc. See [MVP Entity Spec](mvp_entity_spec.md) and `src/moltblock/config.py`. Use `.env` (see `.env.example`) — never commit `.env`.

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

If intelligence scales, it must scale with structure.

---

## Domain

Canonical home: **moltblock.io**

