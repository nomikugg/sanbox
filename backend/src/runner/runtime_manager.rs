use crate::runner::{
  deno_runner, node_runner, process_isolation, ExecutionResponse, RuntimeError, RuntimeKind, Sandbox,
};
use crate::security::{PermissionPolicy, SecurityLimits, SecurityMode};
use crate::utils::transpiler::{transpile_source, SourceLanguage};
use std::io::Write as _;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::time::Instant;
use tauri::AppHandle;
use tempfile::Builder;

pub struct RuntimeManager {
  sandbox: Sandbox,
}

impl RuntimeManager {
  pub fn new() -> Self {
    Self { sandbox: Sandbox::new() }
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

    self.sandbox.validate(&code, runtime, mode, &PermissionPolicy::for_mode(mode))?;

    let lang = SourceLanguage::from_str(&language);
    let transpiled = transpile_source(&code, lang)?;
    let executable = transpiled.code;

    // Write transpiled code to a .mjs temp file and immediately close our write
    // handle. TempPath holds the path and deletes the file on drop — no open
    // descriptor means Windows can open the file for reading without conflicts.
    // The binding stays in scope past run_streaming so the file outlives the process.
    let temp_path = {
      let mut f = Builder::new()
        .suffix(".mjs")
        .tempfile()
        .map_err(|e| RuntimeError::Process(format!("failed to create temp file: {e}")))?;
      f.write_all(executable.as_bytes())
        .map_err(|e| RuntimeError::Process(format!("failed to write temp file: {e}")))?;
      f.into_temp_path()
    };

    let command = match runtime {
      RuntimeKind::Node => node_runner::build_command(&temp_path),
      RuntimeKind::Deno => deno_runner::build_command(&temp_path),
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
