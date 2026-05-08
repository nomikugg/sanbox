use crate::runner::{ChildProcessResult, LogEntry, RuntimeError};
use crate::security::SecurityLimits;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::process::Command;

pub fn run(code: &str, limits: &SecurityLimits, cancel: Arc<AtomicBool>) -> Result<ChildProcessResult, RuntimeError> {
  let mut command = Command::new("node");
  command.args(["--no-warnings", "--experimental-permission", "--input-type=module", "--eval", code]);
  command.env_clear();

  let isolation = super::process_isolation::ProcessIsolation::new(limits.clone());
  isolation
    .run(command, cancel)
    .map(|mut result| {
      result.logs.push(LogEntry {
        kind: "info".into(),
        message: "Executed through Node with experimental permissions enabled".into(),
      });
      result
    })
    .map_err(RuntimeError::Process)
}
