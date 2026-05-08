use crate::runner::{RuntimeError, RuntimeKind};
use crate::security::{PermissionPolicy, SecurityMode};

pub struct Sandbox;

impl Sandbox {
  pub fn new() -> Self {
    Self
  }

  pub fn validate(
    &self,
    code: &str,
    runtime: RuntimeKind,
    mode: SecurityMode,
    permissions: &PermissionPolicy,
  ) -> Result<(), RuntimeError> {
    crate::security::validator::validate_source(code, runtime, mode, permissions)
      .map_err(RuntimeError::Validation)
  }
}
