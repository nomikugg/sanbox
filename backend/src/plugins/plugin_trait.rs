pub trait Plugin: Send + Sync {
  fn name(&self) -> &str;
  fn execute(&self, input: &str) -> String;
}
