# Contributing to AgentOS

Thank you for your interest in contributing to **AgentOS**! We maintain enterprise-grade software standards to ensure exceptional performance, strict type safety, zero technical debt, and deterministic predictability.

Please read this guide before submitting issues or pull requests.

---

## 🛠️ Development Setup

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/<your-username>/agentos.git
   cd agentos
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run the Development Server**:
   ```bash
   npm run dev
   ```

4. **Verify Verification Checks**:
   ```bash
   npm test          # Must pass 100% of unit tests
   npm run lint      # Must complete with 0 TypeScript errors
   npm run build     # Must compile cleanly
   ```

---

## 🌿 Git Branching & Workflow

We follow the standard GitHub Flow:
* `main`: Production-ready branch. All merged code must pass CI.
* Feature branches: `feat/<feature-name>`
* Bug fixes: `fix/<bug-name>`
* Performance & Refactoring: `perf/<optimization-name>` or `refactor/<target>`
* Documentation & Guides: `docs/<topic>`

---

## 📝 Commit Conventions

We strictly enforce **Conventional Commits**:

```
<type>(<scope>): <short description in imperative mood>

[optional body explaining rationale]

[optional footer with issue references]
```

### Allowed Types:
* `feat`: A new user-facing feature or agent capability.
* `fix`: A bug fix or state machine correction.
* `perf`: Code changes that improve latency, throughput, or token utilization.
* `refactor`: Code changes that neither fix bugs nor add features.
* `test`: Adding missing tests or correcting existing tests.
* `docs`: Documentation only changes (e.g. `README.md`, `TUTORIAL.md`).
* `chore`: Build process, dependencies, or auxiliary tool changes.

### Examples:
* `feat(vcs): add 1-click snapshot rollback for agent configurations`
* `fix(engine): resolve cycle time calculation on bypassed nodes`
* `perf(d3): memoize S-curve confidence interval projection points`

---

## 🏛️ Code Standards & Architectural Rules

1. **Strict TypeScript**:
   * No `any` types. Use explicit domain models defined in `src/types/pipeline.ts`.
   * Keep compiler options in strict mode.
2. **Pure Logic Decoupling**:
   * Mathematical calculations, routing algorithms, and simulations must reside in pure functions under `src/pipeline/` (not embedded inside UI components).
   * Every new pure logic module **must** have corresponding unit tests in `src/pipeline/engine.test.ts`.
3. **Frontend Design Constitution**:
   * Tailwind CSS utility styling only.
   * Zero-pill discipline: Use purposeful rectangular geometries with rounded corners (`rounded-xl`, `rounded-md`), subtle borders (`border-slate-800`), and dark cyber aesthetic (`#070b14`).
   * Monospace typography (`font-mono`) for metrics, IDs, hashes, and code blocks.
4. **Defensive Error Handling**:
   * Always validate incoming WebSocket payloads.
   * Provide graceful fallbacks when LLM API keys are not supplied.

---

## 📋 Pull Request Checklist

Before submitting your pull request, verify:
- [ ] Code compiles without warnings (`npm run lint`).
- [ ] All unit tests pass (`npm test`).
- [ ] Production build succeeds (`npm run build`).
- [ ] Changes are covered by automated unit tests where applicable.
- [ ] Commit history is clean and follows Conventional Commits.
- [ ] PR title is descriptive and references linked issues.
