//! Automatic relationship inference between experiences.
//!
//! When a new experience is recorded, the [`RelationshipDetector`] searches for
//! semantically similar experiences and creates typed relations based on
//! ExperienceType pair heuristics (e.g., Difficulty + Solution → Supports).

use pulsedb::{Experience, NewExperienceRelation, RelationType, SubstrateProvider};

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

    /// Find semantically similar experiences and create relations for high-similarity pairs.
    ///
    /// Searches for the top 20 similar experiences in the same collective. For each pair
    /// with similarity above `auto_threshold`, creates a [`NewExperienceRelation`] with
    /// the similarity score as strength.
    ///
    /// Returns the relations to be stored — the caller is responsible for calling
    /// `substrate.store_relation()` and emitting events.
    pub async fn infer_relations(
        &self,
        experience: &Experience,
        substrate: &dyn SubstrateProvider,
    ) -> Vec<NewExperienceRelation> {
        // Search for top-20 similar experiences
        let similar = match substrate
            .search_similar(experience.collective_id, &experience.embedding, 20)
            .await
        {
            Ok(results) => results,
            Err(e) => {
                tracing::warn!(error = %e, "RelationshipDetector: search_similar failed");
                return Vec::new();
            }
        };

        similar
            .into_iter()
            .filter(|(target, similarity)| {
                // Exclude self-matches and below-threshold pairs
                target.id != experience.id && *similarity >= self.config.auto_threshold
            })
            .map(|(target, similarity)| {
                let relation_type = classify_relation_type(
                    &experience.experience_type,
                    &target.experience_type,
                );

                NewExperienceRelation {
                    source_id: experience.id,
                    target_id: target.id,
                    relation_type,
                    strength: similarity,
                    metadata: None,
                }
            })
            .collect()
    }
}

/// Classify the relation type based on ExperienceType pair heuristics.
///
/// Rules (from SRS FR-018):
/// - Difficulty + Solution → Supports
/// - ErrorPattern + ErrorPattern → Supersedes
/// - ArchitecturalDecision + TechInsight → Implies
/// - Default → RelatedTo
fn classify_relation_type(
    source: &pulsedb::ExperienceType,
    target: &pulsedb::ExperienceType,
) -> RelationType {
    use pulsedb::ExperienceType;

    match (source, target) {
        (ExperienceType::Difficulty { .. }, ExperienceType::Solution { .. })
        | (ExperienceType::Solution { .. }, ExperienceType::Difficulty { .. }) => {
            RelationType::Supports
        }
        (ExperienceType::ErrorPattern { .. }, ExperienceType::ErrorPattern { .. }) => {
            RelationType::Supersedes
        }
        (ExperienceType::ArchitecturalDecision { .. }, ExperienceType::TechInsight { .. })
        | (ExperienceType::TechInsight { .. }, ExperienceType::ArchitecturalDecision { .. }) => {
            RelationType::Implies
        }
        _ => RelationType::RelatedTo,
    }
}
