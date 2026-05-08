use crate::runner::RuntimeError;

#[cfg(feature = "wasm-engine")]
use wasmtime::{Config, Engine};

pub struct WasmSandbox {
  #[cfg(feature = "wasm-engine")]
  engine: Engine,
}

impl WasmSandbox {
  pub fn new() -> Result<Self, RuntimeError> {
    #[cfg(feature = "wasm-engine")]
    {
      let mut config = Config::new();
      config.consume_fuel(true);
      let engine = Engine::new(&config).map_err(|error| RuntimeError::Process(error.to_string()))?;
      return Ok(Self { engine });
    }

    #[cfg(not(feature = "wasm-engine"))]
    {
      Ok(Self {})
    }
  }

  pub fn status(&self) -> &'static str {
    #[cfg(feature = "wasm-engine")]
    {
      let _ = &self.engine;
      "enabled"
    }

    #[cfg(not(feature = "wasm-engine"))]
    {
      "disabled"
    }
  }
}
