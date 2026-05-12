use std::path::Path;
use tokio::process::Command;

pub fn build_command(path: &Path) -> Command {
  let mut cmd = Command::new("deno");
  cmd.arg("run");
  cmd.arg("--allow-none");
  cmd.arg(path);
  cmd.env_clear();
  cmd.kill_on_drop(true);
  cmd
}
