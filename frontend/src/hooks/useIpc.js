import { invoke } from '@tauri-apps/api/core';
import { normalizeLanguage } from '../lib/transpileSource.js';

const fallback = async (name) => {
  throw new Error(`Tauri IPC is not available for ${name}. Run the desktop app with \"npm run tauri\" from the workspace root.`);
};

async function invokeSafe(command, payload, fallbackName) {
  try {
    return await invoke(command, payload);
  } catch (error) {
    const message = error?.message ?? String(error);
    if (message.includes('window.__TAURI_INTERNALS__') || message.includes('Tauri')) {
      return fallback(fallbackName);
    }
    throw error;
  }
}

export default function useIpc() {
  return {
    transpileCode: (payload) =>
      invokeSafe(
        'transpile_code',
        {
          request: {
            code: payload.code,
            language: normalizeLanguage(payload.language),
          },
        },
        'transpile_code',
      ),
    executeCode: (payload) =>
      invokeSafe(
        'execute_code',
        {
          request: {
            ...payload,
            language: normalizeLanguage(payload.language),
          },
        },
        'execute_code',
      ),
    debugCode: (payload) =>
      invokeSafe(
        'debug_code',
        {
          request: {
            ...payload,
            language: normalizeLanguage(payload.language),
          },
        },
        'debug_code',
      ),
    stopExecution: (executionId) =>
      invokeSafe(
        'stop_execution',
        {
          request: { execution_id: executionId },
        },
        'stop_execution',
      ),
  };
}
