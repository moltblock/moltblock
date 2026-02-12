# moltblock — Trust Layer for AI Agents

## Description

Moltblock provides verification gating for AI-generated artifacts. Before any high-risk action (file deletion, credential access, system modification, network exfiltration), the `moltblock_verify` tool runs policy checks and optional code verification to catch dangerous patterns.

## When to Use

Use `moltblock_verify` when the task involves:

- **High risk** (always verify): Destructive operations (`rm -rf`, `DROP TABLE`), privilege escalation (`sudo`, `chmod 777`), credential/key access (`.ssh/`, `id_rsa`, `.env`), system modification, raw disk writes
- **Medium risk** (verify when uncertain): Network requests (`curl`, `wget`, `fetch`), file writes, database modifications, subprocess spawning, dynamic code evaluation
- **Low risk** (skip verification): Simple text responses, math, reading public information, code that doesn't touch the filesystem or network

## Tool: moltblock_verify

Verify a task before execution.

### Usage

```bash
npx moltblock "<task description>" --provider <provider> --json
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

Set one of these for provider auto-detection:
- `OPENAI_API_KEY` — OpenAI
- `GOOGLE_API_KEY` — Google/Gemini
- `MOLTBLOCK_ZAI_API_KEY` — ZAI

### Example

```bash
# Verify a task
npx moltblock "implement a function that validates email addresses" --json

# Verify code with tests
npx moltblock "implement a markdown-to-html converter" --test ./tests/markdown.test.ts --json
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

```bash
npm install -g moltblock
```

Or use directly with npx (no install needed):

```bash
npx moltblock "your task" --json
```

## Configuration

Optional. Place `moltblock.json` in your project root or `~/.moltblock/moltblock.json`:

```json
{
  "agent": {
    "bindings": {
      "generator": { "backend": "google", "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/", "model": "gemini-2.0-flash" },
      "critic": { "backend": "google", "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/", "model": "gemini-2.0-flash" },
      "judge": { "backend": "google", "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/", "model": "gemini-2.0-flash" }
    }
  },
  "policy": {
    "rules": [
      {
        "id": "custom-allow-tmp",
        "description": "Allow operations in /tmp",
        "target": "artifact",
        "pattern": "\\/tmp\\/",
        "action": "allow",
        "category": "destructive-cmd",
        "enabled": true
      }
    ]
  }
}
```
