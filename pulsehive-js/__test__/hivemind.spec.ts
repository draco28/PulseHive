/// HiveMind binding tests for HiveMind, Task, and provider factories.

import { describe, it, expect } from "vitest";

const {
  HiveMind,
  Task,
  openaiProvider,
  anthropicProvider,
} = require("../wrapper.js");

describe("Task", () => {
  it("should construct with description", () => {
    const task = new Task("Analyze the codebase");
    expect(task.description).toBe("Analyze the codebase");
  });

  it("should have toString", () => {
    const task = new Task("Test task");
    expect(task.toString()).toContain("Test task");
  });
});

describe("Provider factories", () => {
  it("should create openai provider", () => {
    const provider = openaiProvider("sk-test");
    expect(provider.toString()).toContain("openai");
  });

  it("should create openai provider with custom model", () => {
    const provider = openaiProvider("sk-test", "gpt-4o");
    expect(provider.toString()).toContain("openai");
  });

  it("should create anthropic provider", () => {
    const provider = anthropicProvider("sk-ant-test");
    expect(provider.toString()).toContain("anthropic");
  });
});

describe("HiveMind builder", () => {
  it("should fail without substrate", () => {
    const builder = HiveMind.builder();
    expect(() => builder.build()).toThrow("Substrate not configured");
  });

  it("should build with substrate path", () => {
    const tmpPath = `/tmp/pulsehive-test-${Date.now()}.db`;
    const provider = openaiProvider("sk-test");
    const hive = HiveMind.builder()
      .substratePath(tmpPath)
      .llmProvider("openai", provider)
      .build();
    expect(hive.isShutdown).toBe(false);
    hive.shutdown();
    expect(hive.isShutdown).toBe(true);
  });

  it("should build with provider", () => {
    const tmpPath = `/tmp/pulsehive-test-${Date.now()}.db`;
    const provider = openaiProvider("sk-test");
    const hive = HiveMind.builder()
      .substratePath(tmpPath)
      .llmProvider("openai", provider)
      .build();
    expect(hive.isShutdown).toBe(false);
    hive.shutdown();
  });
});
