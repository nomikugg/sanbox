pub fn format_stack_trace(stack: &str) -> String {
  stack
    .lines()
    .map(|line| line.trim_end())
    .collect::<Vec<_>>()
    .join("\n")
}
