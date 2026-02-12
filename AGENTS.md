# AGENTS.md

Agent-specific instructions for working with the moltblock codebase.

## Build, Test, and Development Commands

- Runtime baseline: Node **18+**.
- Install deps: `npm install`
- Type-check/build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm test` (vitest); coverage: `npm run test:coverage`
- Run CLI in dev: `npx moltblock "Your task" --test path/to/test.ts`

## Project Structure & Module Organization

- Source code: `src/` (CLI in `src/cli.ts`, entity orchestration in `src/entity.ts`, agents in `src/agents.ts`).
- Tests: `tests/*.test.ts` (match source names).
- Config: `config/` (agent graph definitions like `code_entity_graph.json`).
- Docs: `docs/` (manifesto, protocol spec, architecture docs). Built output lives in `dist/`.
- Key module groups:
  - **Core loop**: `entity.ts`, `agents.ts`, `graph-runner.ts`, `verifier.ts`
  - **Persistence**: `persistence.ts` (SQLite), `memory.ts` (working memory)
  - **LLM integration**: `gateway.ts`, `config.ts`
  - **Governance**: `governance.ts`, `signing.ts`, `handoff.ts`
  - **Improvement**: `improvement.ts` (outcome tracking, strategy critique)
- When adding new agent roles or graph node types, update both the graph schema and agents module.

## Coding Style & Naming Conventions

- Language: TypeScript (ESM). Prefer strict typing; avoid `any`.
- Run `npm run lint` before commits.
- Add brief code comments for tricky or non-obvious logic.
- Keep files concise; extract helpers instead of "V2" copies.
- Aim to keep files under ~500 LOC; guideline only (not a hard guardrail). Split/refactor when it improves clarity or testability.
- Naming: use **MoltBlock** for product/app/docs headings; use `moltblock` for CLI command, package/binary, paths, and config keys.

## Testing Guidelines

- Framework: Vitest with V8 coverage.
- Naming: match source names with `*.test.ts`.
- Run `npm test` before pushing when you touch logic.

## Release Channels (Naming)

- stable: tagged releases only (e.g. `vYYYY.M.D`), npm dist-tag `latest`.
- beta: prerelease tags `vYYYY.M.D-beta.N`, npm dist-tag `beta`.
- dev: moving head on `main` (no tag; git checkout main).

## Commit & Pull Request Guidelines

- Follow concise, action-oriented commit messages (e.g., `entity: add retry logic`, `verifier: fix timeout handling`).
- Group related changes; avoid bundling unrelated refactors.
- Changelog workflow: keep latest released version at top (no `Unreleased`); after publishing, bump version and start a new top section.
- PRs should summarize scope, note testing performed, and mention any user-facing changes or new flags.
- PR review flow: when given a PR link, review via `gh pr view`/`gh pr diff` and do **not** change branches.
- PR review calls: prefer a single `gh pr view --json ...` to batch metadata/comments; run `gh pr diff` only when needed.
- Before starting a review when a GH Issue/PR is pasted: run `git pull`; if there are local changes or unpushed commits, stop and alert the user before reviewing.
- Goal: merge PRs. Prefer **rebase** when commits are clean; **squash** when history is messy.
- PR merge flow: create a temp branch from `main`, merge the PR branch into it (prefer squash unless commit history is important; use rebase/merge when it is). If we squash, add the PR author as a co-contributor. Apply fixes, add changelog entry (include PR # + thanks), run full gate before the final commit (`npm run build && npm run lint && npm test`), commit, merge back to `main`, delete the temp branch, and end on `main`.
- If you review a PR and later do work on it, land via merge/squash (no direct-main commits) and always add the PR author as a co-contributor.
- When working on a PR: add a changelog entry with the PR number and thank the contributor.
- When working on an issue: reference the issue in the changelog entry.
- When merging a PR: leave a PR comment that explains exactly what we did and include the SHA hashes.

## Shorthand Commands

- `sync`: if working tree is dirty, commit all changes (pick a sensible Conventional Commit message), then `git pull --rebase`; if rebase conflicts and cannot resolve, stop; otherwise `git push`.

### PR Workflow (Review vs Land)

- **Review mode (PR link only):** read `gh pr view/diff`; **do not** switch branches; **do not** change code.
- **Landing mode:** create an integration branch from `main`, bring in PR commits (**prefer rebase** for linear history; **merge allowed** when complexity/conflicts make it safer), apply fixes, add changelog (+ thanks + PR #), run full gate **locally before committing** (`npm run build && npm run lint && npm test`), commit, merge back to `main`, then `git switch main` (never stay on a topic branch after landing). Important: contributor needs to be in git graph after this!

## Security

- Zero-trust: API keys from env only, never hardcoded.
- Secrets via environment variables: `ZAI_API_KEY`, `MOLTBLOCK_SIGNING_KEY`.
- Use Zod for runtime validation of external input.
- Never commit real API keys or secrets. Use obviously fake placeholders in docs, tests, and examples.

## Agent-Specific Notes

- Never edit `node_modules` (global/npm/git installs too). Updates overwrite. Skill notes go in `AGENTS.md`.
- When working on a GitHub Issue or PR, print the full URL at the end of the task.
- When answering questions, respond with high-confidence answers only: verify in code; do not guess.
- Version location: `package.json` (version field).
- **Multi-agent safety:** do **not** create/apply/drop `git stash` entries unless explicitly requested (this includes `git pull --rebase --autostash`). Assume other agents may be working; keep unrelated WIP untouched and avoid cross-cutting state changes.
- **Multi-agent safety:** when the user says "push", you may `git pull --rebase` to integrate latest changes (never discard other agents' work). When the user says "commit", scope to your changes only. When the user says "commit all", commit everything in grouped chunks.
- **Multi-agent safety:** do **not** create/remove/modify `git worktree` checkouts (or edit `.worktrees/*`) unless explicitly requested.
- **Multi-agent safety:** do **not** switch branches / check out a different branch unless explicitly requested.
- **Multi-agent safety:** running multiple agents is OK as long as each agent has its own session.
- **Multi-agent safety:** when you see unrecognized files, keep going; focus on your changes and commit only those.
- **Multi-agent safety:** focus reports on your edits; avoid guard-rail disclaimers unless truly blocked; when multiple agents touch the same file, continue if safe; end with a brief "other files present" note only if relevant.
- Lint/format churn:
  - If staged+unstaged diffs are formatting-only, auto-resolve without asking.
  - If commit/push already requested, auto-stage and include formatting-only follow-ups in the same commit (or a tiny follow-up commit if needed), no extra confirmation.
  - Only ask when changes are semantic (logic/data/behavior).
- Bug investigations: read source code of relevant npm dependencies and all related local code before concluding; aim for high-confidence root cause.
- Code style: add brief comments for tricky logic; keep files under ~500 LOC when feasible (split/refactor as needed).
