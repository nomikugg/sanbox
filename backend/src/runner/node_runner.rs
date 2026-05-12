use std::path::Path;
use tokio::process::Command;

pub fn build_command(path: &Path) -> Command {
  let mut cmd = Command::new("node");
  cmd.arg("--no-warnings");
  cmd.arg("--experimental-permission");
  cmd.arg(path);
  cmd.env_clear();
  cmd.kill_on_drop(true);
  cmd
}
