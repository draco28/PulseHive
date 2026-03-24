//! Async event stream — wraps Rust's `Stream<Item = HiveEvent>` for JS consumption.
//!
//! Provides `next()` → `Promise<HiveEvent | null>` for async iteration.
//! A TypeScript wrapper adds `Symbol.asyncIterator` support for `for await` syntax.

#[cfg(feature = "napi")]
use std::pin::Pin;
#[cfg(feature = "napi")]
use std::sync::Arc;

#[cfg(feature = "napi")]
use futures::StreamExt;
#[cfg(feature = "napi")]
use napi_derive::napi;
#[cfg(feature = "napi")]
use tokio::sync::Mutex;

#[cfg(feature = "napi")]
use pulsehive_core::event::HiveEvent;

#[cfg(feature = "napi")]
use crate::events::JsHiveEvent;

/// Async event stream — yields HiveEvent objects.
///
/// Obtained from `await hive.deploy(agents, tasks)`.
///
/// Use `next()` to get the next event (returns `null` when stream ends):
/// ```typescript
/// let event = await stream.next();
/// while (event !== null) {
///     console.log(event.eventType, event.data);
///     event = await stream.next();
/// }
/// ```
#[cfg(feature = "napi")]
#[napi(js_name = "EventStream")]
pub struct JsEventStream {
    pub(crate) stream: Arc<Mutex<Pin<Box<dyn futures::Stream<Item = HiveEvent> + Send>>>>,
}

#[cfg(feature = "napi")]
#[napi]
impl JsEventStream {
    /// Get the next event from the stream.
    /// Returns `null` when the stream is exhausted (all agents completed).
    #[napi]
    pub async fn next(&self) -> napi::Result<Option<JsHiveEvent>> {
        let mut guard = self.stream.lock().await;
        match guard.next().await {
            Some(event) => Ok(Some(JsHiveEvent::from(event))),
            None => Ok(None),
        }
    }

    /// String representation for debugging.
    #[napi(js_name = "toString")]
    pub fn to_string_js(&self) -> String {
        "EventStream(active)".to_string()
    }
}
