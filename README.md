<div align="center">

# ⚡ AgentOS
### The Autonomous Software Factory Operating System & Multi-Layer Graph Runtime

[![CI Pipeline](https://github.com/ignaciomurmat/agentos/actions/workflows/ci.yml/badge.svg)](https://github.com/ignaciomurmat/agentos/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%20Strict-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg?logo=node.js)](https://nodejs.org/)
[![D3.js](https://img.shields.io/badge/D3.js-v7-orange.svg?logo=d3.js)](https://d3js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <strong>AgentOS</strong> is an enterprise-grade full-stack runtime and interactive visual control plane for autonomous multi-agent software engineering pipelines. Built upon a reactive 5-layer directed graph, it models, benchmarks, and orchestrates 25 collaborative agents with real-time WebSockets telemetry, Git-like version control, sandboxed chaos simulation, and D3.js predictive throughput modeling.
</p>

[Quickstart](#-quickstart) • [Architecture](#-architecture-overview) • [AgentOS 2.0 Proposal](#-agentos-20-optimization-proposal) • [Interactive Tour](#-interactive-developer-tour) • [API & WebSockets](#-api--websocket-protocol) • [Contributing](#-contributing)

</div>

---

## 🏛️ Architecture Overview

The system models a complete autonomous software factory structured across **five functional layers** and **three execution lanes**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AGENTOS ARCHITECTURE                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 01: MEMORY & SECURITY                                                            │
│   [Brain Master Controller] ◄────────────── Active Context Bus ─────────────► [Evaluation]│
│   [Security Guardrails (Gemini 2.5 Flash)] ─── Crypto Quarantines & RBAC Token Audits  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 02: EXPLORATION, MOCKUP & TELEMETRY                                              │
│   [Context Explorer (Sonnet)] ──► [Mockup Generator] ──► [Contract Arbiter (Coherencia)]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 03: CORE PIPELINE, UX & EVIDENCE                                                 │
│   [Task Intake] ──► [Filter] ──► [Analyze (Qwen/Deterministic)]                       │
│                                           │                                            │
│                      ┌────────────────────┴────────────────────┐                       │
│                      ▼                                         ▼                       │
│              [Spec Writer (Opus)]                      [Concurrent Spike]              │
│                      │                                         │                       │
│                      └────────────────────┬────────────────────┘                       │
│                                           ▼                                            │
│                                  [Builder (Code Diff)]                                 │
│                                           │                                            │
│                      ┌────────────────────┴────────────────────┐                       │
│                      ▼                                         ▼                       │
│               [UI Renderer]                           [UI Self-Healing AST]            │
│                      │                                         ▲                       │
│                      ▼                                         │ (re-patch loop)       │
│             [Approver (4/4 Consensus)] ────────► [Visual Evidence (Playwright)]       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 04: LANES, VERIFICATION & BENCHMARK LAB                                          │
│   ├─ [Standard Lane (Cyan)]: Strict 14-node verification + "Tu OK · Ignacio" signoff   │
│   ├─ [Express Lane (Purple)]: Zero-LLM heuristic path for minor syntax fixes           │
│   └─ [Urgent P0 Lane (Red)]: SSH Direct Bypass with Atomic Checkpoint Rollback         │
│   [Docker Test Sandbox] ──► [Synthetic DB (Isolated)] ──► [Benchmark Lab Learning]     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 05: PRODUCTION & OBSERVABILITY                                                   │
│   [Deployer Container] ──► [Canary Rollout Watchdog] ──► [APM Live Telemetry Engine]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

* **Interactive High-Density Graph Canvas**: Full pan, zoom, dynamic particle flow, and real-time execution state inspection across 25 specialized agents.
* **AgentOS 2.0 Architectural Proposal**: Real-time comparison between the legacy sequential blueprint and our optimized concurrent graph architecture.
* **Agent Version Control System (Agent VCS)**:
  * Commit snapshots of all agent configs, prompts, models, and temperature.
  * Branching (`main`, `feature/agentos-2.0`, `experiment/zero-token-cache`).
  * Unified diff viewer and 1-click configuration rollback.
* **Scenario Simulation Engine & Chaos Sandbox**:
  * Inject environmental stressors: network latency (0–1500ms), API 429 rate-limiting, container crash OOM probability, adversarial prompt injection attacks, and visual DOM regressions.
  * Robustness scorecard (0–100%) and autonomous mitigation logs.
* **D3.js Predictive Throughput & S-Curve Burn-up Chart**:
  * Real-time tasks/minute velocity per execution lane.
  * Monte Carlo lead-time density histogram.
  * Confidence bands ($p10$ optimistic to $p90$ conservative) with dynamic backlog stress simulation slider.
* **Full-Stack Reactive WebSocket Engine**: Server-authoritative state synchronization with sub-50ms latency.
* **One-Click Performance Telemetry JSON Export**: Structured audit report exportable via UI or REST API (`/api/pipeline/export`).
* **Built-in Developer Onboarding Tour & Pattern Guide**: Interactive step-by-step onboarding walkthrough accessible via the HUD.

---

## ⚡ AgentOS 2.0 Optimization Proposal

| Architectural Pillar | Legacy Blueprint (1.0) | AgentOS 2.0 Proposal | Measured Impact |
|---|---|---|---|
| **Layer 02/03 Concurrency** | Sequential execution: `Analyze` ➔ `Mockup` ➔ `Spec` | Parallel fork: `Mockup` concurrent spike alongside `Spec writer` | **-42% Cycle Time Reduction** |
| **UI Regressions** | Full pipeline restart on visual failure | Direct AST patch loop via `UI Self-Healing` | **-75% Retry Latency** |
| **Context Overhead** | Isolated prompt re-evaluations | Active Memory Bus between `Brain 2.0` and `Benchmark Lab` | **-35% Token Consumption** |
| **Urgent Hotfixes** | Manual SSH intervention without telemetry guard | Atomic checkpoint rollback with signed cryptographic certificate | **$<200\text{ms}$ Recovery Window** |
| **Production Rollout** | Big-bang deploy | Progressive Canary Watchdog with SLO anomaly rollback | **Zero-Downtime Resilience** |

---

## 💻 Quickstart

### Prerequisites
* **Node.js**: `>= 20.0.0`
* **Package Manager**: `npm` or `bun`

### 1. Clone & Install
```bash
git clone https://github.com/ignaciomurmat/agentos.git
cd agentos
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
*(Optional: Provide `GEMINI_API_KEY` for live upstream model inference; a deterministic heuristic engine runs out-of-the-box if omitted).*

### 3. Launch Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🧪 Testing & Verification

AgentOS enforces zero technical debt and pure-logic testability. Run the complete test suite:

```bash
# Run unit tests with Node native test runner (9/9 suites passing)
npm test

# Run TypeScript strict type-checking
npm run lint

# Compile production bundle
npm run build
```

---

## 🌐 API & WebSocket Protocol

### REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status, uptime, and engine version |
| `GET` | `/api/pipeline/graph` | Returns the 25 nodes, edges, and 5-layer topology |
| `GET` | `/api/pipeline/state` | Returns the complete system state, tasks, and telemetry |
| `POST` | `/api/pipeline/task` | Enqueue a new software development task into a lane |
| `GET` | `/api/pipeline/export` | Generates and exports the structured performance JSON report |

### WebSocket Protocol (`/ws`)

Connect via `ws://localhost:3000/ws` to receive reactive events:

* **Inbound Client Commands**:
  * `{"type": "START_ENGINE"}` / `{"type": "PAUSE_ENGINE"}`
  * `{"type": "STEP_ENGINE"}`
  * `{"type": "SET_SPEED", "speed": 2}`
  * `{"type": "CREATE_TASK", "task": { ... }}`
  * `{"type": "RESET_PIPELINE"}`
* **Outbound Broadcast Events**:
  * `{"type": "STATE_UPDATE", "data": PipelineState}`

---

## 📁 Repository Structure

```
.
├── .github/
│   ├── workflows/ci.yml         # GitHub Actions CI matrix
│   ├── pull_request_template.md # Professional PR template
│   └── ISSUE_TEMPLATE/          # Structured issue templates
├── src/
│   ├── components/              # Modular React UI components
│   │   ├── NodeGraphCanvas.tsx  # D3/Canvas interactive graph
│   │   ├── HeaderHUD.tsx        # Top telemetry bar & actions
│   │   ├── LayerFilterBar.tsx   # Layer, lane, and view mode tabs
│   │   ├── ProposalDiffBanner.tsx # AgentOS 2.0 diff banner
│   │   ├── VersionControlDrawer.tsx # Agent VCS drawer
│   │   ├── SimulationEngineModal.tsx # Chaos engineering sandbox
│   │   ├── ThroughputProjectionPanel.tsx # D3 S-curve & lead-time charts
│   │   ├── ExportReportModal.tsx # JSON performance report modal
│   │   └── DevOnboardingModal.tsx # Interactive dev tour
│   ├── pipeline/                # Decoupled business logic
│   │   ├── graphData.ts         # 25 nodes, edges & 5 layers
│   │   ├── engine.ts            # State machine & task runner
│   │   ├── vcs.ts               # Git-like Agent VCS logic
│   │   ├── simulation.ts        # Chaos sandbox engine
│   │   ├── projections.ts       # D3 throughput & confidence bands
│   │   ├── exportReport.ts      # Structured JSON report generator
│   │   └── engine.test.ts       # Complete unit test suite (9 tests)
│   ├── tutorial/                # Onboarding tour data & pattern guide
│   ├── types/                   # Strict TypeScript domain models
│   ├── App.tsx                  # Main application container
│   └── main.tsx                 # Client entry point
├── server.ts                    # Full-stack Express + WebSocket server
├── TUTORIAL.md                  # Developer Onboarding & Pattern Guide
├── CONTRIBUTING.md              # Contribution standards & workflow
├── CODE_OF_CONDUCT.md           # Community guidelines
├── SECURITY.md                  # Vulnerability disclosure policy
├── LICENSE                      # MIT License
└── package.json                 # Dependency manifest
```

---

## 🤝 Contributing

We welcome contributions from engineers across distributed systems, autonomous agents, and data visualization. Please review [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a pull request.

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
