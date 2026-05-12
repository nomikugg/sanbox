// ─── Session persistence ──────────────────────────────────────────────────────
// Owns the session.json schema, versioning, migration, and atomic I/O.
// Persists: tabs, activeTabId, snippets.
// Does NOT persist: execution state, logs, metrics, debugger state, history.

import { invoke } from '@tauri-apps/api/core';

const SESSION_FILE = 'session.json';
const SESSION_VERSION = 1;

const VALID_LANGUAGES = new Set(['js', 'jsx', 'ts', 'tsx', 'ty']);

// ─── Migration chain ──────────────────────────────────────────────────────────
// Each entry transforms from version N to N+1. Add new entries here as the
// schema evolves; do not modify existing entries.

const migrations = {
  // 0 → 1: initial versioned format.
  0: (data) => ({
    version: 1,
    savedAt: data.savedAt ?? new Date().toISOString(),
    tabs: data.tabs ?? [],
    activeTabId: data.activeTabId ?? data.tabs?.[0]?.id ?? null,
    snippets: data.snippets ?? [],
  }),
};

function applyMigrations(data) {
  let current = data;
  const from = current.version ?? 0;
  for (let v = from; v < SESSION_VERSION; v++) {
    if (migrations[v]) current = migrations[v](current);
  }
  return current;
}

// ─── Validation ───────────────────────────────────────────────────────────────
// All-or-nothing: a partially valid session is rejected entirely to prevent
// a corrupt tab from crashing the editor. The app falls back to first-launch
// defaults on any validation failure.

function validateTab(tab) {
  return (
    typeof tab === 'object' &&
    tab !== null &&
    typeof tab.id === 'string' &&
    tab.id.length > 0 &&
    typeof tab.title === 'string' &&
    VALID_LANGUAGES.has(tab.language) &&
    typeof tab.code === 'string'
  );
}

function validateSnippet(snippet) {
  return (
    typeof snippet === 'object' &&
    snippet !== null &&
    typeof snippet.id === 'string' &&
    typeof snippet.name === 'string' &&
    typeof snippet.code === 'string'
  );
}

function validate(data) {
  if (typeof data !== 'object' || data === null) return false;
  if (!Array.isArray(data.tabs) || data.tabs.length === 0) return false;
  if (!data.tabs.every(validateTab)) return false;
  if (typeof data.activeTabId !== 'string') return false;
  // activeTabId must reference an existing tab — rejects dangling IDs
  // that could arise from a crash during a close operation.
  if (!data.tabs.some((tab) => tab.id === data.activeTabId)) return false;
  if (!Array.isArray(data.snippets)) return false;
  if (!data.snippets.every(validateSnippet)) return false;
  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Loads and validates the session from disk.
 * Returns `{ tabs, activeTabId, snippets }` on success, or `null` on any
 * failure. Callers must treat null as "use first-launch defaults".
 * Never throws.
 */
export async function loadSession() {
  try {
    const raw = await invoke('read_app_file', { filename: SESSION_FILE });
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const migrated = applyMigrations(parsed);

    if (!validate(migrated)) return null;

    return {
      tabs: migrated.tabs,
      activeTabId: migrated.activeTabId,
      snippets: migrated.snippets,
    };
  } catch {
    return null;
  }
}

/**
 * Persists tabs, activeTabId, and snippets atomically.
 * Failures are silent — a failed write is non-fatal.
 */
export async function saveSession({ tabs, activeTabId, snippets }) {
  const content = JSON.stringify(
    {
      version: SESSION_VERSION,
      savedAt: new Date().toISOString(),
      tabs,
      activeTabId,
      snippets,
    },
    null,
    2,
  );
  try {
    await invoke('write_app_file', { filename: SESSION_FILE, content });
  } catch {
    // Persist failures are non-fatal.
  }
}
