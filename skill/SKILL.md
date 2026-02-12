---
name: moltblock
description: Verification gating for AI-generated artifacts. Policy checks and code verification to catch dangerous patterns before execution.
version: 0.7.5
metadata:
  openclaw:
    requires:
      anyBins:
        - npx
        - node
      config:
        - moltblock.json
        - ~/.moltblock/moltblock.json
    primaryEnv: OPENAI_API_KEY
    homepage: https://github.com/moltblock/moltblock
    install:
      - kind: node
        package: moltblock@latest
        bins: [moltblock]
---

# moltblock — Trust Layer for AI Agents

## Description

Moltblock provides verification gating for AI-generated artifacts. It runs policy checks and optional code verification (via vitest) to catch dangerous patterns before they reach production.

**What moltblock does NOT do:**
- Does not execute generated code on your system
- Does not access, read, or modify files outside its own config
- Does not make network calls beyond the configured LLM API
- Does not store or transmit your API keys — they are read from env vars at runtime only

## When to Use

Use `moltblock` when the task involves:

- **High risk** (always verify): Destructive operations (`rm -rf`, `DROP TABLE`), privilege escalation (`sudo`, `chmod 777`), credential/key access (`.ssh/`, `id_rsa`, `.env`), system modification, raw disk writes
- **Medium risk** (verify when uncertain): Network requests (`curl`, `wget`, `fetch`), file writes, database modifications, subprocess spawning, dynamic code evaluation
- **Low risk** (skip verification): Simple text responses, math, reading public information, code that doesn't touch the filesystem or network

## Tool: moltblock

Verify a task before execution.

### Usage

```bash
npx moltblock@latest "<task description>" --provider <provider> --json
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| task | Yes | The task description to verify |
| --provider | No | LLM provider: openai, google, zai, local (auto-detected from env) |
| --model | No | Model override |
| --test | No | Path to test file (for code verification) |
| --json | No | Output structured JSON result |

### Environment Variables

No API key is required — moltblock falls back to a local LLM (localhost:1234) if no key is set. To use a cloud provider, set **one** of these:
- `OPENAI_API_KEY` — OpenAI
- `ANTHROPIC_API_KEY` — Anthropic/Claude
- `GOOGLE_API_KEY` — Google/Gemini
- `ZAI_API_KEY` — ZAI

### Example

```bash
# Verify a task
npx moltblock@latest "implement a function that validates email addresses" --json

# Verify code with tests
npx moltblock@latest "implement a markdown-to-html converter" --test ./tests/markdown.test.ts --json
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
npx moltblock@latest "your task" --json
```

Or install globally:

```bash
npm install -g moltblock@latest
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
- License: Apache-2.0

## Disclaimer

Moltblock reduces risk but does not eliminate it. Verification is best-effort — policy rules and LLM-based checks can miss dangerous patterns. Always review generated artifacts before executing them. The authors and contributors are not responsible for any damage, data loss, or security incidents resulting from the use of this tool. Use at your own risk.
