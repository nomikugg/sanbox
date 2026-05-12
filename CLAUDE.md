# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RunJS Pro** — a Tauri 2 desktop app for secure JavaScript/TypeScript execution. Users write code in a Monaco editor; the Rust backend validates, transpiles (via SWC), and runs it in an isolated subprocess (Deno or Node.js) with configurable security limits.

## Commands

All commands run from the repo root (`D:\sandbox2`).

```bash
# Install dependencies (run once or after pulling)
npm install && npm --prefix frontend install

# Frontend dev server only (localhost:1420)
npm run dev

# Full desktop app (Tauri + frontend)
npm run tauri:dev

# Build frontend for production
npm run build

# Build distributable desktop app
npm run tauri:build
```

The Tauri config is at `backend/tauri.conf.json` — all `tauri` scripts already pass `--config backend/tauri.conf.json`. No test suite is configured yet.

## Architecture

### Data Flow

```
Monaco Editor → useIpc hook → Tauri IPC bridge → Rust backend
                                                      │
                                       ┌──────────────▼──────────────┐
                                       │ execute_code command         │
                                       │  1. Validate (regex)         │
                                       │  2. Transpile (SWC)          │
                                       │  3. RuntimeManager           │
                                       │  4. Spawn deno/node process  │
                                       │  5. Monitor (memory/timeout) │
                                       │  6. Return ExecutionResponse │
                                       └─────────────────────────────┘
```

### Frontend (`frontend/src/`)

- **State:** Single `useReducer` in `App.jsx` with 25+ action types; shape defined in `state/appState.js`. Zustand stores in `store/` cover isolated concerns (tabs, settings, theme, UI).
- **IPC:** `hooks/useIpc.js` wraps all `@tauri-apps/api/core` `invoke()` calls.
- **Editor:** `components/CodeEditor.jsx` wraps Monaco; `lib/liveEvaluator.js` provides real-time in-editor results without a full execution round-trip.
- **Path alias:** `@/` → `frontend/src/` (configured in `jsconfig.json` and `vite.config.js`).

### Backend (`backend/src/`)

**4 Tauri commands** (registered in `main.rs`, implemented in `ipc/commands.rs`):

| Command | Purpose |
|---|---|
| `execute_code` | Full validate → transpile → run pipeline |
| `transpile_code` | SWC transpile only (preview use) |
| `debug_code` | CDP scaffold (mock, not yet wired) |
| `stop_execution` | Cancel in-flight execution by ID |

**Key modules:**
- `runner/runtime_manager.rs` — routes to `deno_runner.rs` or `node_runner.rs`; applies `SecurityLimits`
- `runner/process_isolation.rs` — spawns subprocess, monitors memory/timeout on a separate thread, captures stdout/stderr
- `security/validator.rs` — regex-based pre-execution code scan
- `security/permissions.rs` — `PermissionPolicy` (filesystem, network, environment, child_process flags)
- `security/limits.rs` — three modes: Strict (5 s/128 MB), Balanced (8 s/256 MB), Debug (20 s/512 MB)
- `utils/transpiler.rs` — SWC pipeline for JS/TS/JSX/TSX

### Security Model

Strict and Balanced modes block `eval`, `Function`, dynamic `import`, `fetch`, `WebSocket`, `process.env`, `Deno.env`, `child_process`, and all filesystem/network APIs via regex + `PermissionPolicy`. Debug mode lifts the eval/Function restriction.

## Key Conventions

- Tauri config is at `backend/tauri.conf.json`, **not** `src-tauri/tauri.conf.json`.
- Frontend dev port is fixed at **1420** — Tauri's `devUrl` is hardcoded to it.
- Runtimes spawn as `deno eval` and `node --experimental-permission --eval`; Bun is stubbed (unsupported).
- Execution history is capped at 25 entries in the reducer.
- The WASM sandbox (`runner/wasm_sandbox.rs`) requires `--features wasm-engine` and is off by default.

---

## Response Format

For every task provide:

1. ANALYSIS
2. ROOT CAUSE
3. FIX
4. IMPROVED VERSION
5. ARCHITECTURE NOTES
6. PERFORMANCE NOTES
7. NEXT STEP

---

## Code Rules

- Use TypeScript
- Avoid global state abuse
- Avoid tightly coupled components
- Prefer feature-based architecture
- Prefer reusable abstractions
- Prefer async-safe logic

---

## Debugging Rules

When debugging, inspect: imports, rendering, state flow, async flow, memory usage, architecture, event systems.