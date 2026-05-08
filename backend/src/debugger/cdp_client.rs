use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};
use url::Url;

#[derive(Debug)]
pub struct CdpClient {
  socket: WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
  next_id: u64,
}

impl CdpClient {
  pub async fn connect(endpoint: &str) -> Result<Self, String> {
    let _ = Url::parse(endpoint).map_err(|error| error.to_string())?;
    let (socket, _) = connect_async(endpoint).await.map_err(|error| error.to_string())?;
    Ok(Self { socket, next_id: 1 })
  }

  pub async fn call(&mut self, method: &str, params: Value) -> Result<Value, String> {
    let id = self.next_id;
    self.next_id += 1;

    let message = json!({
      "id": id,
      "method": method,
      "params": params,
    });

    self
      .socket
      .send(Message::Text(message.to_string()))
      .await
      .map_err(|error| error.to_string())?;

    while let Some(message) = self.socket.next().await {
      match message.map_err(|error| error.to_string())? {
        Message::Text(payload) => {
          let value: Value = serde_json::from_str(&payload).map_err(|error| error.to_string())?;
          if value.get("id").and_then(|item| item.as_u64()) == Some(id) {
            return Ok(value);
          }
        }
        Message::Binary(_) | Message::Ping(_) | Message::Pong(_) => continue,
        Message::Close(_) => return Err("CDP socket closed unexpectedly".into()),
        Message::Frame(_) => continue,
      }
    }

    Err("CDP response stream ended".into())
  }

  pub async fn set_breakpoint(&mut self, file_path: &str, line: u32) -> Result<Value, String> {
    self.call(
      "Debugger.setBreakpointByUrl",
      json!({
        "url": file_path,
        "lineNumber": line.saturating_sub(1),
      }),
    )
    .await
  }

  pub async fn step_over(&mut self) -> Result<Value, String> {
    self.call("Debugger.stepOver", json!({})).await
  }

  pub async fn step_into(&mut self) -> Result<Value, String> {
    self.call("Debugger.stepInto", json!({})).await
  }

  pub async fn evaluate(&mut self, expression: &str) -> Result<Value, String> {
    self.call(
      "Runtime.evaluate",
      json!({
        "expression": expression,
        "returnByValue": true,
      }),
    )
    .await
  }
}
