use crate::runner::{ChildProcessResult, LogEntry, RuntimeError};
use crate::security::SecurityLimits;
use serde::Serialize;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use sysinfo::{Pid, ProcessRefreshKind, System};
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

// ─── Output string builder ───────────────────────────────────────────────────

// Joins messages of entries whose kind matches `kind` into a newline-delimited
// string. Warn entries (truncation markers) are intentionally excluded so they
// appear only in the console log view, not in the raw output string.
fn build_output_string(entries: &[LogEntry], kind: &str) -> Option<String> {
  let s = entries
    .iter()
    .filter(|e| e.kind == kind)
    .map(|e| e.message.as_str())
    .collect::<Vec<_>>()
    .join("\n");
  if s.is_empty() { None } else { Some(s) }
}

// ─── Main streaming runner ───────────────────────────────────────────────────

/// Spawns `command`, streams stdout/stderr as Tauri events in real-time,
/// accumulates output into `LogEntry` buffers up to `limits.max_output_bytes`,
/// enforces memory + timeout limits, and supports external cancellation.
///
/// Real-time event emission is never gated by the buffer limit — streaming
/// continues unconditionally. The limit only controls persistence.
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

  // Copy the limit fields before closures capture anything — all are Copy types,
  // so `limits` itself is never moved and remains available for the select! below.
  let max_output = limits.max_output_bytes;
  let memory_limit = limits.memory_bytes;

  // ── Memory monitor ─────────────────────────────────────────────────────────
  let mon_cancel = Arc::clone(&cancel);
  let mon_exceeded = Arc::clone(&memory_exceeded);
  let mon_peak = Arc::clone(&peak_memory);

  let memory_monitor = tokio::spawn(async move {
    // Start empty — the subprocess doesn't exist yet at init time so a full
    // process scan would be wasted work. refresh_process_specifics populates
    // the single target PID on demand.
    let mut sys = System::new();
    while !mon_cancel.load(Ordering::Relaxed) {
      sys.refresh_process_specifics(Pid::from_u32(pid), ProcessRefreshKind::new().with_memory());
      if let Some(proc) = sys.process(Pid::from_u32(pid)) {
        let used = proc.memory();
        mon_peak.fetch_max(used, Ordering::Relaxed);
        if used > memory_limit {
          mon_exceeded.store(true, Ordering::Relaxed);
          mon_cancel.store(true, Ordering::Relaxed);
          break;
        }
      }
      tokio::time::sleep(Duration::from_millis(250)).await;
    }
  });

  // ── IO streaming tasks ─────────────────────────────────────────────────────
  let stdout_pipe = child.stdout.take().expect("stdout was piped");
  let stderr_pipe = child.stderr.take().expect("stderr was piped");

  let app1 = app.clone();
  let id1 = execution_id.clone();
  let cancel1 = Arc::clone(&cancel);

  // Each task is the sole owner of its Vec<LogEntry> for its entire lifetime.
  // No Arc/Mutex needed — ownership transfers back through the JoinHandle return
  // value when tokio::join! completes.
  let stdout_task = tokio::spawn(async move {
    let mut reader = BufReader::new(stdout_pipe).lines();
    let mut entries: Vec<LogEntry> = Vec::new();
    let mut bytes = 0usize;
    let mut truncated = false;

    while let Ok(Some(line)) = reader.next_line().await {
      if cancel1.load(Ordering::Relaxed) {
        break;
      }
      let ts = epoch_ms();

      // Emit the real-time event unconditionally — streaming is never gated
      // by the persistence buffer limit.
      app1.emit(
        "execution:stdout",
        StreamLogEvent {
          execution_id: id1.clone(),
          kind: "log".into(),
          message: line.clone(),
          timestamp: ts,
        },
      ).ok();

      if !truncated {
        bytes += line.len() + 1; // +1 accounts for the implicit newline separator
        if bytes <= max_output {
          entries.push(LogEntry { kind: "log".into(), message: line, timestamp: ts });
        } else {
          truncated = true;
          entries.push(LogEntry {
            kind: "warn".into(),
            message: format!("[stdout truncated — {} KB limit reached]", max_output / 1024),
            timestamp: ts,
          });
        }
      }
    }

    entries
  });

  let app2 = app.clone();
  let id2 = execution_id.clone();
  let cancel2 = Arc::clone(&cancel);

  let stderr_task = tokio::spawn(async move {
    let mut reader = BufReader::new(stderr_pipe).lines();
    let mut entries: Vec<LogEntry> = Vec::new();
    let mut bytes = 0usize;
    let mut truncated = false;

    while let Ok(Some(line)) = reader.next_line().await {
      if cancel2.load(Ordering::Relaxed) {
        break;
      }
      let ts = epoch_ms();

      app2.emit(
        "execution:stderr",
        StreamLogEvent {
          execution_id: id2.clone(),
          kind: "error".into(),
          message: line.clone(),
          timestamp: ts,
        },
      ).ok();

      if !truncated {
        bytes += line.len() + 1;
        if bytes <= max_output {
          entries.push(LogEntry { kind: "error".into(), message: line, timestamp: ts });
        } else {
          truncated = true;
          entries.push(LogEntry {
            kind: "warn".into(),
            message: format!("[stderr truncated — {} KB limit reached]", max_output / 1024),
            timestamp: ts,
          });
        }
      }
    }

    entries
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

  // Signal IO tasks and monitor to stop, drain them so all in-flight events are
  // flushed, and collect the accumulated log buffers.
  cancel.store(true, Ordering::Relaxed);
  let (stdout_result, stderr_result, _) =
    tokio::join!(stdout_task, stderr_task, memory_monitor);

  let status = status_result?;

  // ── Build persisted output from accumulated buffers ───────────────────────
  let stdout_entries = stdout_result.unwrap_or_default();
  let stderr_entries = stderr_result.unwrap_or_default();

  let stdout = build_output_string(&stdout_entries, "log");
  let stderr = build_output_string(&stderr_entries, "error");

  // Merge and sort by timestamp so the replay log reflects true chronological
  // order rather than all-stdout-then-all-stderr.
  let mut logs = stdout_entries;
  logs.extend(stderr_entries);
  logs.sort_by_key(|e| e.timestamp);

  Ok(ChildProcessResult {
    stdout,
    stderr,
    exit_code: status.code(),
    memory_bytes: peak_memory.load(Ordering::Relaxed),
    cpu_ms: start.elapsed().as_millis() as u64,
    logs,
  })
}
