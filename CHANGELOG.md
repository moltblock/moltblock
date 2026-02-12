# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
