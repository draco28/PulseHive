//! HiveMind, HiveMindBuilder, Task, and LLM provider factories.

#[cfg(feature = "napi")]
use std::sync::Arc;

#[cfg(feature = "napi")]
use napi_derive::napi;
#[cfg(feature = "napi")]
use tokio::sync::Mutex;

#[cfg(feature = "napi")]
use pulsehive_core::llm::LlmProvider;
#[cfg(feature = "napi")]
use pulsehive_runtime::hivemind::{HiveMind, Task};

#[cfg(feature = "napi")]
use crate::agents::JsAgentDefinition;
#[cfg(feature = "napi")]
use crate::stream::JsEventStream;

// ── LLM Provider Proxy ───────────────────────────────────────────────

/// Opaque LLM provider — holds an Arc<dyn LlmProvider> internally.
///
/// Created via factory functions: `openaiProvider()`, `anthropicProvider()`.
/// Passed to `HiveMind.builder().llmProvider(name, provider)`.
#[cfg(feature = "napi")]
#[napi(js_name = "LlmProviderProxy")]
pub struct JsLlmProviderProxy {
    pub(crate) inner: Arc<dyn LlmProvider>,
    name: String,
}

#[cfg(feature = "napi")]
#[napi]
impl JsLlmProviderProxy {
    /// String representation for debugging.
    #[napi(js_name = "toString")]
    pub fn to_string_js(&self) -> String {
        format!("LlmProviderProxy('{}')", self.name)
    }
}

/// Create an OpenAI-compatible LLM provider.
///
/// Works with OpenAI, Azure OpenAI, GLM, vLLM, Ollama, and other
/// OpenAI-compatible APIs.
///
/// @param apiKey - API key for authentication
/// @param model - Default model name (e.g., "gpt-4"). Default: "gpt-4"
/// @param baseUrl - Override base URL (default: https://api.openai.com/v1)
#[cfg(feature = "napi")]
#[napi(js_name = "openaiProvider")]
pub fn openai_provider(
    api_key: String,
    model: Option<String>,
    base_url: Option<String>,
) -> JsLlmProviderProxy {
    let model = model.unwrap_or_else(|| "gpt-4".to_string());
    let mut config = pulsehive_openai::OpenAIConfig::new(&api_key, &model);
    if let Some(url) = base_url {
        config = config.with_base_url(&url);
    }
    let provider = pulsehive_openai::OpenAICompatibleProvider::new(config);
    JsLlmProviderProxy {
        inner: Arc::new(provider),
        name: "openai".into(),
    }
}

/// Create an Anthropic Claude LLM provider.
///
/// @param apiKey - Anthropic API key
#[cfg(feature = "napi")]
#[napi(js_name = "anthropicProvider")]
pub fn anthropic_provider(api_key: String) -> JsLlmProviderProxy {
    let provider = pulsehive_anthropic::AnthropicProvider::new(&api_key);
    JsLlmProviderProxy {
        inner: Arc::new(provider),
        name: "anthropic".into(),
    }
}

// ── Task ─────────────────────────────────────────────────────────────

/// A task to be executed by deployed agents.
#[cfg(feature = "napi")]
#[napi(js_name = "Task")]
pub struct JsTask {
    pub(crate) inner: Task,
}

#[cfg(feature = "napi")]
#[napi]
impl JsTask {
    /// Create a new Task.
    ///
    /// @param description - Human-readable description of what to accomplish
    #[napi(constructor)]
    pub fn new(description: String) -> Self {
        Self {
            inner: Task::new(description),
        }
    }

    /// Task description.
    #[napi(getter)]
    pub fn description(&self) -> String {
        self.inner.description.clone()
    }

    /// String representation for debugging.
    #[napi(js_name = "toString")]
    pub fn to_string_js(&self) -> String {
        format!("Task('{}')", self.inner.description)
    }
}

// ── HiveMind ────────────────────────────────────────────────────────

/// The central orchestrator of PulseHive.
///
/// Owns the substrate, LLM providers, and event bus. Create via builder pattern:
/// ```typescript
/// const hive = HiveMind.builder()
///     .substratePath("/tmp/my_project.db")
///     .llmProvider("openai", openaiProvider("sk-..."))
///     .build();
/// ```
#[cfg(feature = "napi")]
#[napi(js_name = "HiveMind")]
pub struct JsHiveMind {
    inner: Arc<HiveMind>,
}

#[cfg(feature = "napi")]
#[napi]
impl JsHiveMind {
    /// Create a new builder for constructing a HiveMind.
    #[napi(factory)]
    pub fn builder() -> JsHiveMindBuilder {
        JsHiveMindBuilder {
            substrate_path: None,
            providers: Vec::new(),
        }
    }

