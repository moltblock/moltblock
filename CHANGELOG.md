# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.11.9] - 2026-06-10

### Security
- Fixed `tmp` path traversal advisory ([GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65)) by bumping `tmp` to 0.2.7 (floor raised to ^0.2.6)

### Changed
- Bumped dependencies: openai 6.42.0, zod 4.4.3, better-sqlite3 12.10.0, dotenv 17.4.2, @types/node 25.9.2, vitest + @vitest/coverage-v8 4.1.8, typescript 6.0.3
- Bumped CI actions: actions/checkout v6.0.3, actions/setup-node v6.4.0

### Fixed
- Pinned actions/checkout to the immutable v6.0.3 release tag SHA (was the floating v6 tag tip)

## [0.11.8] - 2026-03-18

### Fixed
- Keep config-as-optional and API key scope improvements from v0.11.7

## [0.11.7] - 2026-03-18

### Fixed
- Skill metadata: moved config paths from required to optional to match documentation
- Replaced "no code execution" claim with accurate description of skill vs CLI surfaces
- Added transparency about npm install behavior (no postinstall scripts, prebuilt binaries)
- Added API key scope recommendation in security section
- Added ClaWHub publishing to release workflow

## [0.11.6] - 2026-03-18

### Fixed
- Sanitize CLI error output to redact API keys and URLs
- Remove weak deterministic signing fallback; require explicit key material
- Fix path traversal edge case in config path validation using path.relative
- Pin release workflow actions to SHA and npm to specific version
- Update SECURITY.md supported version to 0.11.x

## [0.11.5] - 2026-03-18

### Changed
- Bumped dependencies: openai 6.29.0, @types/node 25.5.0, vitest 4.1.0, @vitest/coverage-v8 4.1.0
- Updated actions/setup-node from v4 to v6 in CI (Node.js 24 runner support)
- Fixed repository URL format for npm provenance validation

### Added
- npm trusted publishing workflow via GitHub Actions OIDC (no token needed)

## [0.11.0] - 2026-02-12

### Changed
- CI now enforces 70% coverage threshold via `npm run test:coverage`
- Stricter tsconfig: `noUnusedLocals` and `noUnusedParameters` enabled
- Config parse errors now logged with `console.warn` instead of silently ignored

### Fixed
- CONTRIBUTING.md: Node.js version corrected from 18+ to 22+
- readme.md: Roadmap updated with v0.8–v0.11 entries

## [0.10.1] - 2026-02-12

### Changed
- SQLite uses WAL journal mode for better concurrency
- `setStrategy` wrapped in transaction to prevent TOCTOU race on version increment
- `triggerMolt` wrapped in transaction for atomic checkpoint + governance + audit
- PolicyVerifier pre-compiles all regexes in constructor (performance)
- Signing fallback requires `MOLTBLOCK_INSECURE_DEV_SIGNING=1` env var (security)
- Error messages in gateway only show hostname, not full URL (security)

## [0.10.0] - 2026-02-12

### Added
- Test helpers: `MockLLMGateway`, `FailingGateway`, `createTestStore`, shared fixtures
- Tests for `agents.ts`: runGenerator, runCritic, runJudge, runRole (~16 tests)
- Tests for `handoff.ts`: sendArtifact, receiveArtifacts, round-trip (~8 tests)
- Integration test: full pipeline simulation with store (~5 tests)

## [0.9.0] - 2026-02-12

### Added
- Gateway: configurable `timeoutMs` and `maxRetries` on `ModelBinding` (SDK-native)
- Graph-runner: `continueOnError` option for partial results on node failure
- Entity: degraded fallback (critic/judge failure continues with available data)
- Store: `Symbol.dispose` for explicit resource cleanup
- Error message sanitization: only hostname shown, key-like strings redacted
- Tests for retry/timeout, graph-runner execution, entity error fallback (~25 tests)

## [0.8.0] - 2026-02-12

### Added
- `--version` / `-V` CLI flag
- Error handling in LLM gateway with descriptive error messages
- Error handling in improvement loop (runEval treats thrown errors as failures)
- `homepage` and `bugs` fields in package.json
- CHANGELOG.md
- Tests for governance, improvement, memory, gateway, and version modules (96 new tests)

### Fixed
- VERSION constant synced to package.json (was stuck at 0.6.0)
- License corrected from Apache-2.0 to MIT in package.json and skill/SKILL.md

## [0.7.8] - 2025-05-17

### Fixed
- Skill display name for clawhub publishing

## [0.7.7] - 2025-05-17

### Fixed
- Skill display name for clawhub

## [0.7.6] - 2025-05-16

### Fixed
- Inaccurate trust boundary claims in skill documentation
- Pinned version references in skill

## [0.7.5] - 2025-05-16

### Changed
- Skill.md improvements for clawhub publishing

## [0.7.4] - 2025-05-16

### Fixed
- Removed `requires.env` and `openclaw.json` auto-read from skill metadata

## [0.7.3] - 2025-05-16

### Fixed
- Aligned skill frontmatter with clawhub skill-format spec

## [0.7.2] - 2025-05-15

### Fixed
- Removed required env from skill metadata
- Clarified API keys are optional

### Added
- Source links in skill documentation

## [0.7.1] - 2025-05-15

### Fixed
- Skill env requirements (made optional)
- Clarified config is optional

## [0.7.0] - 2025-05-14

### Changed
- Renamed `MOLTBLOCK_ZAI_API_KEY` to `ZAI_API_KEY`
- Added clawhub metadata to skill

### Added
- Anthropic provider support

## [0.6.3] - 2025-05-14

### Fixed
- Added full display name to skill frontmatter

## [0.6.2] - 2025-05-13

### Fixed
- Skill.md clawhub frontmatter to match spec

## [0.6.1] - 2025-05-13

### Added
- Clawhub frontmatter and disclaimer to skill.md

## [0.6.0] - 2025-05-12

### Added
- Pluggable verification interface (`Verifier`, `VerificationResult`)
- Policy verifier with built-in deny rules
- Code verifier adapter (wraps vitest verifier)
- Composite verifier (chains multiple verifiers)
- Generic `Entity` class with pluggable verifier and domain
- Domain prompt registry ("code" + "general" domains)
- Risk classification (`classifyRisk()`)

## [0.5.0] - 2025-05-10

### Added
- OpenClaw config fallback
- Provider auto-detection from environment variables

## [0.4.0] - 2025-05-08

### Changed
- Security hardening and dependency upgrades

### Added
- CI, release, npm, and license badges to readme
