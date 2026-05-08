use crate::plugins::plugin_trait::Plugin;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
  pub name: String,
  pub command: String,
  pub args: Vec<String>,
  pub enabled: bool,
}

pub struct LoadedPlugin {
  manifest: PluginManifest,
}

impl Plugin for LoadedPlugin {
  fn name(&self) -> &str {
    &self.manifest.name
  }

  fn execute(&self, input: &str) -> String {
    let mut command = Command::new(&self.manifest.command);
    command.args(&self.manifest.args);
    command.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());

    match command.spawn() {
      Ok(mut child) => {
        if let Some(mut stdin) = child.stdin.take() {
          let _ = std::io::Write::write_all(&mut stdin, input.as_bytes());
        }

        match child.wait_with_output() {
          Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
          Err(error) => error.to_string(),
        }
      }
      Err(error) => error.to_string(),
    }
  }
}

#[derive(Clone, Default)]
pub struct PluginLoader {
  pub manifests: Vec<PluginManifest>,
}

impl PluginLoader {
  pub fn discover_default() -> Self {
    let root = PathBuf::from("plugins");
    let manifests = discover_manifests(&root);
    Self { manifests }
  }

  pub fn load_plugins(&self) -> Vec<Box<dyn Plugin>> {
    self.manifests
      .iter()
      .filter(|manifest| manifest.enabled)
      .cloned()
      .map(|manifest| Box::new(LoadedPlugin { manifest }) as Box<dyn Plugin>)
      .collect()
  }
}

fn discover_manifests(root: &Path) -> Vec<PluginManifest> {
  let mut manifests = Vec::new();

  if let Ok(entries) = fs::read_dir(root) {
    for entry in entries.flatten() {
      let path = entry.path();
      if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
        continue;
      }

      if let Ok(text) = fs::read_to_string(&path) {
        if let Ok(manifest) = serde_json::from_str::<PluginManifest>(&text) {
          manifests.push(manifest);
        }
      }
    }
  }

  manifests
}
