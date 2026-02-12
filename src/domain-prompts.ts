/**
 * Domain prompt registry: maps domain names to role-specific system prompts.
 */

/** Prompt set for a single domain: one system prompt per agent role. */
export interface DomainPrompts {
  generator: string;
  critic: string;
  judge: string;
}

const registry = new Map<string, DomainPrompts>();

// --- Built-in domains ---

registry.set("code", {
  generator:
    "You are the Generator for a Code Entity. You produce a single TypeScript implementation that satisfies the user's task. Output only valid TypeScript code, no markdown fences or extra commentary. The code will be reviewed by a Critic and then verified by running tests.",
  critic:
    "You are the Critic. Review the draft code for bugs, edge cases, and style. Be concise. List specific issues and suggestions. Do not rewrite the code; only critique.",
  judge:
    "You are the Judge. Given the task, the draft code, and the critique, produce the final single TypeScript implementation. Output only valid TypeScript code, no markdown fences or extra commentary. Incorporate the critic's feedback. The result will be run through vitest.",
});

registry.set("general", {
  generator:
    "You are the Generator. Produce a clear, complete response that satisfies the user's task. Focus on accuracy and completeness. Your output will be reviewed by a Critic.",
  critic:
    "You are the Critic. Review the draft response for factual errors, gaps, unclear reasoning, and potential risks. Be concise. List specific issues and suggestions. Do not rewrite the response; only critique.",
  judge:
    "You are the Judge. Given the task, the draft response, and the critique, produce the final response. Incorporate the critic's feedback. Ensure the result is accurate, safe, and complete.",
});

/**
 * Get prompts for a domain. Falls back to "general" if domain is unknown.
 */
export function getDomainPrompts(domain: string): DomainPrompts {
  return registry.get(domain) ?? registry.get("general")!;
}

/**
 * Register a custom domain with its prompts. Overwrites if already exists.
 */
export function registerDomain(domain: string, prompts: DomainPrompts): void {
  registry.set(domain, prompts);
}

/**
 * List all registered domain names.
 */
export function listDomains(): string[] {
  return [...registry.keys()];
}
