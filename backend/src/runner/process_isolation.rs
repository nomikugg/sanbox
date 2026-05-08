use crate::runner::{ChildProcessResult, LogEntry};
use crate::security::SecurityLimits;
use std::io::Read;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use sysinfo::{Pid, ProcessRefreshKind, RefreshKind, System};

#[derive(Clone)]
pub struct ExecutionBudget {
  pub timeout: Duration,
  pub memory_bytes: u64,
}

pub struct ProcessIsolation {
  limits: SecurityLimits,
}

impl ProcessIsolation {
  pub fn new(limits: SecurityLimits) -> Self {
    Self { limits }
  }

  pub fn run(&self, mut command: Command, cancel: Arc<AtomicBool>) -> Result<ChildProcessResult, String> {
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|error| error.to_string())?;
    let pid = child.id();
    let start = Instant::now();
    let timeout = self.limits.timeout;
    let memory_limit = self.limits.memory_bytes;
    let memory_exceeded = Arc::new(AtomicBool::new(false));
    let peak_memory = Arc::new(AtomicU64::new(0));

    let monitor_cancel = Arc::clone(&cancel);
    let monitor_memory_exceeded = Arc::clone(&memory_exceeded);
    let monitor_peak_memory = Arc::clone(&peak_memory);
    let monitor = thread::spawn(move || {
      let mut system = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::everything()),
      );
      while !monitor_cancel.load(Ordering::Relaxed) {
        system.refresh_process(Pid::from_u32(pid));
        if let Some(process) = system.process(Pid::from_u32(pid)) {
          // sysinfo returns memory usage in bytes for this version.
          let used_bytes = process.memory();
          monitor_peak_memory.fetch_max(used_bytes, Ordering::Relaxed);

          if used_bytes > memory_limit {
            monitor_memory_exceeded.store(true, Ordering::Relaxed);
            monitor_cancel.store(true, Ordering::Relaxed);
            break;
          }
        }
        thread::sleep(Duration::from_millis(100));
      }
    });

    let status_result = wait_for_child(&mut child, timeout, &cancel, &memory_exceeded);
    cancel.store(true, Ordering::Relaxed);
    let _ = monitor.join();
    let status = status_result?;

    let mut stdout = String::new();
    let mut stderr = String::new();

    if let Some(mut pipe) = child.stdout.take() {
      let _ = pipe.read_to_string(&mut stdout);
    }

    if let Some(mut pipe) = child.stderr.take() {
      let _ = pipe.read_to_string(&mut stderr);
    }

    let logs = collect_logs(&stdout, &stderr);

    Ok(ChildProcessResult {
      stdout: if stdout.trim().is_empty() { None } else { Some(stdout) },
      stderr: if stderr.trim().is_empty() { None } else { Some(stderr) },
      exit_code: status.code(),
      memory_bytes: peak_memory.load(Ordering::Relaxed),
      cpu_ms: start.elapsed().as_millis() as u64,
      logs,
    })
  }
}

fn wait_for_child(
  child: &mut Child,
  timeout: Duration,
  cancel: &AtomicBool,
  memory_exceeded: &AtomicBool,
) -> Result<std::process::ExitStatus, String> {
  let deadline = Instant::now() + timeout;
  loop {
    if cancel.load(Ordering::Relaxed) {
      let _ = child.kill();
      if memory_exceeded.load(Ordering::Relaxed) {
        return Err("execution exceeded memory limit".into());
      }
      return Err("execution stopped by user".into());
    }

    match child.try_wait() {
      Ok(Some(status)) => return Ok(status),
      Ok(None) => {
        if Instant::now() >= deadline {
          let _ = child.kill();
          return Err("execution timed out".into());
        }
        thread::sleep(Duration::from_millis(25));
      }
      Err(error) => {
        let _ = child.kill();
        return Err(error.to_string());
      }
    }
  }
}

fn collect_logs(stdout: &str, stderr: &str) -> Vec<LogEntry> {
  let mut logs = Vec::new();
  for line in stdout.lines() {
    if !line.trim().is_empty() {
      logs.push(LogEntry { kind: "log".into(), message: line.to_string() });
    }
  }
  for line in stderr.lines() {
    if !line.trim().is_empty() {
      logs.push(LogEntry { kind: "error".into(), message: line.to_string() });
    }
  }
  logs
}

