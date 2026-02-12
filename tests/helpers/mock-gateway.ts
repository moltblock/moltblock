/**
 * Mock LLM gateway for testing agent code without real LLM calls.
 */

import type { ChatMessage } from "../../src/types.js";

/**
 * MockLLMGateway: drop-in replacement for LLMGateway in tests.
 * Accepts a map of prompt substrings to responses, or a default response.
 */
export class MockLLMGateway {
  private responses: Map<string, string>;
  private defaultResponse: string;
  public calls: Array<{ messages: ChatMessage[]; maxTokens?: number }> = [];

  constructor(options: {
    responses?: Record<string, string>;
    defaultResponse?: string;
  } = {}) {
    this.responses = new Map(Object.entries(options.responses ?? {}));
    this.defaultResponse = options.defaultResponse ?? "mock response";
  }

  async complete(messages: ChatMessage[], maxTokens = 2048): Promise<string> {
    this.calls.push({ messages, maxTokens });

    // Check if any prompt substring matches
    const lastUserMsg = messages.find((m) => m.role === "user")?.content ?? "";
    const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
    const allContent = `${systemMsg} ${lastUserMsg}`;

    for (const [key, response] of this.responses) {
      if (allContent.includes(key)) {
        return response;
      }
    }

    return this.defaultResponse;
  }
}

/**
 * Create a mock gateway that always throws.
 */
export class FailingGateway {
  private error: Error;

  constructor(message = "mock LLM failure") {
    this.error = new Error(message);
  }

  async complete(_messages: ChatMessage[], _maxTokens = 2048): Promise<string> {
    throw this.error;
  }
}
