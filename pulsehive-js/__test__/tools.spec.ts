/// Tool bridge tests for Tool, ToolContext, ToolResult.

import { Tool, ToolResult } from "../index";

describe("Tool", () => {
  it("should construct with metadata and callback", () => {
    const tool = new Tool(
      "echo",
      "Echoes input",
      '{"type":"object","properties":{"text":{"type":"string"}}}',
      async (payloadJson: string) => {
        const { params } = JSON.parse(payloadJson);
        return `Echo: ${params.text}`;
      }
    );
    expect(tool.name).toBe("echo");
    expect(tool.description).toBe("Echoes input");
    expect(tool.requiresApproval).toBe(false);
  });

  it("should construct with requiresApproval", () => {
    const tool = new Tool(
      "danger",
      "Dangerous operation",
      '{"type":"object"}',
      async () => "done",
      true
    );
    expect(tool.requiresApproval).toBe(true);
  });

  it("should reject invalid JSON parameters", () => {
    expect(() => {
      new Tool("bad", "Bad tool", "not json", async () => "");
    }).toThrow();
  });
});

describe("ToolResult", () => {
  it("should create text result", () => {
    const result = ToolResult.text("hello");
    expect(result.kind).toBe("text");
    expect(result.content).toBe("hello");
  });

  it("should create json result", () => {
    const result = ToolResult.json('{"key":"value"}');
    expect(result.kind).toBe("json");
    expect(result.content).toBe('{"key":"value"}');
  });

  it("should create error result", () => {
    const result = ToolResult.error("something went wrong");
    expect(result.kind).toBe("error");
    expect(result.content).toBe("something went wrong");
  });
});
