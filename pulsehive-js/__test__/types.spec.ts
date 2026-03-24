/// Type binding tests for LlmConfig, RecencyCurve, Lens.

import { describe, it, expect } from "vitest";

const { JsLlmConfig: LlmConfig, JsRecencyCurve: RecencyCurve, JsLens: Lens } = require("../wrapper.js");

describe("LlmConfig", () => {
  it("should construct with defaults", () => {
    const config = new LlmConfig("openai", "gpt-4");
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4");
    expect(config.temperature).toBeCloseTo(0.7);
    expect(config.maxTokens).toBe(4096);
  });

  it("should construct with custom values", () => {
    const config = new LlmConfig("anthropic", "claude-sonnet-4-6", 0.3, 2048);
    expect(config.provider).toBe("anthropic");
    expect(config.model).toBe("claude-sonnet-4-6");
    expect(config.temperature).toBeCloseTo(0.3);
    expect(config.maxTokens).toBe(2048);
  });

  it("should have toString", () => {
    const config = new LlmConfig("openai", "gpt-4");
    expect(config.toString()).toContain("openai");
    expect(config.toString()).toContain("gpt-4");
  });
});

describe("RecencyCurve", () => {
  it("should create exponential", () => {
    const curve = RecencyCurve.exponential(72.0);
    expect(curve.toString()).toContain("exponential");
    expect(curve.toString()).toContain("72");
  });

  it("should create uniform", () => {
    const curve = RecencyCurve.uniform();
    expect(curve.toString()).toContain("uniform");
  });
});

describe("Lens", () => {
  it("should construct with defaults", () => {
    const lens = new Lens(["safety", "clinical"]);
    expect(lens.domainFocus).toEqual(["safety", "clinical"]);
    expect(lens.attentionBudget).toBe(50);
  });

  it("should construct with custom values", () => {
    const curve = RecencyCurve.exponential(48.0);
    const lens = new Lens(["code"], 100, curve, { difficulty: 2.0 });
    expect(lens.domainFocus).toEqual(["code"]);
    expect(lens.attentionBudget).toBe(100);
  });

  it("should have toString", () => {
    const lens = new Lens(["test"]);
    expect(lens.toString()).toContain("test");
  });
});
