use crate::debugger::{DebuggerCoordinator, DebugSession};
use crate::runner::{ExecutionResponse, RuntimeKind, RuntimeManager};
use crate::security::SecurityMode;
use crate::utils::transpiler::{transpile_source, SourceLanguage};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

// ─── Runtime capabilities ─────────────────────────────────────────────────────

// Minimum Node.js major version that supports --experimental-permission.
const NODE_PERMISSION_MIN_MAJOR: u32 = 20;

/// Per-runtime capability descriptor returned to the frontend.
/// All fields use camelCase serialisation to match JavaScript conventions.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeCapabilities {
  /// Binary is present on PATH and exits successfully with --version.
  pub installed: bool,
  /// Full semver string, e.g. "20.11.0" or "1.41.0". None if absent or unparseable.
  pub version: Option<String>,
  /// Runtime enforces a permission model (Node >= 20, Deno always, Bun pending).
  pub supports_permissions: bool,
  /// Runtime supports Chrome DevTools Protocol for debugging.
  pub supports_debugger: bool,
}

impl RuntimeCapabilities {
  fn unavailable() -> Self {
    Self { installed: false, version: None, supports_permissions: false, supports_debugger: false }
  }
}

/// Capabilities for every runtime the app knows about.
#[derive(Debug, Clone, Serialize)]
pub struct AppCapabilities {
  pub node: RuntimeCapabilities,
  pub deno: RuntimeCapabilities,
  pub bun: RuntimeCapabilities,
}

fn probe_node() -> RuntimeCapabilities {
  let output = match std::process::Command::new("node")
    .arg("--version")
    .stdout(Stdio::piped())
    .stderr(Stdio::null())
    .output()
  {
    Ok(out) if out.status.success() => out,
    _ => return RuntimeCapabilities::unavailable(),
  };
  // Node prints "vMAJOR.MINOR.PATCH\n"
  let raw = std::str::from_utf8(&output.stdout).unwrap_or("").trim();
  let version_str = raw.trim_start_matches('v');
  let major = version_str.split('.').next().and_then(|s| s.parse::<u32>().ok());
  let version = if version_str.is_empty() { None } else { Some(version_str.to_string()) };
  RuntimeCapabilities {
    installed: true,
    version,
    supports_permissions: major.map_or(false, |v| v >= NODE_PERMISSION_MIN_MAJOR),
    supports_debugger: true,
  }
}

fn probe_deno() -> RuntimeCapabilities {
  let output = match std::process::Command::new("deno")
    .arg("--version")
    .stdout(Stdio::piped())
    .stderr(Stdio::null())
    .output()
  {
    Ok(out) if out.status.success() => out,
    _ => return RuntimeCapabilities::unavailable(),
  };
  // Deno prints multiple lines; the first is "deno MAJOR.MINOR.PATCH"
  let stdout = std::str::from_utf8(&output.stdout).unwrap_or("");
  let version = stdout
    .lines()
    .find(|line| line.starts_with("deno "))
    .and_then(|line| line.strip_prefix("deno "))
    .map(|v| v.trim().to_string());
  RuntimeCapabilities {
    installed: true,
    version,
    supports_permissions: true, // Deno permission model is always present
    supports_debugger: true,
  }
}

// ─── App state ───────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AppState {
  pub runtime_manager: Arc<RuntimeManager>,
  pub debugger: Arc<DebuggerCoordinator>,
  pub active_executions: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
  pub capabilities: AppCapabilities,
}

impl AppState {
  pub fn new() -> Self {
    // Probe Node and Deno in parallel so startup delay is max(node, deno) not sum.
    let node_probe = std::thread::spawn(probe_node);
    let deno_probe = std::thread::spawn(probe_deno);

    let node = node_probe.join().unwrap_or_else(|_| RuntimeCapabilities::unavailable());
    let deno = deno_probe.join().unwrap_or_else(|_| RuntimeCapabilities::unavailable());

    // node_permission_flag is derived from the capability and passed once to
    // RuntimeManager so the execution path never needs to re-derive it.
    let node_permission_flag = node.supports_permissions;

    let capabilities = AppCapabilities {
      node,
      deno,
      bun: RuntimeCapabilities::unavailable(), // reserved until Bun is implemented
    };
    Self {
      runtime_manager: Arc::new(RuntimeManager::new(node_permission_flag)),
      debugger: Arc::new(DebuggerCoordinator::new()),
      active_executions: Arc::new(Mutex::new(HashMap::new())),
      capabilities,
    }
  }
}

// ─── Request / response types ────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeRequest {
  Deno,
  Node,
  Bun,
}

