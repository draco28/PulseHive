//! TypeScript/Node.js bindings for PulseHive — shared consciousness SDK for multi-agent AI systems.
//!
//! This crate provides napi-rs-based Node.js bindings for the core PulseHive types,
//! enabling TypeScript/JavaScript developers to build multi-agent AI systems with Rust performance.

#[cfg(feature = "napi")]
#[macro_use]
extern crate napi_derive;

pub mod agents;
pub mod events;
pub mod hivemind;
pub mod stream;
pub mod tool;
pub mod types;

/// Returns the PulseHive SDK version.
#[cfg(feature = "napi")]
#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
