/**
 * LLM gateway: single interface for any OpenAI-compatible API.
 * Supports OpenAI, Anthropic Claude, Google Gemini, local LLMs (LM Studio, Ollama), and more.
 */

import OpenAI from "openai";
import type { ModelBinding, ChatMessage } from "./types.js";

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
      const base = this.binding.baseUrl;
      throw new Error(
        `LLM request failed (model=${this.model}, baseUrl=${base}): ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const choice = resp.choices[0];
    if (!choice?.message) {
      return "";
    }
    return choice.message.content ?? "";
  }
}
