---
name: moltblock - Trust Layer for AI Agents
description: Verification gating for AI-generated artifacts. Policy checks to catch dangerous patterns before execution.
version: 0.11.7
homepage: https://github.com/moltblock/moltblock
repository: https://github.com/moltblock/moltblock
metadata:
  openclaw:
    requires:
      anyBins:
        - npx
        - node
    optionalConfig:
      - moltblock.json
      - ~/.moltblock/moltblock.json
    primaryEnv: OPENAI_API_KEY
    optionalEnv:
      - ANTHROPIC_API_KEY
      - GOOGLE_API_KEY
      - ZAI_API_KEY
    homepage: https://github.com/moltblock/moltblock
    install:
      - kind: node
        package: moltblock@0.11.7
        bins: [moltblock]
---

# moltblock — Trust Layer for AI Agents

## Description

Moltblock provides verification gating for AI-generated artifacts. It runs policy checks to catch dangerous patterns before they reach production.

**What moltblock does:**
- Generates artifacts via LLM API calls, then runs policy checks against the output
- Returns a structured verification result (pass/fail with evidence)
- Optionally reads config files (`moltblock.json`, `~/.moltblock/moltblock.json`) if present — no config is required
- API keys are read from environment variables at runtime and sent only to the configured LLM provider endpoint
- **When used as a skill (without `--test`):** only policy checks run — no code is generated, written to disk, or executed
- **The `--test` flag** (developer-only, not exposed to agents via this skill) additionally runs code verification via vitest in an isolated temp directory

## When to Use

Use `moltblock` when the task involves:

- **High risk** (always verify): Destructive operations (`rm -rf`, `DROP TABLE`), privilege escalation (`sudo`, `chmod 777`), credential/key access (`.ssh/`, `id_rsa`, `.env`), system modification, raw disk writes
- **Medium risk** (verify when uncertain): Network requests (`curl`, `wget`, `fetch`), file writes, database modifications, subprocess spawning, dynamic code evaluation
- **Low risk** (skip verification): Simple text responses, math, reading public information, code that doesn't touch the filesystem or network

## Tool: moltblock

Verify a task before execution.

### Usage

```bash
npx moltblock@0.11.7 "<task description>" --provider <provider> --json
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| task | Yes | The task description to verify |
| --provider | No | LLM provider: openai, google, zai, local (auto-detected from env) |
| --model | No | Model override |
| --json | No | Output structured JSON result |

### Environment Variables

Moltblock auto-detects the LLM provider from whichever API key is set. If no key is set, it falls back to a local LLM at `localhost:1234`. Set **one** of these for a cloud provider:
- `OPENAI_API_KEY` — OpenAI (primary)
- `ANTHROPIC_API_KEY` — Anthropic/Claude (optional)
- `GOOGLE_API_KEY` — Google/Gemini (optional)
- `ZAI_API_KEY` — ZAI (optional)

### Example

```bash
# Verify a task
npx moltblock@0.11.7 "implement a function that validates email addresses" --json
```

### Output (JSON mode)

```json
{
  "verification_passed": true,
  "verification_evidence": "All policy rules passed.",
  "authoritative_artifact": "...",
  "draft": "...",
  "critique": "...",
  "final_candidate": "..."
}
```

## Installation

Use directly with npx (recommended, no install needed):

```bash
npx moltblock@0.11.7 "your task" --json
```

Or install globally:

```bash
npm install -g moltblock@0.11.7
```

## Configuration

No configuration file is required. Moltblock auto-detects your LLM provider from environment variables and falls back to sensible defaults.

Optionally, place `moltblock.json` in your project root or `~/.moltblock/moltblock.json` to customize model bindings:

```json
{
  "agent": {
    "bindings": {
      "generator": { "backend": "google", "model": "gemini-2.0-flash" },
      "critic": { "backend": "google", "model": "gemini-2.0-flash" },
      "judge": { "backend": "google", "model": "gemini-2.0-flash" }
    }
  }
}
```

See the [full configuration docs](https://github.com/moltblock/moltblock#configuration) for policy rules and advanced options.

## Source

- Repository: [github.com/moltblock/moltblock](https://github.com/moltblock/moltblock)
- npm: [npmjs.com/package/moltblock](https://www.npmjs.com/package/moltblock)
- License: MIT

## Security

**Skill surface (agent-facing):** When invoked via `npx moltblock "<task>" --json`, the tool makes LLM API calls and runs regex-based policy checks against the generated output. No code is written to disk or executed. Task descriptions and generated artifacts are transmitted to the configured LLM provider endpoint.

**Developer-only CLI surface:** The CLI supports a `--test <path>` flag that additionally runs code verification via vitest in an isolated temp directory. This flag is **not exposed to agents** through this skill and is documented here only for transparency. It should only be used directly by developers in sandboxed environments.

**npm install behavior:** The package has no `postinstall` scripts. `better-sqlite3` (a dependency) uses `prebuild-install` to download prebuilt native binaries — no compilation occurs unless prebuilds are unavailable. Inspect via `npm pack --dry-run` or review the [source on GitHub](https://github.com/moltblock/moltblock).

**API key scope:** Consider using a limited-scope API key dedicated to verification rather than a key with broader permissions.

## Disclaimer

Moltblock reduces risk but does not eliminate it. Verification is best-effort — policy rules and LLM-based checks can miss dangerous patterns. Always review generated artifacts before executing them. The authors and contributors are not responsible for any damage, data loss, or security incidents resulting from the use of this tool. Use at your own risk.
