use std::path::Path;
use tokio::process::Command;

pub fn build_command(path: &Path, use_permission: bool) -> Command {
  let mut cmd = Command::new("node");
  cmd.arg("--no-warnings");
  // --experimental-permission was added in Node 20.0.0. On older versions the
  // flag is unrecognised and Node exits immediately, so it is only passed when
  // the version check at startup confirmed Node >= 20.
  if use_permission {
    cmd.arg("--experimental-permission");
  }
  cmd.arg(path);
  cmd.env_clear();
  cmd.kill_on_drop(true);
  cmd
}
