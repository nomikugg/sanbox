mod breakpoints;
mod cdp_client;

use crate::runner::{ExecutionResponse, RuntimeKind};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tokio::time::{sleep, Duration};

use breakpoints::Breakpoint;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebugSession {
  pub session_id: String,
  pub runtime: RuntimeKind,
  pub websocket_url: String,
  pub paused: bool,
  pub breakpoints: Vec<Breakpoint>,
  pub variables: Vec<VariableSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariableSnapshot {
  pub name: String,
  pub value: String,
  pub type_name: String,
}

#[derive(Clone)]
pub struct DebuggerCoordinator {
  current_session: Arc<Mutex<Option<DebugSession>>>,
}

impl DebuggerCoordinator {
  pub fn new() -> Self {
    Self {
      current_session: Arc::new(Mutex::new(None)),
    }
  }

  pub async fn prepare_session(&self, _code: String, runtime: RuntimeKind) -> Result<DebugSession, String> {
    sleep(Duration::from_millis(50)).await;
    let session = DebugSession {
      session_id: uuid::Uuid::new_v4().to_string(),
      runtime,
      websocket_url: "ws://127.0.0.1:9229/devtools/page/runjs-pro".into(),
      paused: true,
      breakpoints: vec![Breakpoint::new("snippet.js", 1, 0)],
      variables: vec![VariableSnapshot {
        name: "status".into(),
        value: "debug session prepared".into(),
        type_name: "string".into(),
      }],
    };

    if let Ok(mut guard) = self.current_session.lock() {
      *guard = Some(session.clone());
    }

    Ok(session)
  }

  pub fn capture_execution(&self, _execution_id: &str, _response: &ExecutionResponse) {
    if let Ok(mut guard) = self.current_session.lock() {
      if let Some(session) = guard.as_mut() {
        session.paused = false;
      }
    }
  }
}
