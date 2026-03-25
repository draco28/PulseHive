/// Integration tests — deploy pipeline, event stream, tool wiring, error paths.
/// No real LLM API calls — uses empty deploys and construction-time validation.

import { describe, it, expect, afterEach } from "vitest";

const {
  HiveMind,
  Task,
  EventStream,
  Tool,
  JsAgentKind: AgentKind,
  JsAgentDefinition: AgentDefinition,
  JsLens: Lens,
  JsLlmConfig: LlmConfig,
  openaiProvider,
  anthropicProvider,
  defineTool,
  version,
} = require("../wrapper.js");

let hive: any = null;

afterEach(() => {
  if (hive && !hive.isShutdown) {
    hive.shutdown();
  }
  hive = null;
});

describe("HiveMind deploy", () => {
  it("should deploy empty agents and get empty stream via next()", async () => {
    const tmpPath = `/tmp/pulsehive-int-${Date.now()}.db`;
    hive = HiveMind.builder().substratePath(tmpPath).build();

    const stream = await hive.deploy([], []);
    const event = await stream.next();
    expect(event).toBeNull();
  });

  it("should deploy empty agents with tasks and get empty stream", async () => {
    const tmpPath = `/tmp/pulsehive-int-${Date.now()}.db`;
    hive = HiveMind.builder().substratePath(tmpPath).build();

    const stream = await hive.deploy([], [new Task("Do something")]);
    const event = await stream.next();
    expect(event).toBeNull();
  });

  it("should wire single tool into agent definition", () => {
    const tool = defineTool({
      name: "calculator",
      description: "Does math",
      parameters: { type: "object", properties: { expr: { type: "string" } } },
      execute: async (params: any) => `Result: ${params.expr}`,
    });

    const lens = new Lens([]);
    const config = new LlmConfig("openai", "gpt-4");
    const kind = AgentKind.llm("Use tools.", lens, config, null, [tool]);
    const agent = new AgentDefinition("calc-agent", kind);

    expect(agent.name).toBe("calc-agent");
    expect(agent.kindTag).toBe("llm");
  });

  it("should wire multiple tools into agent", () => {
    const tool1 = defineTool({
      name: "search",
      description: "Searches",
      parameters: { type: "object" },
      execute: async () => "found it",
    });
    const tool2 = defineTool({
      name: "write",
      description: "Writes",
      parameters: { type: "object" },
      execute: async () => "written",
      requiresApproval: true,
    });

    const lens = new Lens([]);
    const config = new LlmConfig("openai", "gpt-4");
    const kind = AgentKind.llm("Use tools.", lens, config, null, [tool1, tool2]);
    const agent = new AgentDefinition("multi-tool", kind);
    expect(agent.kindTag).toBe("llm");
  });
});

describe("EventStream async iteration", () => {
  it("should have Symbol.asyncIterator on prototype", () => {
    expect(typeof EventStream.prototype[Symbol.asyncIterator]).toBe("function");
  });

  it("should support for-await-of on empty deploy", async () => {
    const tmpPath = `/tmp/pulsehive-int-${Date.now()}.db`;
    hive = HiveMind.builder().substratePath(tmpPath).build();

    const stream = await hive.deploy([], []);
    const events: any[] = [];

    for await (const event of stream) {
      events.push(event);
    }

    expect(events.length).toBe(0);
  });

  it("should return EventStream from deploy", async () => {
    const tmpPath = `/tmp/pulsehive-int-${Date.now()}.db`;
    hive = HiveMind.builder().substratePath(tmpPath).build();

    const stream = await hive.deploy([], []);
    expect(stream).toBeDefined();
    expect(typeof stream.next).toBe("function");
    expect(typeof stream[Symbol.asyncIterator]).toBe("function");
  });
});

describe("Workflow composition", () => {
  it("should create sequential workflow", () => {
    const lens = new Lens([]);
    const config = new LlmConfig("openai", "gpt-4");
    const a1 = new AgentDefinition("step1", AgentKind.llm("First", lens, config));
    const a2 = new AgentDefinition("step2", AgentKind.llm("Second", lens, config));
    const pipeline = new AgentDefinition("pipeline", AgentKind.sequential([a1, a2]));
    expect(pipeline.kindTag).toBe("sequential");
  });

  it("should create parallel workflow", () => {
    const lens = new Lens([]);
    const config = new LlmConfig("openai", "gpt-4");
    const a1 = new AgentDefinition("worker1", AgentKind.llm("Work", lens, config));
    const a2 = new AgentDefinition("worker2", AgentKind.llm("Work", lens, config));
    const team = new AgentDefinition("team", AgentKind.parallel([a1, a2]));
    expect(team.kindTag).toBe("parallel");
  });

  it("should create loop workflow", () => {
    const lens = new Lens([]);
    const config = new LlmConfig("openai", "gpt-4");
    const worker = new AgentDefinition("refiner", AgentKind.llm("Refine", lens, config));
    const loop = new AgentDefinition("loop", AgentKind.loop(worker, 5));
    expect(loop.kindTag).toBe("loop");
  });

  it("should create nested workflow (sequential with parallel inside)", () => {
    const lens = new Lens([]);
    const config = new LlmConfig("openai", "gpt-4");
    const a1 = new AgentDefinition("e1", AgentKind.llm("Explore", lens, config));
    const a2 = new AgentDefinition("e2", AgentKind.llm("Explore", lens, config));
    const parallel = new AgentDefinition("explore", AgentKind.parallel([a1, a2]));
    const summarizer = new AgentDefinition("summarize", AgentKind.llm("Sum", lens, config));
    const pipeline = new AgentDefinition("pipeline", AgentKind.sequential([parallel, summarizer]));
    expect(pipeline.kindTag).toBe("sequential");
  });
});

describe("Error paths", () => {
  it("should throw when building without substrate", () => {
    expect(() => HiveMind.builder().build()).toThrow("Substrate not configured");
  });

  it("should reject Tool with invalid parameters JSON", () => {
    expect(() => {
      new Tool("bad", "Bad tool", "not valid json {{{", async () => "", false);
    }).toThrow();
  });
});

describe("Shutdown", () => {
  it("should report isShutdown correctly", () => {
    const tmpPath = `/tmp/pulsehive-int-${Date.now()}.db`;
    hive = HiveMind.builder().substratePath(tmpPath).build();
    expect(hive.isShutdown).toBe(false);
    hive.shutdown();
    expect(hive.isShutdown).toBe(true);
  });

  it("should allow multiple shutdowns without error", () => {
    const tmpPath = `/tmp/pulsehive-int-${Date.now()}.db`;
    hive = HiveMind.builder().substratePath(tmpPath).build();
    hive.shutdown();
    hive.shutdown(); // second call should be safe
    expect(hive.isShutdown).toBe(true);
  });
});

describe("SDK metadata", () => {
  it("should return version string", () => {
    const v = version();
    expect(v).toBe("1.0.0");
  });
});
