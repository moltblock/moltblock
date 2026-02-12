# Moltblock

<p align="center">
  <a href="https://github.com/moltblock/moltblock/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/moltblock/moltblock/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://github.com/moltblock/moltblock/releases"><img src="https://img.shields.io/github/v/release/moltblock/moltblock?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="https://www.npmjs.com/package/moltblock"><img src="https://img.shields.io/npm/v/moltblock?style=for-the-badge" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

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

Requires Node.js 22+, and (for full loop) any OpenAI-compatible API:
- **OpenAI** — `https://api.openai.com/v1` with `OPENAI_API_KEY`
- **Anthropic Claude** — `https://api.anthropic.com/v1` with `ANTHROPIC_API_KEY`
- **Google Gemini** — `https://generativelanguage.googleapis.com/v1beta/openai` with `GOOGLE_API_KEY`
- **Local LLMs** — LM Studio, Ollama, etc. at `http://localhost:1234/v1`
- **Other providers** — Any OpenAI-compatible endpoint (Z.ai, Together, Groq, etc.)

**Install from npm:**

```bash
npm install -g moltblock

# Run a task
moltblock "Implement a function add(a, b) that returns a + b."
moltblock "Implement add(a, b)." --test path/to/test_add.ts
moltblock "Implement add(a, b)." --json
```

**Or run directly with npx (no install):**

```bash
npx moltblock "Implement add(a, b)."
```

**Or install from source:**

```bash
git clone https://github.com/moltblock/moltblock.git
cd moltblock
npm install
npm run build
npx moltblock "Implement add(a, b)."
```

---

## Configuration

### Zero-config (auto-detect)

If you have an API key set in your environment, moltblock detects the provider automatically — no config file needed:

```bash
export OPENAI_API_KEY="sk-..."   # auto-detects OpenAI
npx moltblock "Implement add(a, b)." --json
```

Override with CLI flags: `--provider google --model gemini-2.0-flash` or `-p zai -m glm-4.7`.

Detection priority: `OPENAI_API_KEY` > `GOOGLE_API_KEY` > `MOLTBLOCK_ZAI_API_KEY` > localhost.

### Quick setup

Create a config file at `~/.moltblock/moltblock.json` (user-wide) or `./moltblock.json` (project-specific):

```bash
# User-wide config (recommended)
mkdir -p ~/.moltblock
cat > ~/.moltblock/moltblock.json << 'EOF'
{
  "agent": {
    "bindings": {
      "generator": {
        "backend": "openai",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o"
      },
      "critic": {
        "backend": "openai",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o"
      },
      "judge": {
        "backend": "openai",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o"
      },
      "verifier": {
        "backend": "local",
        "base_url": "http://localhost:1234/v1",
        "model": "local"
      }
    }
  }
}
EOF
```

Then set your API key:
```bash
export OPENAI_API_KEY="sk-..."
# Or add to ~/.bashrc / ~/.zshrc
```

### Config search order

Moltblock searches for config in this order:

1. `MOLTBLOCK_CONFIG` env var (explicit path)
2. `./moltblock.json` (current directory)
3. `./.moltblock/moltblock.json` (hidden folder in current directory)
4. `~/.moltblock/moltblock.json` (user home directory — **recommended**)
5. **Fallback to OpenClaw:** `~/.openclaw/openclaw.json` (if you use OpenClaw)
6. Environment variables only (no config file)

### API keys

Set API keys via environment variables (never in config files):

| Provider | Environment Variable |
|----------|---------------------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic Claude | `ANTHROPIC_API_KEY` |
| Google Gemini | `GOOGLE_API_KEY` |
| Z.ai | `MOLTBLOCK_ZAI_API_KEY` |
| Artifact signing | `MOLTBLOCK_SIGNING_KEY` (required in production) |

### Check which config is being used

```typescript
import { loadMoltblockConfig, getConfigSource } from "moltblock";

loadMoltblockConfig();
console.log(getConfigSource()); // "moltblock", "openclaw", or "env"
```

```bash
# Tests (no LLM required)
npm test
```

---

## Implemented (v0.2+)

