use tokio::process::Command;

pub fn build_command(code: &str) -> Command {
  let mut cmd = Command::new("deno");
  cmd.args(["eval", "--allow-none", code]);
  cmd.env_clear();
  cmd.kill_on_drop(true);
  cmd
}
