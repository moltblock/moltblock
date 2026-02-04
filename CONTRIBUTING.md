# Contributing to Moltblock

Thanks for your interest in contributing. This document explains how to get set up, run tests, and submit changes.

## Code of conduct

By participating in this project, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

- **Python:** 3.10 or newer.
- **Clone and install (editable):**

  ```bash
  git clone https://github.com/moltblock/moltblock.git
  cd moltblock
  pip install -e ".[dev]"
  ```

- **Optional (for full Code Entity loop):** Local LLM (e.g. LM Studio) and/or Z.ai API key. See [readme](readme.md#run-code-entity-mvp) and [.env.example](.env.example). Tests do **not** require an LLM.

## Running tests

From the repo root:

```bash
pytest tests -v
```

Add new tests in `tests/` and keep them passing. CI runs the same command on push and pull requests.

## Code style

- We use [Ruff](https://docs.astral.sh/ruff/) for linting and formatting (see [pyproject.toml](pyproject.toml): line length 100, target Python 3.10).
- Before submitting, run:

  ```bash
  ruff check src tests
  ruff format src tests
  ```

## How to contribute

### Reporting bugs or suggesting features

- **Issues:** Open an [issue](https://github.com/moltblock/moltblock/issues) with a clear title and description. For bugs, include steps to reproduce and your environment (OS, Python version) when relevant.

### Submitting changes

1. **Fork** the repo and create a branch from `main` (e.g. `fix/thing` or `docs/readme`).
2. **Make your changes:** Keep commits focused; message style is up to you (e.g. `fix: ...`, `docs: ...`, `feat: ...`).
3. **Run tests and Ruff:**  
   `pytest tests -v` and `ruff check src tests && ruff format src tests`.
4. **Push** your branch and open a **pull request** against `main`.
5. **Describe** what the PR does and how to review it. Link any related issues.

Maintainers will review and may ask for tweaks. Once approved, your PR can be merged.

## Docs and specs

- Docs live in [docs/](docs/). For protocol or architecture changes, consider updating the relevant spec (e.g. [MVP Entity Spec](docs/mvp_entity_spec.md), [Protocol v0.1](docs/moltblock_protocol_v_0.md)).
- Keep the [readme](readme.md) in sync with install, run, and config instructions.

## Security

For security-sensitive issues, see [SECURITY.md](SECURITY.md). Do not report vulnerabilities in public issues.

---

Thank you for helping make Moltblock better.
