import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { normalizeLanguage } from '../lib/transpileSource.js';

// ─── Internal invoke wrapper ──────────────────────────────────────────────────

async function invokeSafe(command, payload) {
  try {
    return await invoke(command, payload);
  } catch (error) {
    const msg = error?.message ?? String(error);
    if (msg.includes('__TAURI_INTERNALS__') || msg.includes('Tauri')) {
      throw new Error(
        `Tauri IPC unavailable for "${command}". Launch the app via "npm run tauri dev".`,
      );
    }
    throw error;
  }
}

// ─── Typed IPC commands ───────────────────────────────────────────────────────

/**
 * Execute code in the selected runtime.
 * Streams stdout/stderr as `execution:stdout` / `execution:stderr` events
 * while this promise is pending. Resolves with final metrics on completion.
 *
 * @param {{ code: string, language: string, runtime: string, mode: string }} request
 */
export const executeCode = (request) =>
  invokeSafe('execute_code', {
    request: { ...request, language: normalizeLanguage(request.language) },
  });

/**
 * Signal a running execution to stop.
 * @param {string} executionId
 */
export const stopExecution = (executionId) =>
  invokeSafe('stop_execution', { request: { execution_id: executionId } });

/**
 * Start a debug session for the given code.
 * @param {{ code: string, language: string, runtime: string }} request
 */
export const debugCode = (request) =>
  invokeSafe('debug_code', {
    request: { ...request, language: normalizeLanguage(request.language) },
  });

/**
 * Transpile code on the backend (SWC). Returns `{ code, source_map }`.
 * @param {string} code
 * @param {string} language
 */
export const transpileCode = (code, language) =>
  invokeSafe('transpile_code', {
    request: { code, language: normalizeLanguage(language) },
  });

/**
 * Returns which runtimes are available on the host machine.
 * Probed once at app startup; this call reads the cached result.
 *
 * @returns {Promise<{ node: boolean, deno: boolean, bun: boolean }>}
 */
export const getRuntimeAvailability = () =>
  invokeSafe('get_runtime_availability', {});

// ─── Typed event subscriptions ────────────────────────────────────────────────

/**
 * Subscribe to real-time stdout lines during execution.
 * Returns an unlisten function — call it to clean up.
 *
 * Payload shape: { execution_id, kind: "log", message, timestamp }
 *
 * @param {(payload: object) => void} handler
 * @returns {Promise<() => void>}
 */
export const onExecutionStdout = (handler) =>
  listen('execution:stdout', (event) => handler(event.payload));

/**
 * Subscribe to real-time stderr lines during execution.
 * Returns an unlisten function — call it to clean up.
 *
 * Payload shape: { execution_id, kind: "error", message, timestamp }
 *
 * @param {(payload: object) => void} handler
 * @returns {Promise<() => void>}
 */
export const onExecutionStderr = (handler) =>
  listen('execution:stderr', (event) => handler(event.payload));