- **Configurable agent graph** — DAG of nodes (role + model binding) and edges; load from `config/code_entity_graph.json` or YAML; `GraphRunner` and `loadEntityWithGraph()`.
- **Long-term memory and checkpoints** — `Store` (SQLite): verified memory (admission after verification), immutable checkpoints (entity version, graph hash, memory hash, artifact refs). Optional `store` and `writeCheckpointAfter` options on `CodeEntity.run()` and `GraphRunner.run()`.
- **Recursive improvement loop** — Outcomes recorded per run; `critiqueStrategies()`, `setStrategy()` / `getStrategy()` for versioned prompts; `runEval()` and `runImprovementCycle()`. Agents use strategy store when provided.
- **Molt and governance** — `GovernanceConfig` (rate limit, veto); `canMolt()`, `triggerMolt()`, `pause()`, `resume()`, `emergencyShutdown()`; audit log and governance state in `Store`.
- **Multi-entity handoff** — `signArtifact()` / `verifyArtifact()`; inbox per entity; `sendArtifact()`, `receiveArtifacts()` for Entity A → Entity B.

### New in v0.6

- **Pluggable verifier system** — `Verifier` interface so verification isn't limited to vitest. Implement `verify(memory, context)` to plug in any gating strategy.
- **PolicyVerifier** — Rule-based verifier with ~20 built-in deny rules. Catches destructive commands (`rm -rf`, `DROP TABLE`), sensitive file access (`.ssh/`, `/etc/shadow`), hardcoded secrets, and exfiltration patterns — all without an LLM call.
- **CodeVerifier** — Adapter wrapping the existing vitest verifier into the pluggable interface.
- **CompositeVerifier** — Chains multiple verifiers (e.g. policy + code); all must pass. Supports fail-fast and collect-all modes.
- **Generic Entity** — `Entity` class with pluggable verifier and domain-aware prompts. Use `new Entity({ domain: "general" })` for non-code tasks.
- **Domain prompts** — Registry mapping domains to role-specific system prompts. Built-in `"code"` and `"general"` domains; register custom domains with `registerDomain()`.
- **Risk classification** — `classifyRisk(task)` returns `"low"` / `"medium"` / `"high"` with reasons. Pure regex matching, no LLM needed.
- **Policy rules in config** — Add custom `policy.rules` to `moltblock.json` for project-specific allow/deny rules.
- **OpenClaw skill** — `skill/SKILL.md` for one-step installation into OpenClaw workspace.

---

## Policy Verifier

The `PolicyVerifier` catches dangerous patterns in artifacts and tasks without needing an LLM:

```typescript
import { PolicyVerifier, WorkingMemory } from "moltblock";

const verifier = new PolicyVerifier();
const memory = new WorkingMemory();
memory.setFinalCandidate("rm -rf /");

const result = await verifier.verify(memory);
// result.passed === false
// result.evidence includes "[cmd-rm-rf] Recursive force delete"
```

Custom rules can be added via constructor or config:

```typescript
const verifier = new PolicyVerifier([
  {
    id: "allow-tmp-cleanup",
    description: "Allow cleanup in /tmp",
    target: "artifact",
    pattern: "\\/tmp\\/",
    action: "allow",
    category: "destructive-cmd",
    enabled: true,
  },
]);
```

---

## Risk Classification

Classify task risk before deciding whether to verify:

```typescript
import { classifyRisk } from "moltblock";

classifyRisk("write a hello world function");
// { level: "low", reasons: [] }

classifyRisk("sudo rm -rf /home/user");
// { level: "high", reasons: ["Sudo privilege escalation", "Recursive file deletion (rm -rf)"] }
```

---

## Generic Entity

For non-code tasks, use the generic `Entity` with domain-aware prompts:

```typescript
import { Entity, PolicyVerifier, CompositeVerifier, CodeVerifier } from "moltblock";

// General-purpose entity (policy verification only)
const entity = new Entity({ domain: "general" });

// Code entity with both policy and vitest verification
const codeEntity = new Entity({
  domain: "code",
  verifier: new CompositeVerifier([new PolicyVerifier(), new CodeVerifier()]),
});
```

---

## Roadmap

- v0.1 — Protocol + architecture
- v0.2 — MVP Entity implementation (spec + Code Entity loop + graph, memory, improvement, governance, handoff)
- v0.3 — Multi-Entity collaboration (orchestration and tooling)
- v0.6 — Pluggable verification, policy rules, generic entity, risk classification, OpenClaw skill

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