impl From<RuntimeRequest> for RuntimeKind {
  fn from(value: RuntimeRequest) -> Self {
    match value {
      RuntimeRequest::Deno => RuntimeKind::Deno,
      RuntimeRequest::Node => RuntimeKind::Node,
      RuntimeRequest::Bun => RuntimeKind::Bun,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SecurityRequest {
  Strict,
  Balanced,
  Debug,
}

impl From<SecurityRequest> for SecurityMode {
  fn from(value: SecurityRequest) -> Self {
    match value {
      SecurityRequest::Strict => SecurityMode::Strict,
      SecurityRequest::Balanced => SecurityMode::Balanced,
      SecurityRequest::Debug => SecurityMode::Debug,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteCodeRequest {
  pub code: String,
  pub language: String,
  pub runtime: RuntimeRequest,
  pub mode: SecurityRequest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebugCodeRequest {
  pub code: String,
  pub language: String,
  pub runtime: RuntimeRequest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranspileCodeRequest {
  pub code: String,
  pub language: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranspileCodeResponse {
  pub code: String,
  pub source_map: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StopExecutionRequest {
  pub execution_id: String,
}

// ─── IPC commands ────────────────────────────────────────────────────────────

/// Executes code and streams stdout/stderr as `execution:stdout` / `execution:stderr`
/// Tauri events in real-time. Returns final metrics when the process exits.
#[tauri::command]
pub async fn execute_code(
  request: ExecuteCodeRequest,
  state: State<'_, AppState>,
  app: AppHandle,
) -> Result<ExecutionResponse, String> {
  let execution_id = Uuid::new_v4().to_string();
  let cancel = Arc::new(AtomicBool::new(false));
  let runtime_manager = Arc::clone(&state.runtime_manager);

  {
    let mut active = state
      .active_executions
      .lock()
      .map_err(|_| "failed to lock execution registry")?;
    active.insert(execution_id.clone(), Arc::clone(&cancel));
  }

  let result = runtime_manager
    .execute(
      app,
      execution_id.clone(),
      request.code,
      request.language,
      request.runtime.into(),
      request.mode.into(),
      cancel,
    )
    .await
    .map_err(|e| e.to_string());

  if let Ok(exec_result) = &result {
    state.debugger.capture_execution(&execution_id, exec_result);
  }

  if let Ok(mut active) = state.active_executions.lock() {
    active.remove(&execution_id);
  }

  result
}

#[tauri::command]
pub async fn debug_code(
  request: DebugCodeRequest,
  state: State<'_, AppState>,
) -> Result<DebugSession, String> {
  let runtime = request.runtime.into();
  state
    .debugger
    .prepare_session(request.code, runtime)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn transpile_code(request: TranspileCodeRequest) -> Result<TranspileCodeResponse, String> {
  let language = SourceLanguage::from_str(&request.language);
  let transpiled = transpile_source(&request.code, language).map_err(|e| e.to_string())?;
  Ok(TranspileCodeResponse { code: transpiled.code, source_map: transpiled.source_map })
}

#[tauri::command]
pub fn stop_execution(
  request: StopExecutionRequest,
  state: State<'_, AppState>,
) -> Result<bool, String> {
  let active = state
    .active_executions
    .lock()
    .map_err(|_| "failed to lock execution registry")?;

  if let Some(cancel) = active.get(&request.execution_id) {
    cancel.store(true, Ordering::Relaxed);
    return Ok(true);
  }

  Ok(false)
}

#[tauri::command]
pub fn get_runtime_availability(state: State<'_, AppState>) -> AppCapabilities {
  state.capabilities.clone()
}

// ─── App-data file I/O ───────────────────────────────────────────────────────
// Generic read/write scoped to app_data_dir(). Used by the frontend persistence
// layer for settings.json, session.json, etc. — no Tauri fs plugin required.
// Filenames are sanitised to prevent path traversal.

fn is_safe_filename(name: &str) -> bool {
  !name.is_empty()
    && !name.contains('/')
    && !name.contains('\\')
    && !name.contains("..")
    && name.len() < 64
}

#[tauri::command]
pub fn read_app_file(app: AppHandle, filename: String) -> Option<String> {
  if !is_safe_filename(&filename) {
    return None;
  }
  let path = app.path().app_data_dir().ok()?.join(&filename);
  std::fs::read_to_string(&path).ok()
}

/// Writes `content` to `app_data_dir/filename` atomically:
/// writes to a `.tmp` sibling first, then renames so a crash during write
/// never leaves the target file in a partial state.
#[tauri::command]
pub fn write_app_file(app: AppHandle, filename: String, content: String) -> Result<(), String> {
  if !is_safe_filename(&filename) {
    return Err("invalid filename".into());
  }
  let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  let tmp = dir.join(format!("{filename}.tmp"));
  let target = dir.join(&filename);
  std::fs::write(&tmp, content.as_bytes()).map_err(|e| e.to_string())?;
  std::fs::rename(&tmp, &target).map_err(|e| e.to_string())?;
  Ok(())
}
