// ─── Execution history persistence ───────────────────────────────────────────
// Owns history.json schema, versioning, migration, deduplication, and I/O.
// Persists finalized execution entries only — never streaming state.
//
// Entry schema (flat primitives for future SQLite compatibility):
//   { id, runtime, timestamp, code, output, error }
//
// Validation is per-entry: a corrupt entry is dropped rather than rejecting
// the entire file. This preserves valid history across partial corruption.

import { invoke } from '@tauri-apps/api/core';

const HISTORY_FILE = 'history.json';
const HISTORY_VERSION = 1;

// Matches the cap in the reducer's appendHistory: [entry, ...state.history].slice(0, N)
export const MAX_HISTORY_SIZE = 25;

// ─── Migration chain ──────────────────────────────────────────────────────────

const migrations = {
  // 0 → 1: initial versioned format.
  0: (data) => ({
    version: 1,
    savedAt: data.savedAt ?? new Date().toISOString(),
    entries: Array.isArray(data.entries) ? data.entries : [],
  }),
};

function applyMigrations(data) {
  let current = data;
  const from = current.version ?? 0;
  for (let v = from; v < HISTORY_VERSION; v++) {
    if (migrations[v]) current = migrations[v](current);
  }
  return current;
}

// ─── Per-entry validation ─────────────────────────────────────────────────────
// Only required fields are checked. Unknown fields from future schema versions
// are ignored rather than failing validation — forward compatibility.

function validateEntry(entry) {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    typeof entry.runtime === 'string' &&
    entry.runtime.length > 0 &&
    typeof entry.timestamp === 'string' &&
    entry.timestamp.length > 0 &&
    typeof entry.code === 'string' &&
    (entry.output === null || typeof entry.output === 'string') &&
    (entry.error === null || typeof entry.error === 'string')
  );
}

// ─── Consecutive deduplication ────────────────────────────────────────────────
// Removes an entry when the immediately preceding (newer) entry has the same
// code and runtime. Iterates the result array — not the source — so that
// removing an entry correctly re-exposes the next pair for comparison.

function deduplicateConsecutive(entries) {
  const result = [];
  for (const entry of entries) {
    const prev = result[result.length - 1];
    if (prev && prev.code === entry.code && prev.runtime === entry.runtime) {
      continue;
    }
    result.push(entry);
  }
  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Loads execution history from disk.
 *
 * Returns an array of valid entries (possibly empty) on success,
 * or `null` when the file is absent or the top-level JSON is unparseable.
 * Individual corrupt entries are filtered out rather than aborting the load.
 * Never throws.
 */
export async function loadHistory() {
  try {
    const raw = await invoke('read_app_file', { filename: HISTORY_FILE });
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const migrated = applyMigrations(parsed);

    if (!Array.isArray(migrated.entries)) return null;

    // Filter per-entry: keep valid, drop corrupt, never reject the whole file.
    const valid = migrated.entries
      .filter(validateEntry)
      .slice(0, MAX_HISTORY_SIZE);

    return valid;
  } catch {
    return null;
  }
}

/**
 * Persists the execution history atomically.
 * Deduplicates consecutive identical entries before writing.
 * Failures are silent — a failed write is non-fatal.
 *
 * @param {Array} entries — newest-first, as stored in state.history
 */
export async function saveHistory(entries) {
  const deduplicated = deduplicateConsecutive(entries).slice(0, MAX_HISTORY_SIZE);
  const content = JSON.stringify(
    {
      version: HISTORY_VERSION,
      savedAt: new Date().toISOString(),
      entries: deduplicated,
    },
    null,
    2,
  );
  try {
    await invoke('write_app_file', { filename: HISTORY_FILE, content });
  } catch {
    // Persist failures are non-fatal.
  }
}
