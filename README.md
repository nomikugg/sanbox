# RunJS Pro

A security-first desktop JavaScript execution environment built with Rust, Tauri, React, and Vite.

## Features

- Multi-runtime execution: Deno, Node.js, and Bun-ready extension points
- Strict security layer with validation, resource limits, and process isolation
- CDP debugger scaffold for breakpoint-driven inspection
- Plugin architecture without unsafe native plugin loading
- Monaco-based editor with a VS Code-style layout
- Keyboard shortcut: Ctrl+Enter to run code
- Tauri 2 configuration with capability-based security model

## Project Layout

- backend/ Rust backend and Tauri commands
- backend/capabilities/default.json Tauri 2 default capability
- frontend/src/ React frontend
- .github/copilot-instructions.md workspace instructions

## Prerequisites

- Node.js 20+
- Rust toolchain
- Tauri prerequisites for Windows
- Deno installed for the primary runtime path
- Node.js installed for the secondary runtime path

## Install

```bash
npm install
npm --prefix frontend install
```

## Development

```bash
npm run dev
npm run tauri dev
```

## Build

```bash
npm run build
npm run tauri build
```

## Security Notes

- Deno runs with --allow-none.
- Node execution is forced through a separate process with permission flags and validation gates.
- The plugin loader is manifest-driven to avoid unsafe native code loading.
- The WASM sandbox layer is isolated behind a dedicated abstraction.
- Wasmtime integration is feature-gated; enable it with cargo check --features wasm-engine when validating hardened WASM paths.

## Next Steps

- Wire the runtime binaries and inspect the command output paths.
- Expand the debugger session wiring to a live browser target or runtime inspector socket.
- Add tests for the validator and process isolation layers.
