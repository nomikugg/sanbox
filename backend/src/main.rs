#![deny(clippy::unwrap_used, clippy::todo, unsafe_code)]
#![allow(dead_code)]

mod debugger;
mod ipc;
mod plugins;
mod runner;
mod security;
mod utils;

fn main() {
  tauri::Builder::default()
    .manage(ipc::commands::AppState::new())
    .invoke_handler(tauri::generate_handler![
      ipc::commands::execute_code,
      ipc::commands::debug_code,
      ipc::commands::stop_execution,
    ])
    .run(tauri::generate_context!())
    .expect("failed to launch RunJS Pro");
}
