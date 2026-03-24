/// Agent type binding tests for AgentKind, AgentDefinition.

import { describe, it, expect } from "vitest";

const {
  JsAgentKind: AgentKind,
  JsAgentDefinition: AgentDefinition,
  JsLlmConfig: LlmConfig,
  JsLens: Lens,
} = require("../wrapper.js");

describe("AgentKind", () => {
  it("should create llm kind", () => {
    const lens = new Lens(["code"]);
    const config = new LlmConfig("openai", "gpt-4");
    const kind = AgentKind.llm("You are helpful.", lens, config);
    expect(kind.kindTag).toBe("llm");
    expect(kind.toString()).toContain("llm");
  });

  it("should create sequential kind", () => {
    const lens = new Lens([]);
    const config = new LlmConfig("openai", "gpt-4");
    const agent1 = new AgentDefinition("a1", AgentKind.llm("p1", lens, config));
    const agent2 = new AgentDefinition("a2", AgentKind.llm("p2", lens, config));
    const kind = AgentKind.sequential([agent1, agent2]);
    expect(kind.kindTag).toBe("sequential");
  });

  it("should create parallel kind", () => {
    const lens = new Lens([]);
    const config = new LlmConfig("openai", "gpt-4");
    const agent = new AgentDefinition("a", AgentKind.llm("p", lens, config));
    const kind = AgentKind.parallel([agent]);
    expect(kind.kindTag).toBe("parallel");
  });

  it("should create loop kind", () => {
    const lens = new Lens([]);
    const config = new LlmConfig("openai", "gpt-4");
    const agent = new AgentDefinition("a", AgentKind.llm("p", lens, config));
    const kind = AgentKind.loop(agent, 5);
    expect(kind.kindTag).toBe("loop");
  });
});

describe("AgentDefinition", () => {
  it("should construct with name and kind", () => {
    const lens = new Lens(["research"]);
    const config = new LlmConfig("openai", "gpt-4");
    const kind = AgentKind.llm("You are a researcher.", lens, config);
    const agent = new AgentDefinition("researcher", kind);
    expect(agent.name).toBe("researcher");
    expect(agent.kindTag).toBe("llm");
  });

  it("should have toString", () => {
    const agent = new AgentDefinition(
      "test",
      AgentKind.llm("prompt", new Lens([]), new LlmConfig("o", "m"))
    );
    expect(agent.toString()).toContain("test");
  });
});
