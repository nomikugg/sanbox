use crate::runner::{
  deno_runner, node_runner, process_isolation, ExecutionResponse, RuntimeError, RuntimeKind, Sandbox,
};
use crate::security::{PermissionPolicy, SecurityLimits, SecurityMode};
use crate::utils::transpiler::{transpile_source, SourceLanguage};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::time::Instant;
use tauri::AppHandle;

pub struct RuntimeManager {
  sandbox: Sandbox,
  permissions: PermissionPolicy,
}

impl RuntimeManager {
  pub fn new(permissions: PermissionPolicy, _limits: SecurityLimits) -> Self {
    Self { sandbox: Sandbox::new(), permissions }
  }

  pub async fn execute(
    &self,
    app: AppHandle,
    execution_id: String,
    code: String,
    language: String,
    runtime: RuntimeKind,
    mode: SecurityMode,
    cancel: Arc<AtomicBool>,
  ) -> Result<ExecutionResponse, RuntimeError> {
    let start = Instant::now();
    let limits = SecurityLimits::for_mode(mode);

    self.sandbox.validate(&code, runtime, mode, &self.permissions)?;

    let lang = SourceLanguage::from_str(&language);
    let transpiled = transpile_source(&code, lang)?;
    let executable = transpiled.code;

    let command = match runtime {
      RuntimeKind::Node => node_runner::build_command(&executable),
      RuntimeKind::Deno => deno_runner::build_command(&executable),
      RuntimeKind::Bun => {
        return Err(RuntimeError::Unsupported(
          "Bun runtime is reserved for future integration".into(),
        ))
      }
    };

    let result =
      process_isolation::run_streaming(app, execution_id.clone(), command, limits, cancel).await?;

    let error = if result.exit_code.unwrap_or(1) == 0 { None } else { result.stderr.clone() };

    Ok(ExecutionResponse {
      execution_id,
      output: result.stdout,
      error,
      execution_time: start.elapsed().as_millis(),
      memory_bytes: result.memory_bytes,
      cpu_ms: result.cpu_ms,
      logs: result.logs,
    })
  }
}
