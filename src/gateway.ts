/**
 * LLM gateway: single interface for any OpenAI-compatible API.
 * Supports OpenAI, Anthropic Claude, Google Gemini, local LLMs (LM Studio, Ollama), and more.
 */

import OpenAI from "openai";
import type { ModelBinding, ChatMessage } from "./types.js";

/**
 * Extract only the hostname from a URL for safe error messages.
 * Strips path, query params, credentials, and port.
 */
export function sanitizeBaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    return url.hostname;
  } catch {
    return "<invalid-url>";
  }
}

/**
 * If model is 'local' or empty and base_url is localhost, use first available model from API.
 */
async function resolveLocalModel(
  client: OpenAI,
  baseUrl: string,
  configured: string
): Promise<string> {
  if (configured && configured !== "local") {
    return configured;
  }
  if (!baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
    return configured || "default";
  }
  try {
    const models = await client.models.list();
    const firstModel = models.data[0];
    if (firstModel?.id) {
      return firstModel.id;
    }
  } catch {
    // Ignore errors, use default
  }
  return configured || "default";
}

/**
 * One client per role; uses OpenAI-compatible API with base_url and optional api_key.
 * Supports configurable timeout and retry via the OpenAI SDK.
 */
export class LLMGateway {
  private client: OpenAI;
  private model: string;
  private modelResolved = false;
  private binding: ModelBinding;

  constructor(binding: ModelBinding) {
    this.binding = binding;
    this.client = new OpenAI({
      baseURL: binding.baseUrl,
      apiKey: binding.apiKey ?? "not-needed",
      timeout: binding.timeoutMs ?? 60_000,
      maxRetries: binding.maxRetries ?? 2,
    });
    this.model = binding.model;
  }

  /**
   * Send chat completion request; return assistant content.
   */
  async complete(messages: ChatMessage[], maxTokens = 2048): Promise<string> {
    if (!this.modelResolved) {
      this.model = await resolveLocalModel(this.client, this.binding.baseUrl, this.model);
      this.modelResolved = true;
    }

    let resp;
    try {
      resp = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: maxTokens,
      });
    } catch (err) {
      const host = sanitizeBaseUrl(this.binding.baseUrl);
      const msg = err instanceof Error ? err.message : String(err);
      // Strip any key-like strings from the error message
      const safeMsg = msg.replace(/[A-Za-z0-9_\-]{20,}/g, "[REDACTED]");
      throw new Error(
        `LLM request failed (model=${this.model}, host=${host}): ${safeMsg}`
      );
    }

    const choice = resp.choices[0];
    if (!choice?.message) {
      return "";
    }
    return choice.message.content ?? "";
  }
}
