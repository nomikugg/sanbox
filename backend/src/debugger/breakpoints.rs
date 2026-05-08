use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Breakpoint {
  pub file_path: String,
  pub line: u32,
  pub column: u32,
  pub enabled: bool,
}

impl Breakpoint {
  pub fn new(file_path: impl Into<String>, line: u32, column: u32) -> Self {
    Self {
      file_path: file_path.into(),
      line,
      column,
      enabled: true,
    }
  }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BreakpointSet {
  pub items: Vec<Breakpoint>,
}

impl BreakpointSet {
  pub fn toggle(&mut self, breakpoint: Breakpoint) {
    if let Some(existing) = self
      .items
      .iter_mut()
      .find(|item| item.file_path == breakpoint.file_path && item.line == breakpoint.line && item.column == breakpoint.column)
    {
      existing.enabled = !existing.enabled;
      return;
    }

    self.items.push(breakpoint);
  }
}
