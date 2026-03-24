/**
 * PulseHive Custom Tools — Define tools using defineTool().
 *
 * This example demonstrates:
 * 1. Defining tools with the typed defineTool() helper
 * 2. The ToolConfig interface: name, description, parameters, execute
 * 3. Context access (agentId, collectiveId) in execute callbacks
 * 4. Returning objects (auto-serialized to JSON)
 * 5. The requiresApproval flag
 *
 * Prerequisites:
 *   npm install @pulsehive/sdk
 *   export OPENAI_API_KEY="sk-..."
 *
 * Usage:
 *   npx tsx examples/custom-tools.ts
 */

const {
  HiveMind,
  Task,
  JsAgentKind: AgentKind,
  JsAgentDefinition: AgentDefinition,
  JsLens: Lens,
  JsLlmConfig: LlmConfig,
  openaiProvider,
  defineTool,
} = require("../wrapper.js");

// ── Tool 1: Calculator ────────────────────────────────────────────────

const calculator = defineTool({
  name: "calculator",
  description: "Performs basic arithmetic operations: add, subtract, multiply, divide",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
        description: "The arithmetic operation to perform",
      },
      a: { type: "number", description: "First operand" },
      b: { type: "number", description: "Second operand" },
    },
    required: ["operation", "a", "b"],
  },
  execute: async (params, context) => {
    const { operation, a, b } = params as { operation: string; a: number; b: number };
    console.log(`    [Calculator] ${a} ${operation} ${b} (agent: ${context.agentId.slice(0, 8)})`);

    switch (operation) {
      case "add": return String(a + b);
      case "subtract": return String(a - b);
      case "multiply": return String(a * b);
      case "divide": return b === 0 ? "Error: division by zero" : String(a / b);
      default: return `Error: unknown operation '${operation}'`;
    }
  },
});

// ── Tool 2: Word Counter ─────────────────────────────────────────────
// Returns an object (auto-serialized to JSON)

const wordCounter = defineTool({
  name: "word_counter",
  description: "Analyzes text and returns word count, character count, and sentence count",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "The text to analyze" },
    },
    required: ["text"],
  },
  execute: async (params) => {
    const text = params.text as string;
    return {
      words: text.split(/\s+/).filter(Boolean).length,
      characters: text.length,
      sentences: (text.match(/[.!?]/g) || []).length,
    };
  },
});

// ── Tool 3: Approval-Required Tool ───────────────────────────────────

const databaseWrite = defineTool({
  name: "database_write",
  description: "Writes data to the database (requires approval)",
  parameters: {
    type: "object",
    properties: {
      table: { type: "string" },
      data: { type: "object" },
    },
    required: ["table", "data"],
  },
  requiresApproval: true,
  execute: async (params) => {
    return `Wrote to ${params.table}: ${JSON.stringify(params.data ?? {})}`;
  },
});

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  if (!apiKey) {
    console.log("Set OPENAI_API_KEY to run with a real LLM.");
    console.log("Running with empty key (agent will error, but tools are registered).\n");
  }

  const hive = HiveMind.builder()
    .substratePath("/tmp/pulsehive_tools.db")
    .llmProvider("openai", openaiProvider(apiKey, "gpt-4"))
    .build();

  // Create agent with all three tools
  const agent = new AgentDefinition(
    "tool-user",
    AgentKind.llm(
      "You are a helpful assistant with access to tools. Use the calculator for math, word_counter for text analysis.",
      new Lens(["tools"]),
      new LlmConfig("openai", "gpt-4"),
      null, // refreshEveryNToolCalls
      [calculator, wordCounter, databaseWrite],
    ),
  );

  console.log(`Agent '${agent.name}' with ${agent.kindTag} kind`);
  console.log("Tools: calculator, word_counter, database_write\n");

  // Deploy
  const stream = await hive.deploy([agent], [new Task("Calculate 42 * 7, then count the words in 'Hello world!'")]);

  for await (const event of stream) {
    const data = event.data;
    switch (event.eventType) {
      case "tool_call_started":
        console.log(`  -> Tool called: ${data.toolName}`);
        break;
      case "tool_call_completed":
        console.log(`  <- Tool done: ${data.toolName} (${data.durationMs}ms)`);
        break;
      case "tool_approval_requested":
        console.log(`  !! Approval requested for: ${data.toolName}`);
        break;
      case "agent_completed":
        if (data.outcome === "complete") {
          console.log(`\nResult: ${(data.response ?? "").slice(0, 300)}`);
        } else {
          console.log(`\nAgent finished: ${data.outcome}`);
        }
        break;
    }
    if (event.eventType === "agent_completed") break;
  }

  hive.shutdown();
  console.log("\nDone!");
}

main().catch(console.error);
