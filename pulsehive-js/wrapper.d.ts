/**
 * @pulsehive/sdk — TypeScript/Node.js bindings for PulseHive multi-agent SDK.
 *
 * Re-exports all napi-generated bindings plus:
 * - Symbol.asyncIterator on EventStream
 * - defineTool() helper
 */

// Re-export everything from the napi-generated types
export {
  EventStream,
  HiveMind,
  HiveMindBuilder,
  JsAgentDefinition as AgentDefinition,
  JsAgentKind as AgentKind,
  JsAgentOutcome as AgentOutcome,
  JsHiveEvent as HiveEvent,
  JsLens as Lens,
  JsLlmConfig as LlmConfig,
  JsRecencyCurve as RecencyCurve,
  LlmProviderProxy,
  Task,
  Tool,
  ToolContext,
  ToolResult,
  anthropicProvider,
  openaiProvider,
  version,
} from './index.js';

import type { Tool, ToolContext } from './index.js';

// ── EventStream async iteration ──────────────────────────────────────

declare module './index.js' {
  interface EventStream {
    [Symbol.asyncIterator](): AsyncIterableIterator<import('./index.js').JsHiveEvent>;
  }
}

// ── defineTool() ─────────────────────────────────────────────────────

/** Configuration for defining a tool with typed params and context. */
export interface ToolConfig {
  /** Tool name shown to the LLM for selection. */
  name: string;
  /** Description the LLM uses to decide when to invoke this tool. */
  description: string;
  /** JSON Schema describing the tool's parameters. */
  parameters: Record<string, unknown>;
  /**
   * Execute the tool with parsed parameters and context.
   * Return a string result (or object that will be JSON.stringify'd).
   */
  execute: (
    params: Record<string, unknown>,
    context: { agentId: string; collectiveId: string },
  ) => string | Record<string, unknown> | Promise<string | Record<string, unknown>>;
  /** Whether this tool requires human approval before execution. Default: false */
  requiresApproval?: boolean;
}

/**
 * Define a tool with a typed, ergonomic API.
 *
 * Instead of manually serializing JSON for the Tool constructor,
 * use defineTool() to pass a configuration object:
 *
 * ```typescript
 * const calculator = defineTool({
 *   name: 'calculator',
 *   description: 'Performs arithmetic',
 *   parameters: {
 *     type: 'object',
 *     properties: { expression: { type: 'string' } },
 *     required: ['expression'],
 *   },
 *   execute: async (params, context) => {
 *     return `Result: ${params.expression}`;
 *   },
 * });
 * ```
 */
export declare function defineTool(config: ToolConfig): Tool;
