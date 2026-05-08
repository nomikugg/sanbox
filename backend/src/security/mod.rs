pub mod limits;
pub mod permissions;
pub mod validator;

pub use limits::SecurityLimits;
pub use permissions::PermissionPolicy;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SecurityMode {
  Strict,
  Balanced,
  Debug,
}
