# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Moltblock is a Node.js/TypeScript framework for building evolving composite AI intelligences called "Entities". Entities combine multiple AI agents (Generator, Critic, Judge, Verifier) that execute in a DAG, with verification gating all artifacts before they gain authority. The core metaphor is "molting" — controlled state transitions where agents/models/strategies evolve while identity and verified memory persist.

## Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Type check
npm run lint

# Run CLI (after build)
npx moltblock "Your task" --test path/to/test.ts --json
```

## Architecture

### Entity Lifecycle
Birth → Work → Checkpoint → Molt → (repeat)

### Minimal Runnable Loop (entity.ts)
```
Task In → Generator (draft) → Critic (critique) → Judge (final) → Verifier (vitest) → Gating → Artifact Out
```

### Key Modules

| Module | Purpose |
|--------|---------|
| `entity.ts` | CodeEntity orchestrates one full task loop |
| `entity-base.ts` | Generic Entity with pluggable verifier and domain |
| `agents.ts` | Generator, Critic, Judge role implementations (domain-aware) |
| `graph-runner.ts` | Executes agent DAG in topological order |
| `verifier.ts` | Runs vitest on generated code, gates authority |
| `verifier-interface.ts` | Pluggable Verifier interface and result types |
| `policy-verifier.ts` | Rule-based verifier with built-in deny rules |
| `code-verifier.ts` | Adapter wrapping vitest verifier into Verifier interface |
| `composite-verifier.ts` | Chains multiple verifiers, all must pass |
| `domain-prompts.ts` | Prompt registry: "code" + "general" domains |
| `risk.ts` | classifyRisk() — keyword-based risk levels |
| `persistence.ts` | SQLite store for verified memory, checkpoints, audit |
| `governance.ts` | Molt rate limits, human veto, pause/resume |
| `handoff.ts` | Multi-entity artifact delivery with HMAC signing |
| `improvement.ts` | Outcome tracking, strategy critique & updates (domain-aware) |
| `gateway.ts` | OpenAI-compatible LLM client per role |
| `config.ts` | JSON config + env overrides for bindings + policy rules |

### Agent Graph (config/code_entity_graph.json)
Declarative DAG where each node specifies role and model binding. GraphRunner executes nodes in topological order, passing outputs downstream through slots.

### Persistence Tables (SQLite)
- `verified_memory` — Artifacts admitted post-verification
- `checkpoints` — Immutable snapshots (version, graph_hash, memory_hash)
- `outcomes` — Pass/fail per task for improvement loop
- `strategies` — Versioned system prompts per role
- `audit_log` — Molt, pause, resume, emergency events
- `inbox` — Multi-entity handoff queue

## Configuration

Config loaded from (in order): `MOLTBLOCK_CONFIG` env, `./moltblock.json`, `./.moltblock/moltblock.json`, `~/.moltblock/moltblock.json`

```json
{
  "agent": {
    "bindings": {
      "generator": {"backend": "openai", "base_url": "...", "model": "..."},
      "critic": {...},
      "judge": {...},
      "verifier": {...}
    }
  }
}
```

API keys via environment: `MOLTBLOCK_ZAI_API_KEY`, `MOLTBLOCK_SIGNING_KEY`

## Code Style

- TypeScript (ESM), Node.js 22+
- Strict typing, avoid `any`
- Zero-trust: API keys from env only, never hardcoded
- Zod for runtime validation

## Testing

- Framework: Vitest
- Run: `npm test`
- Coverage: `npm run test:coverage`

## Dependencies

| Purpose | Package |
|---------|---------|
| Schema validation | `zod` |
| LLM client | `openai` |
| SQLite | `better-sqlite3` |
| CLI | `commander` |
| Env vars | `dotenv` |
| YAML | `js-yaml` |
