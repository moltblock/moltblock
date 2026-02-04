# Security Policy

## Supported versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a vulnerability

**Please do not report security vulnerabilities in public issues.**

If you believe you have found a security issue in Moltblock (including the framework, signing/verification, governance, or integration surfaces):

1. **Preferred:** Open a [private security advisory](https://github.com/moltblock/moltblock/security/advisories/new) on GitHub. This keeps the report confidential and allows coordinated disclosure.
2. **Alternatively:** Email the maintainers with details. If you need a contact address, open a public issue asking for a secure contact method and we will respond privately where appropriate.

Include:
- A short description of the issue and impact
- Steps to reproduce (or a proof of concept)
- Any suggested fix, if you have one

We will acknowledge receipt as soon as possible and aim to respond with an initial assessment within a few business days. We may ask for more detail or suggest a fix before public disclosure.

## Security-related practices

- **Secrets:** Never commit API keys, tokens, or `.env` files. Use `.env` locally (see [.env.example](.env.example)) and keep it out of version control.
- **Integrations:** When using Moltblock with OpenClaw or other systems, follow their security guidance as well. Moltblock’s verification and governance layers are designed to reduce risk from generated code and untrusted input; see [OpenClaw integration](docs/openclaw_integration.md#how-moltblock-helps-openclaw-security).

Thank you for helping keep Moltblock and its users safe.
