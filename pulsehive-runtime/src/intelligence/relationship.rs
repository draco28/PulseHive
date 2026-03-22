//! Automatic relationship inference between experiences.
//!
//! When a new experience is recorded, the [`RelationshipDetector`] searches for
//! semantically similar experiences and creates typed relations based on
//! ExperienceType pair heuristics (e.g., Difficulty + Solution → Supports).

/// Configuration for automatic relationship detection.
#[derive(Debug, Clone)]
pub struct RelationshipDetectorConfig {
    /// Similarity threshold for automatic relation creation.
    /// Pairs above this threshold get relations created automatically.
    /// Default: 0.85
    pub auto_threshold: f32,

    /// Lower bound for suggested relations (used with LLM classification).
    /// Pairs between suggest_threshold and auto_threshold may be classified by LLM.
    /// Default: 0.65
    pub suggest_threshold: f32,

    /// Whether to use LLM classification for pairs in the suggest range.
    /// Default: false
    pub use_llm_classification: bool,
}

impl Default for RelationshipDetectorConfig {
    fn default() -> Self {
        Self {
            auto_threshold: 0.85,
            suggest_threshold: 0.65,
            use_llm_classification: false,
        }
    }
}

/// Detects relationships between experiences based on semantic similarity
/// and ExperienceType heuristics.
///
/// Created via [`RelationshipDetector::new()`] with a [`RelationshipDetectorConfig`].
pub struct RelationshipDetector {
    config: RelationshipDetectorConfig,
}

impl RelationshipDetector {
    /// Create a new detector with the given configuration.
    pub fn new(config: RelationshipDetectorConfig) -> Self {
        Self { config }
    }

    /// Create a new detector with default configuration.
    pub fn with_defaults() -> Self {
        Self::new(RelationshipDetectorConfig::default())
    }

    /// Access the configuration.
    pub fn config(&self) -> &RelationshipDetectorConfig {
        &self.config
    }
}
