//! Context budget configuration for the Perceive phase.
//!
//! [`ContextBudget`] controls how much context an agent receives —
//! limiting both token count and experience count to keep within
//! LLM context window limits.

use crate::lens::Lens;

/// Budget constraints for context assembly.
///
/// Controls how many experiences and tokens are included in the agent's
/// perceived context. The ContextOptimizer packs experiences greedily
/// within these limits, prioritizing higher-scored items.
#[derive(Debug, Clone)]
pub struct ContextBudget {
    /// Maximum estimated tokens for context (rough: chars/4).
    pub max_tokens: u32,
    /// Maximum number of experiences to include.
    pub max_experiences: usize,
    /// Maximum number of insights to include.
    pub max_insights: usize,
}

impl ContextBudget {
    /// Creates a budget from a Lens, using attention_budget for experience count.
    pub fn from_lens(lens: &Lens) -> Self {
        Self {
            max_tokens: 4096,
            max_experiences: lens.attention_budget,
            max_insights: 10,
        }
    }
}

impl Default for ContextBudget {
    fn default() -> Self {
        Self {
            max_tokens: 4096,
            max_experiences: 50,
            max_insights: 10,
        }
    }
}

/// Estimate the token count for a text string.
///
/// Uses the rough approximation of 1 token ≈ 4 characters for English text.
/// Adds a small overhead for formatting.
pub fn estimate_tokens(text: &str) -> u32 {
    (text.len() as u32) / 4 + 20
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_context_budget_default() {
        let budget = ContextBudget::default();
        assert_eq!(budget.max_tokens, 4096);
        assert_eq!(budget.max_experiences, 50);
        assert_eq!(budget.max_insights, 10);
    }

    #[test]
    fn test_context_budget_from_lens() {
        let lens = Lens {
            attention_budget: 25,
            ..Lens::default()
        };
        let budget = ContextBudget::from_lens(&lens);
        assert_eq!(budget.max_experiences, 25);
    }

    #[test]
    fn test_estimate_tokens() {
        assert_eq!(estimate_tokens(""), 20); // Just overhead
        assert_eq!(estimate_tokens("Hello world"), 22); // 11/4 + 20 = 22
                                                        // 400 chars ≈ 100 tokens + 20 overhead = 120
        let long_text = "a".repeat(400);
        assert_eq!(estimate_tokens(&long_text), 120);
    }
}
