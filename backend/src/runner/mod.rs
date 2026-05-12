mod deno_runner;
mod node_runner;
mod process_isolation;
mod runtime_manager;
mod sandbox;
mod wasm_sandbox;

use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

pub use runtime_manager::RuntimeManager;
pub use sandbox::Sandbox;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeKind {
  Deno,
  Node,
  Bun,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
  pub kind: String,
  pub message: String,
  pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChildProcessResult {
  pub stdout: Option<String>,
  pub stderr: Option<String>,
  pub exit_code: Option<i32>,
  pub memory_bytes: u64,
  pub cpu_ms: u64,
  pub logs: Vec<LogEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResponse {
  pub execution_id: String,
  pub output: Option<String>,
  pub error: Option<String>,
  pub execution_time: u128,
  pub memory_bytes: u64,
  pub cpu_ms: u64,
  pub logs: Vec<LogEntry>,
}

#[derive(Debug)]
pub enum RuntimeError {
  Validation(String),
  Process(String),
  Unsupported(String),
}

impl Display for RuntimeError {
  fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
    match self {
      Self::Validation(message) | Self::Process(message) | Self::Unsupported(message) => {
        write!(formatter, "{message}")
      }
    }
  }
}

impl std::error::Error for RuntimeError {}
