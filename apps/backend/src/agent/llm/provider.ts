/**
 * Swappable LLM provider interface (spec §2, §13).
 *
 * Keep this interface tiny so we can A/B Gemini Flash, GPT-4-mini, Claude
 * Haiku, etc. without touching the agent loop.
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** When `role === 'tool'`, the id of the tool_call this is responding to. */
  toolCallId?: string;
  /** Free-form name (assistant tool calls / tool replies). */
  name?: string;
  /**
   * When `role === 'assistant'`, the tool calls the model wants executed.
   * OpenAI-shape APIs need this on the assistant turn so subsequent tool
   * messages can be correlated by id.
   */
  toolCalls?: LlmToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the parameters object. */
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  id: string;
  name: string;
  /** Arguments as a JSON object — providers that return strings should parse before returning. */
  arguments: Record<string, unknown>;
}

export interface LlmCallResult {
  /** Plain assistant text, present when the model produces a final reply. */
  text?: string;
  /** Tool calls the model wants to execute. Empty when text is set. */
  toolCalls: LlmToolCall[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface LlmCallOptions {
  model: string;
  messages: LlmMessage[];
  tools: ToolDefinition[];
  maxOutputTokens?: number;
}

export interface LlmProvider {
  readonly name: string;
  call(options: LlmCallOptions): Promise<LlmCallResult>;
}
