/**
 * PulseHive Multi-Agent Workflows — Sequential, Parallel, and nested agents.
 *
 * This example demonstrates:
 * 1. Sequential workflow: agents run in order, each perceiving previous results
 * 2. Parallel workflow: agents run concurrently, sharing the substrate
 * 3. Loop workflow: an agent repeats until max iterations or [LOOP_DONE]
 * 4. Nested workflows: combining Sequential and Parallel
 *
 * Prerequisites:
 *   npm install @pulsehive/sdk
 *   export OPENAI_API_KEY="sk-..."
 *
 * Usage:
 *   npx tsx examples/multi-agent.ts
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
  const apiKey = process.env.OPENAI_API_KEY ?? "";

  const hive = HiveMind.builder()
    .substratePath("/tmp/pulsehive_multi_agent.db")
    .llmProvider("openai", openaiProvider(apiKey, "gpt-4"))
    .build();

  const config = new LlmConfig("openai", "gpt-4");

  // ── Sequential Workflow ───────────────────────────────────────────
  // Step 1 researches, Step 2 summarizes (perceiving Step 1's results)
  console.log("=== Sequential Pipeline ===");

  const researcher = new AgentDefinition(
    "researcher",
    AgentKind.llm(
      "You research topics thoroughly. Provide detailed findings.",
      new Lens(["research"]),
      config,
    ),
  );

  const summarizer = new AgentDefinition(
    "summarizer",
    AgentKind.llm(
      "You summarize research findings into concise bullet points.",
      new Lens(["research", "summary"]),
      config,
    ),
  );

  const pipeline = new AgentDefinition(
    "research-pipeline",
    AgentKind.sequential([researcher, summarizer]),
  );

  let stream = await hive.deploy([pipeline], [new Task("Research TypeScript async patterns")]);
  await consumeEvents(stream);

  // ── Parallel Workflow ─────────────────────────────────────────────
  // Two agents work concurrently on different aspects
  console.log("\n=== Parallel Team ===");

  const frontendReviewer = new AgentDefinition(
    "frontend-reviewer",
    AgentKind.llm(
      "You review frontend code for best practices.",
      new Lens(["frontend", "ui"]),
      config,
    ),
  );

  const backendReviewer = new AgentDefinition(
    "backend-reviewer",
    AgentKind.llm(
      "You review backend code for performance and security.",
      new Lens(["backend", "security"]),
      config,
    ),
  );

  const reviewTeam = new AgentDefinition(
    "review-team",
    AgentKind.parallel([frontendReviewer, backendReviewer]),
  );

  stream = await hive.deploy([reviewTeam], [new Task("Review the web application")]);
  await consumeEvents(stream);

  // ── Loop Workflow ─────────────────────────────────────────────────
  // Agent iterates up to 3 times, can exit early with [LOOP_DONE]
  console.log("\n=== Loop: Iterative Refinement ===");

  const refiner = new AgentDefinition(
    "refiner",
    AgentKind.llm(
      "You refine and improve text. If satisfied, include [LOOP_DONE] in your response.",
      new Lens(["writing"]),
      config,
    ),
  );

  const loop = new AgentDefinition("refinement-loop", AgentKind.loop(refiner, 3));

  stream = await hive.deploy([loop], [new Task("Write a haiku about Rust programming")]);
  await consumeEvents(stream);

  // ── Nested Workflow ───────────────────────────────────────────────
  // Parallel analysis → Sequential summary
  console.log("\n=== Nested: Parallel Analysis -> Summary ===");

  const analystA = new AgentDefinition(
    "analyst-a",
    AgentKind.llm("Analyze performance.", new Lens(["perf"]), config),
  );
  const analystB = new AgentDefinition(
    "analyst-b",
    AgentKind.llm("Analyze security.", new Lens(["security"]), config),
  );

  const combined = new AgentDefinition(
    "full-review",
    AgentKind.sequential([
      new AgentDefinition("parallel-analysis", AgentKind.parallel([analystA, analystB])),
      new AgentDefinition("final-summary", AgentKind.llm("Summarize all findings.", new Lens([]), config)),
    ]),
  );

  stream = await hive.deploy([combined], [new Task("Full system review")]);
  await consumeEvents(stream);

  hive.shutdown();
  console.log("\nDone!");
}

async function consumeEvents(stream: any) {
  for await (const event of stream) {
    const agentId = event.agentId ?? "";
    const shortId = agentId.slice(0, 8);
    const data = event.data;

    switch (event.eventType) {
      case "agent_started":
        console.log(`  [${event.eventType}] ${shortId} -> ${data.name} (${data.kind})`);
        break;
      case "agent_completed":
        console.log(`  [${event.eventType}] ${shortId} -> ${data.outcome}`);
        break;
      default:
        // Skip verbose events for cleaner output
        break;
    }
  }
}

main().catch(console.error);
