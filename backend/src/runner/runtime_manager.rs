use crate::runner::{deno_runner, node_runner, ExecutionResponse, RuntimeError, RuntimeKind, Sandbox};
use crate::security::{PermissionPolicy, SecurityLimits, SecurityMode};
use crate::utils::transpiler::{transpile_source, SourceLanguage};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::time::Instant;

pub struct RuntimeManager {
  sandbox: Sandbox,
  permissions: PermissionPolicy,
}

impl RuntimeManager {
  pub fn new(permissions: PermissionPolicy, _limits: SecurityLimits) -> Self {
    Self {
      sandbox: Sandbox::new(),
      permissions,
    }
  }

  pub fn execute(
    &self,
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

    let language = SourceLanguage::from_str(&language);
    let transpiled = transpile_source(&code, language)?;
    let executable_code = transpiled.code;

    let result = match runtime {
      RuntimeKind::Deno => deno_runner::run(&executable_code, &limits, cancel.clone())?,
      RuntimeKind::Node => node_runner::run(&executable_code, &limits, cancel.clone())?,
      RuntimeKind::Bun => {
        return Err(RuntimeError::Unsupported(
          "Bun runtime is reserved for future integration".into(),
        ))
      }
    };

    let error = if result.exit_code.unwrap_or(1) == 0 {
      None
    } else {
      result.stderr.clone()
    };

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
