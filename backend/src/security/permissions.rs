use crate::security::SecurityMode;

#[derive(Debug, Clone)]
pub struct PermissionPolicy {
  pub filesystem: bool,
  pub network: bool,
  pub environment: bool,
  pub child_process: bool,
}

impl PermissionPolicy {
  pub fn strict() -> Self {
    Self {
      filesystem: false,
      network: false,
      environment: false,
      child_process: false,
    }
  }

  pub fn balanced() -> Self {
    Self {
      filesystem: false,
      network: false,
      environment: false,
      child_process: false,
    }
  }

  pub fn debug() -> Self {
    Self {
      filesystem: false,
      network: false,
      environment: false,
      child_process: false,
    }
  }

  pub fn for_mode(mode: SecurityMode) -> Self {
    match mode {
      SecurityMode::Strict => Self::strict(),
      SecurityMode::Balanced => Self::balanced(),
      SecurityMode::Debug => Self::debug(),
    }
  }
}
