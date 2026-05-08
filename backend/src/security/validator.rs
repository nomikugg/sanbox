use crate::runner::RuntimeKind;
use crate::security::{PermissionPolicy, SecurityMode};
use regex::Regex;

pub fn validate_source(
  source: &str,
  runtime: RuntimeKind,
  mode: SecurityMode,
  permissions: &PermissionPolicy,
) -> Result<(), String> {
  let deny_patterns = [
    (Regex::new(r"(?i)\bchild_process\b").unwrap(), permissions.child_process),
    (Regex::new(r"(?i)\bprocess\.env\b").unwrap(), permissions.environment),
    (Regex::new(r"(?i)\bdeno\.env\b").unwrap(), permissions.environment),
    (Regex::new(r"(?i)\bDeno\.(read|write|remove|mkdir|copy|chmod|chown|symlink)").unwrap(), permissions.filesystem),
    (Regex::new(r"(?i)\bfetch\s*\(").unwrap(), permissions.network),
    (Regex::new(r"(?i)\bWebSocket\b").unwrap(), permissions.network),
    (Regex::new(r#"(?i)\brequire\s*\(\s*['"]fs['"]\s*\)"#).unwrap(), permissions.filesystem),
    (Regex::new(r#"(?i)\brequire\s*\(\s*['"]net['"]\s*\)"#).unwrap(), permissions.network),
  ];

  for (pattern, allowed) in deny_patterns {
    if pattern.is_match(source) && !allowed {
      return Err(format!("blocked by security policy: {pattern}"));
    }
  }

  if matches!(mode, SecurityMode::Strict) {
    let strict_patterns = [
      Regex::new(r"(?i)\beval\s*\(").unwrap(),
      Regex::new(r"(?i)\bFunction\s*\(").unwrap(),
      Regex::new(r"(?i)import\s*\(").unwrap(),
      Regex::new(r"(?i)\bDeno\.run\b").unwrap(),
      Regex::new(r"(?i)\bBun\.spawn\b").unwrap(),
    ];

    for pattern in strict_patterns {
      if pattern.is_match(source) {
        return Err(format!("strict mode rejected unsafe construct: {pattern}"));
      }
    }
  }

  if matches!(runtime, RuntimeKind::Bun) {
    return Err("Bun runtime is scaffolded but not enabled in the production build".into());
  }

  Ok(())
}