    /// Deploy agents to execute tasks. Returns an async event stream.
    ///
    /// @param agents - Array of AgentDefinition objects
    /// @param tasks - Array of Task objects
    /// @returns Promise<EventStream>
    #[napi]
    pub async fn deploy(
        &self,
        agents: Vec<&JsAgentDefinition>,
        tasks: Vec<&JsTask>,
    ) -> napi::Result<JsEventStream> {
        let rust_agents = agents.iter().map(|a| a.inner.clone()).collect();
        let rust_tasks = tasks.iter().map(|t| t.inner.clone()).collect();
        let hive = Arc::clone(&self.inner);

        let stream = hive
            .deploy(rust_agents, rust_tasks)
            .await
            .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))?;

        Ok(JsEventStream {
            stream: Arc::new(Mutex::new(stream)),
        })
    }

    /// Signal shutdown to all background tasks.
    #[napi]
    pub fn shutdown(&self) {
        self.inner.shutdown();
    }

    /// Returns true if shutdown has been signaled.
    #[napi(getter, js_name = "isShutdown")]
    pub fn is_shutdown(&self) -> bool {
        self.inner.is_shutdown()
    }

    /// String representation for debugging.
    #[napi(js_name = "toString")]
    pub fn to_string_js(&self) -> String {
        "HiveMind(active)".to_string()
    }
}

// ── HiveMindBuilder ──────────────────────────────────────────────────

/// Builder for constructing a HiveMind with validated configuration.
///
/// Methods return `this` for chaining:
/// ```typescript
/// const hive = HiveMind.builder()
///     .substratePath("/tmp/test.db")
///     .llmProvider("openai", openaiProvider("sk-..."))
///     .build();
/// ```
#[cfg(feature = "napi")]
#[napi(js_name = "HiveMindBuilder")]
pub struct JsHiveMindBuilder {
    substrate_path: Option<String>,
    providers: Vec<(String, Arc<dyn LlmProvider>)>,
}

#[cfg(feature = "napi")]
#[napi]
impl JsHiveMindBuilder {
    /// Set the PulseDB substrate file path.
    #[napi(js_name = "substratePath")]
    pub fn substrate_path(&mut self, path: String) -> &Self {
        self.substrate_path = Some(path);
        self
    }

    /// Register a named LLM provider.
    ///
    /// @param name - Provider name (e.g., "openai", "anthropic")
    /// @param provider - Provider created via openaiProvider() or anthropicProvider()
    #[napi(js_name = "llmProvider")]
    pub fn llm_provider(&mut self, name: String, provider: &JsLlmProviderProxy) -> &Self {
        self.providers.push((name, Arc::clone(&provider.inner)));
        self
    }

    /// Build the HiveMind. Throws if substrate is not configured.
    #[napi]
    pub fn build(&self) -> napi::Result<JsHiveMind> {
        let Some(path) = &self.substrate_path else {
            return Err(napi::Error::new(
                napi::Status::InvalidArg,
                "Substrate not configured. Call .substratePath() before .build()",
            ));
        };

        let mut builder = HiveMind::builder().substrate_path(path);
        for (name, provider) in &self.providers {
            builder = builder.llm_provider(name, ArcProvider(Arc::clone(provider)));
        }

        match builder.build() {
            Ok(hive) => Ok(JsHiveMind {
                inner: Arc::new(hive),
            }),
            Err(e) => Err(napi::Error::new(
                napi::Status::GenericFailure,
                e.to_string(),
            )),
        }
    }

    /// String representation for debugging.
    #[napi(js_name = "toString")]
    pub fn to_string_js(&self) -> String {
        format!(
            "HiveMindBuilder(substrate={:?}, providers={})",
            self.substrate_path,
            self.providers.len()
        )
    }
}

/// Newtype wrapper to pass Arc<dyn LlmProvider> to builder.llm_provider()
/// which expects `impl LlmProvider + 'static`.
#[cfg(feature = "napi")]
struct ArcProvider(Arc<dyn LlmProvider>);

#[cfg(feature = "napi")]
#[async_trait::async_trait]
impl LlmProvider for ArcProvider {
    async fn chat(
        &self,
        messages: Vec<pulsehive_core::llm::Message>,
        tools: Vec<pulsehive_core::llm::ToolDefinition>,
        config: &pulsehive_core::llm::LlmConfig,
    ) -> pulsehive_core::error::Result<pulsehive_core::llm::LlmResponse> {
        self.0.chat(messages, tools, config).await
    }

    async fn chat_stream(
        &self,
        messages: Vec<pulsehive_core::llm::Message>,
        tools: Vec<pulsehive_core::llm::ToolDefinition>,
        config: &pulsehive_core::llm::LlmConfig,
    ) -> pulsehive_core::error::Result<
        std::pin::Pin<
            Box<
                dyn futures_core::Stream<
                        Item = pulsehive_core::error::Result<pulsehive_core::llm::LlmChunk>,
                    > + Send,
            >,
        >,
    > {
        self.0.chat_stream(messages, tools, config).await
    }
}
