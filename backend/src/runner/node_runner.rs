use tokio::process::Command;

pub fn build_command(code: &str) -> Command {
  let mut cmd = Command::new("node");
  cmd.args([
    "--no-warnings",
    "--experimental-permission",
    "--input-type=module",
    "--eval",
    code,
  ]);
  cmd.env_clear();
  cmd.kill_on_drop(true);
  cmd
}
