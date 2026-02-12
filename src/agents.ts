/**
 * Agents: Generator, Critic, Judge. Each uses LLMGateway and reads/writes WorkingMemory.
 */

import { getDomainPrompts } from "./domain-prompts.js";
import { LLMGateway } from "./gateway.js";
import { WorkingMemory } from "./memory.js";
import { Store, getStrategy } from "./persistence.js";
import type { ChatMessage } from "./types.js";

// Default prompts; can be overridden by strategy store (recursive improvement)
// Note: Prompts updated to produce TypeScript instead of Python
const CODE_GENERATOR_SYSTEM = `You are the Generator for a Code Entity. You produce a single TypeScript implementation that satisfies the user's task. Output only valid TypeScript code, no markdown fences or extra commentary. The code will be reviewed by a Critic and then verified by running tests.`;

const CODE_CRITIC_SYSTEM = `You are the Critic. Review the draft code for bugs, edge cases, and style. Be concise. List specific issues and suggestions. Do not rewrite the code; only critique.`;

const CODE_JUDGE_SYSTEM = `You are the Judge. Given the task, the draft code, and the critique, produce the final single TypeScript implementation. Output only valid TypeScript code, no markdown fences or extra commentary. Incorporate the critic's feedback. The result will be run through vitest.`;

function systemPrompt(role: string, store: Store | null, domain = "code"): string {
  if (store) {
    const s = getStrategy(store, role);
    if (s) {
      return s;
    }
  }
  // Hard-coded defaults for "code" domain (backward compat)
  if (domain === "code") {
    const defaults: Record<string, string> = {
      generator: CODE_GENERATOR_SYSTEM,
      critic: CODE_CRITIC_SYSTEM,
      judge: CODE_JUDGE_SYSTEM,
    };
    const d = defaults[role];
    if (d) return d;
  }
  // Fall back to domain prompt registry
  const prompts = getDomainPrompts(domain);
  const roleMap: Record<string, string> = {
    generator: prompts.generator,
    critic: prompts.critic,
    judge: prompts.judge,
  };
  return roleMap[role] ?? prompts.generator;
}

/**
 * Generator: task -> draft artifact (code).
 */
export async function runGenerator(
  gateway: LLMGateway,
  memory: WorkingMemory,
  store: Store | null = null,
  domain = "code"
): Promise<void> {
  let userContent = memory.task;
  if (memory.longTermContext) {
    userContent = userContent + "\n\nRelevant verified knowledge:\n" + memory.longTermContext;
  }
  const system = systemPrompt("generator", store, domain);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
  const draft = await gateway.complete(messages);
  memory.setDraft(draft.trim());
}

/**
 * Critic: draft + task -> critique.
 */
export async function runCritic(
  gateway: LLMGateway,
  memory: WorkingMemory,
  store: Store | null = null,
  domain = "code"
): Promise<void> {
  const system = systemPrompt("critic", store, domain);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: `Task:\n${memory.task}\n\nDraft code:\n${memory.draft}` },
  ];
  const critique = await gateway.complete(messages);
  memory.setCritique(critique.trim());
}

/**
 * Judge: task + draft + critique -> final candidate artifact.
 */
export async function runJudge(
  gateway: LLMGateway,
  memory: WorkingMemory,
  store: Store | null = null,
  domain = "code"
): Promise<void> {
  const system = systemPrompt("judge", store, domain);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: `Task:\n${memory.task}\n\nDraft:\n${memory.draft}\n\nCritique:\n${memory.critique}`,
    },
  ];
  const final = await gateway.complete(messages);
  memory.setFinalCandidate(final.trim());
}

/**
 * Run a single role with task and inputs (node_id -> content from predecessors).
 * Returns the role's output string. Used by the graph runner.
 */
export async function runRole(
  role: string,
  gateway: LLMGateway,
  task: string,
  inputs: Record<string, string>,
  longTermContext = "",
  store: Store | null = null,
  domain = "code"
): Promise<string> {
  let userContent = task;
  if (longTermContext) {
    userContent = task + "\n\nRelevant verified knowledge:\n" + longTermContext;
  }

  if (role === "generator") {
    const system = systemPrompt("generator", store, domain);
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ];
    return (await gateway.complete(messages)).trim();
  }

  if (role === "critic") {
    const draft = inputs["generator"] ?? "";
    let content = `Task:\n${task}\n\nDraft code:\n${draft}`;
    if (longTermContext) {
      content = content + "\n\nRelevant verified knowledge:\n" + longTermContext;
    }
    const system = systemPrompt("critic", store, domain);
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: content },
    ];
    return (await gateway.complete(messages)).trim();
  }

  if (role === "judge") {
    const draft = inputs["generator"] ?? "";
    const critique = inputs["critic"] ?? "";
    let content = `Task:\n${task}\n\nDraft:\n${draft}\n\nCritique:\n${critique}`;
    if (longTermContext) {
      content = content + "\n\nRelevant verified knowledge:\n" + longTermContext;
    }
    const system = systemPrompt("judge", store, domain);
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: content },
    ];
    return (await gateway.complete(messages)).trim();
  }

  if (role === "router") {
    // Passthrough: route to first pipeline (single pipeline = no-op)
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a Router. Classify the task in one word: code, research, or other. Reply with only that word.",
      },
      { role: "user", content: task },
    ];
    return (await gateway.complete(messages)).trim();
  }

  throw new Error(`Unknown role for graph: ${role}`);
}
