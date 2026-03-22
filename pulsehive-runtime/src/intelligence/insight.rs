//! Automatic insight synthesis from experience clusters.
//!
//! When a cluster of related experiences exceeds the density threshold,
//! the [`InsightSynthesizer`] uses an LLM to generate a consolidated
//! [`DerivedInsight`](pulsedb::DerivedInsight) that captures the key pattern.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

use pulsedb::CollectiveId;

/// Configuration for automatic insight synthesis.
#[derive(Debug, Clone)]
pub struct InsightSynthesizerConfig {
    /// Minimum cluster size to trigger synthesis.
    /// Default: 5
    pub relation_density_threshold: usize,

    /// Minimum seconds between synthesis attempts for the same collective.
    /// Prevents redundant LLM calls when many experiences arrive rapidly.
    /// Default: 60
    pub debounce_seconds: u64,
}

impl Default for InsightSynthesizerConfig {
    fn default() -> Self {
        Self {
            relation_density_threshold: 5,
            debounce_seconds: 60,
        }
    }
}

/// Synthesizes insights from clusters of related experiences using an LLM.
///
/// Created via [`InsightSynthesizer::new()`] with an [`InsightSynthesizerConfig`].
pub struct InsightSynthesizer {
    config: InsightSynthesizerConfig,
    /// Tracks last synthesis time per collective for debouncing.
    last_synthesis: Mutex<HashMap<CollectiveId, Instant>>,
}

impl InsightSynthesizer {
    /// Create a new synthesizer with the given configuration.
    pub fn new(config: InsightSynthesizerConfig) -> Self {
        Self {
            config,
            last_synthesis: Mutex::new(HashMap::new()),
        }
    }

    /// Create a new synthesizer with default configuration.
    pub fn with_defaults() -> Self {
        Self::new(InsightSynthesizerConfig::default())
    }

    /// Access the configuration.
    pub fn config(&self) -> &InsightSynthesizerConfig {
        &self.config
    }

    /// Check if synthesis should be attempted based on cluster size.
    pub fn should_synthesize(&self, cluster_size: usize) -> bool {
        cluster_size >= self.config.relation_density_threshold
    }

    /// Check if a collective is still within the debounce window.
    pub fn is_debounced(&self, collective_id: CollectiveId) -> bool {
        let guard = self.last_synthesis.lock().unwrap();
        if let Some(last) = guard.get(&collective_id) {
            last.elapsed().as_secs() < self.config.debounce_seconds
        } else {
            false
        }
    }

    /// Record that synthesis was performed for a collective (updates debounce timer).
    pub fn mark_synthesized(&self, collective_id: CollectiveId) {
        let mut guard = self.last_synthesis.lock().unwrap();
        guard.insert(collective_id, Instant::now());
    }
}
