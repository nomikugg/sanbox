use crate::debugger::{DebuggerCoordinator, DebugSession};
use crate::runner::{ExecutionResponse, RuntimeKind, RuntimeManager};
use crate::security::{PermissionPolicy, SecurityLimits, SecurityMode};
use crate::utils::transpiler::{transpile_source, SourceLanguage};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::State;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
  pub runtime_manager: Arc<RuntimeManager>,
  pub debugger: Arc<DebuggerCoordinator>,
  pub active_executions: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

impl AppState {
  pub fn new() -> Self {
    let permissions = PermissionPolicy::strict();
    let limits = SecurityLimits::for_mode(SecurityMode::Strict);

    Self {
      runtime_manager: Arc::new(RuntimeManager::new(permissions, limits)),
      debugger: Arc::new(DebuggerCoordinator::new()),
      active_executions: Arc::new(Mutex::new(HashMap::new())),
    }
  }
}

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

#[tauri::command]
pub async fn execute_code(request: ExecuteCodeRequest, state: State<'_, AppState>) -> Result<ExecutionResponse, String> {
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

  let execution_id_for_worker = execution_id.clone();
  let response = tauri::async_runtime::spawn_blocking(move || {
    runtime_manager
      .execute(
        execution_id_for_worker,
        request.code,
        request.language,
        request.runtime.into(),
        request.mode.into(),
        cancel,
      )
      .map_err(|error| error.to_string())
  })
  .await
  .map_err(|error| format!("execution worker failed: {error}"))?;

  if let Ok(result) = &response {
    state.debugger.capture_execution(&execution_id, result);
  }

  if let Ok(mut active) = state.active_executions.lock() {
    active.remove(&execution_id);
  }

  response
}

#[tauri::command]
pub async fn debug_code(request: DebugCodeRequest, state: State<'_, AppState>) -> Result<DebugSession, String> {
  let runtime = request.runtime.into();
  state
    .debugger
    .prepare_session(request.code, runtime)
    .await
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn transpile_code(request: TranspileCodeRequest) -> Result<TranspileCodeResponse, String> {
  let language = SourceLanguage::from_str(&request.language);
  let transpiled = transpile_source(&request.code, language).map_err(|error| error.to_string())?;
  Ok(TranspileCodeResponse {
    code: transpiled.code,
    source_map: transpiled.source_map,
  })
}

#[tauri::command]
pub fn stop_execution(request: StopExecutionRequest, state: State<'_, AppState>) -> Result<bool, String> {
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
