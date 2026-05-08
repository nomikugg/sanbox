use crate::security::SecurityMode;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct SecurityLimits {
  pub timeout: Duration,
  pub memory_bytes: u64,
  pub cpu_ms: u64,
  pub max_output_bytes: usize,
}

impl SecurityLimits {
  pub fn for_mode(mode: SecurityMode) -> Self {
    match mode {
      SecurityMode::Strict => Self {
        timeout: Duration::from_secs(5),
        memory_bytes: 128 * 1024 * 1024,
        cpu_ms: 5_000,
        max_output_bytes: 64 * 1024,
      },
      SecurityMode::Balanced => Self {
        timeout: Duration::from_secs(8),
        memory_bytes: 256 * 1024 * 1024,
        cpu_ms: 8_000,
        max_output_bytes: 128 * 1024,
      },
      SecurityMode::Debug => Self {
        timeout: Duration::from_secs(20),
        memory_bytes: 512 * 1024 * 1024,
        cpu_ms: 20_000,
        max_output_bytes: 256 * 1024,
      },
    }
  }
}
