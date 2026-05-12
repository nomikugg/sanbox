// ─── Settings persistence ─────────────────────────────────────────────────────
// Owns the settings.json schema, versioning, migration, and atomic I/O.
// The backend commands read_app_file / write_app_file handle the actual file
// operations scoped to app_data_dir(). This module owns everything above that.

import { invoke } from '@tauri-apps/api/core';

const SETTINGS_FILE = 'settings.json';
const SETTINGS_VERSION = 1;

const VALID_RUNTIMES = new Set(['node', 'deno', 'bun']);
const VALID_SECURITY_MODES = new Set(['strict', 'balanced', 'debug']);

// ─── Migration chain ──────────────────────────────────────────────────────────
// Each entry transforms from version N to N+1. Add new entries here as the
// schema evolves; do not modify existing entries (they are already applied to
// users' files).

const migrations = {
  // 0 → 1: initial versioned format; files without a version field are v0.
  // Currently the only migration — here as a documented extension point.
  0: (data) => ({
    version: 1,
    savedAt: data.savedAt ?? new Date().toISOString(),
    runtime: data.runtime ?? 'node',
    securityMode: data.securityMode ?? 'strict',
  }),
};

function applyMigrations(data) {
  let current = data;
  const from = current.version ?? 0;
  for (let v = from; v < SETTINGS_VERSION; v++) {
    if (migrations[v]) current = migrations[v](current);
  }
  return current;
}

// ─── Validation ───────────────────────────────────────────────────────────────
// Accepts the known fields and rejects unrecognised or absent values. An
// unknown securityMode or runtime (e.g., added in a future version that was
// rolled back) falls back to defaults rather than crashing.

function validate(data) {
  return (
    typeof data === 'object' &&
    data !== null &&
    VALID_RUNTIMES.has(data.runtime) &&
    VALID_SECURITY_MODES.has(data.securityMode)
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Loads and validates settings from disk.
 * Returns `{ runtime, securityMode }` on success, or `null` on any failure
 * (missing file, corrupt JSON, invalid values, outside Tauri, etc.).
 * Callers must treat null as "use defaults" — this function never throws.
 */
export async function loadSettings() {
  try {
    const raw = await invoke('read_app_file', { filename: SETTINGS_FILE });
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const migrated = applyMigrations(parsed);

    if (!validate(migrated)) return null;

    return {
      runtime: migrated.runtime,
      securityMode: migrated.securityMode,
    };
  } catch {
    return null;
  }
}

/**
 * Persists the given settings to disk atomically.
 * Failures are silent — a failed write is non-fatal; the app continues
 * with the correct in-memory state.
 */
export async function saveSettings({ runtime, securityMode }) {
  const content = JSON.stringify(
    {
      version: SETTINGS_VERSION,
      savedAt: new Date().toISOString(),
      runtime,
      securityMode,
    },
    null,
    2,
  );
  try {
    await invoke('write_app_file', { filename: SETTINGS_FILE, content });
  } catch {
    // Persist failures are non-fatal.
  }
}
