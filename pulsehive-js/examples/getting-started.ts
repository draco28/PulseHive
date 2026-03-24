/**
 * PulseHive Getting Started — Deploy a single LLM agent.
 *
 * This example demonstrates:
 * 1. Building a HiveMind with substrate and LLM provider
 * 2. Defining an agent with a Lens and LlmConfig
 * 3. Deploying the agent and consuming the async event stream
 *
 * Prerequisites:
 *   npm install @pulsehive/sdk
 *   export OPENAI_API_KEY="sk-..."   # or use anthropicProvider
 *
 * Usage:
 *   npx tsx examples/getting-started.ts
 */

const {
  HiveMind,
  Task,
  JsAgentKind: AgentKind,
  JsAgentDefinition: AgentDefinition,
  JsLens: Lens,
  JsLlmConfig: LlmConfig,
  openaiProvider,
} = require("../wrapper.js");

async function main() {
  // 1. Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  if (!apiKey) {
    console.log("Set OPENAI_API_KEY environment variable to run this example.");
    console.log("Running with empty key (agent will error, but pipeline works).");
  }

  // 2. Build HiveMind — the orchestrator
  const hive = HiveMind.builder()
    .substratePath("/tmp/pulsehive_getting_started.db")
    .llmProvider("openai", openaiProvider(apiKey, "gpt-4"))
    .build();

  // 3. Define perception lens — what the agent pays attention to
  const lens = new Lens(
    ["code", "architecture"], // Domain focus
    50,                       // Max experiences per cycle
  );

  // 4. Configure LLM selection
  const config = new LlmConfig("openai", "gpt-4", 0.7, 2048);

  // 5. Create an LLM agent
  const kind = AgentKind.llm(
    "You are a helpful code analysis assistant. Analyze code structure and suggest improvements.",
    lens,
    config,
  );
  const agent = new AgentDefinition("code-analyzer", kind);

  // 6. Deploy and consume events using for-await
  console.log(`Deploying agent '${agent.name}'...`);
  const stream = await hive.deploy([agent], [new Task("Analyze the project structure")]);

  for await (const event of stream) {
    console.log(`  [${event.eventType}] ${formatEvent(event)}`);
    if (event.eventType === "agent_completed") {
      const data = event.data;
      if (data.outcome === "complete") {
        console.log(`\nAgent response:\n${(data.response ?? "").slice(0, 500)}`);
      } else {
        console.log(`\nAgent finished with: ${data.outcome ?? "unknown"}`);
      }
      break;
    }
  }

  // 7. Cleanup
  hive.shutdown();
  console.log("\nDone!");
}

function formatEvent(event: any): string {
  const data = event.data;
  switch (event.eventType) {
    case "agent_started":
      return `Agent '${data.name}' started`;
    case "llm_call_started":
      return `Calling ${data.model} (${data.messageCount} messages)`;
    case "llm_call_completed":
      return `LLM responded in ${data.durationMs}ms`;
    case "agent_completed":
      return `Agent completed: ${data.outcome}`;
    default:
      return event.eventType;
  }
}

main().catch(console.error);
