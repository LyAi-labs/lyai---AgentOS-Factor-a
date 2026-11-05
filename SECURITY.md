# Security Policy

## Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.4.x   | :white_check_mark: |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

---

## Reporting a Vulnerability

The AgentOS team takes system security, prompt injection defenses, and agent quarantine isolation seriously. If you discover a vulnerability, please follow responsible disclosure:

1. **Do not open a public issue on GitHub.**
2. Email your findings with a detailed Proof of Concept (PoC) to `security@agentos.internal`.
3. Include the following details:
   - Affected agent node(s) or API endpoints.
   - Attack vector (e.g. prompt injection, privilege escalation in SSH bypass, WebSocket hijacking).
   - Steps to reproduce.
   - Potential impact on the multi-agent factory.

### Response Time
* **Initial response**: Within 24 hours.
* **Triage & severity assessment**: Within 48 hours.
* **Patch release**: Critical vulnerabilities are resolved within 7 business days.

---

## Guardrails & Sandbox Isolation Architecture

AgentOS enforces defense-in-depth:
* **Cryptographic Token Quarantine**: Payloads containing adversarial prompt injection tokens (`IGNORE ALL PREVIOUS INSTRUCTIONS`, shell injection, or credential exfiltration attempts) are isolated at Layer 01 before reaching downstream model builders.
* **Isolated Synthetic Databases**: Automated test suites at Layer 04 run exclusively against mock/isolated schemas and never interact with production databases.
* **SSH Direct Bypass Guardrail**: The Urgent P0 lane requires signed cryptographic tokens and captures an atomic snapshot before applying hotfixes to prevent orphaned state drifts.
