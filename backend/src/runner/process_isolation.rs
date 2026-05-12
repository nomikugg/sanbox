use crate::runner::{ChildProcessResult, RuntimeError};
use crate::security::SecurityLimits;
use serde::Serialize;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use sysinfo::{Pid, ProcessRefreshKind, RefreshKind, System};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

// ─── Event payload emitted per stdout/stderr line ────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct StreamLogEvent {
  pub execution_id: String,
  pub kind: String,
  pub message: String,
  pub timestamp: u64,
}

fn epoch_ms() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis() as u64
}

// ─── Cancel watcher ──────────────────────────────────────────────────────────

async fn wait_for_cancel(cancel: Arc<AtomicBool>) {
  while !cancel.load(Ordering::Relaxed) {
    tokio::time::sleep(Duration::from_millis(50)).await;
  }
}

// ─── Main streaming runner ───────────────────────────────────────────────────

/// Spawns `command`, streams stdout/stderr as Tauri events in real-time,
/// enforces memory + timeout limits, and supports external cancellation.
pub async fn run_streaming(
  app: AppHandle,
  execution_id: String,
  mut command: Command,
  limits: SecurityLimits,
  cancel: Arc<AtomicBool>,
) -> Result<ChildProcessResult, RuntimeError> {
  command.stdout(Stdio::piped()).stderr(Stdio::piped()).kill_on_drop(true);

  let mut child = command
    .spawn()
    .map_err(|e| RuntimeError::Process(format!("failed to spawn process: {e}")))?;

  let pid = child.id().unwrap_or(0);
  let start = Instant::now();
  let memory_exceeded = Arc::new(AtomicBool::new(false));
  let peak_memory = Arc::new(AtomicU64::new(0));

  // ── Memory monitor ─────────────────────────────────────────────────────────
  let mon_cancel = Arc::clone(&cancel);
  let mon_exceeded = Arc::clone(&memory_exceeded);
  let mon_peak = Arc::clone(&peak_memory);
  let memory_limit = limits.memory_bytes;

  let memory_monitor = tokio::spawn(async move {
    let mut sys = System::new_with_specifics(
      RefreshKind::new().with_processes(ProcessRefreshKind::everything()),
    );
    while !mon_cancel.load(Ordering::Relaxed) {
      sys.refresh_process(Pid::from_u32(pid));
      if let Some(proc) = sys.process(Pid::from_u32(pid)) {
        let used = proc.memory();
        mon_peak.fetch_max(used, Ordering::Relaxed);
        if used > memory_limit {
          mon_exceeded.store(true, Ordering::Relaxed);
          mon_cancel.store(true, Ordering::Relaxed);
          break;
        }
      }
      tokio::time::sleep(Duration::from_millis(500)).await;
    }
  });

  // ── IO streaming tasks ─────────────────────────────────────────────────────
  let stdout_pipe = child.stdout.take().expect("stdout was piped");
  let stderr_pipe = child.stderr.take().expect("stderr was piped");

  let app1 = app.clone();
  let id1 = execution_id.clone();
  let cancel1 = Arc::clone(&cancel);
  let stdout_task = tokio::spawn(async move {
    let mut reader = BufReader::new(stdout_pipe).lines();
    while let Ok(Some(line)) = reader.next_line().await {
      if cancel1.load(Ordering::Relaxed) {
        break;
      }
      app1
        .emit(
          "execution:stdout",
          StreamLogEvent {
            execution_id: id1.clone(),
            kind: "log".into(),
            message: line,
            timestamp: epoch_ms(),
          },
        )
        .ok();
    }
  });

  let app2 = app.clone();
  let id2 = execution_id.clone();
  let cancel2 = Arc::clone(&cancel);
  let stderr_task = tokio::spawn(async move {
    let mut reader = BufReader::new(stderr_pipe).lines();
    while let Ok(Some(line)) = reader.next_line().await {
      if cancel2.load(Ordering::Relaxed) {
        break;
      }
      app2
        .emit(
          "execution:stderr",
          StreamLogEvent {
            execution_id: id2.clone(),
            kind: "error".into(),
            message: line,
            timestamp: epoch_ms(),
          },
        )
        .ok();
    }
  });

  // ── Process wait — moved into a task so select! can abort it ───────────────
  // kill_on_drop(true) on the command means the OS process is killed when the
  // Child struct is dropped — which happens when the spawned task is aborted.
  let child_waiter = tokio::spawn(async move { child.wait().await });
  tokio::pin!(child_waiter);

  let status_result: Result<std::process::ExitStatus, RuntimeError> = tokio::select! {
    join_result = &mut child_waiter => {
      match join_result {
        Ok(Ok(status)) => Ok(status),
        Ok(Err(e))     => Err(RuntimeError::Process(e.to_string())),
        Err(_)         => Err(RuntimeError::Process("process join error".into())),
      }
    }
    _ = tokio::time::sleep(limits.timeout) => {
      child_waiter.abort();
      Err(RuntimeError::Process("execution timed out".into()))
    }
    _ = wait_for_cancel(Arc::clone(&cancel)) => {
      child_waiter.abort();
      if memory_exceeded.load(Ordering::Relaxed) {
        Err(RuntimeError::Process("execution exceeded memory limit".into()))
      } else {
        Err(RuntimeError::Process("execution stopped by user".into()))
      }
    }
  };

  // Signal remaining tasks to stop, then drain them so all events are flushed
  cancel.store(true, Ordering::Relaxed);
  let _ = tokio::join!(stdout_task, stderr_task, memory_monitor);

  let status = status_result?;

  Ok(ChildProcessResult {
    stdout: None,
    stderr: None,
    exit_code: status.code(),
    memory_bytes: peak_memory.load(Ordering::Relaxed),
    cpu_ms: start.elapsed().as_millis() as u64,
    logs: vec![],
  })
}
