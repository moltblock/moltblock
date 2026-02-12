/**
 * Recursive improvement loop: measure outcomes, critique strategies, update prompts, re-evaluate.
 */

import {
  Store,
  getRecentOutcomes,
  recordOutcome,
  setStrategy,
} from "./persistence.js";
import type { StrategySuggestion } from "./types.js";

/**
 * Review recent outcomes and return suggested strategy updates (rule-based for MVP).
 * Returns list of { role, suggestion } for human or governance to apply.
 */
export function critiqueStrategies(
  store: Store,
  recentCount = 10,
  domain = "code"
): StrategySuggestion[] {
  const outcomes = getRecentOutcomes(store, recentCount);

  if (outcomes.length < 3) {
    return [];
  }

  const passed = outcomes.filter((o) => o.verification_passed).length;
  const failRate = 1.0 - passed / outcomes.length;

  const suggestions: StrategySuggestion[] = [];

  if (failRate >= 0.5) {
    if (domain === "code") {
      suggestions.push({
        role: "generator",
        suggestion:
          "Add explicit instruction: output only valid TypeScript with no markdown fences or commentary.",
      });
      suggestions.push({
        role: "judge",
        suggestion:
          "Ensure Judge incorporates all critic feedback and outputs runnable code only.",
      });
    } else {
      suggestions.push({
        role: "generator",
        suggestion:
          "Add explicit instruction: produce clear, complete, and accurate responses. Avoid ambiguity.",
      });
      suggestions.push({
        role: "judge",
        suggestion:
          "Ensure Judge addresses all critic concerns and produces a safe, well-structured final response.",
      });
    }
  }

  return suggestions;
}

/**
 * Apply a new prompt for role (strategy update). Under governance, this would require approval.
 */
export function applySuggestion(
  store: Store,
  role: string,
  newPrompt: string
): void {
  setStrategy(store, role, newPrompt);
}

/**
 * Run eval_tasks through runTask (which returns verification_passed).
 * If store is provided, record each outcome. Returns { passed, total }.
 */
export async function runEval(
  runTask: (task: string) => Promise<boolean>,
  evalTasks: string[],
  store?: Store
): Promise<{ passed: number; total: number }> {
  let passed = 0;

  for (const task of evalTasks) {
    const t0 = performance.now();
    const ok = await runTask(task);
    const latency = (performance.now() - t0) / 1000;

    if (store) {
      recordOutcome(store, ok, latency, task.slice(0, 100));
    }

    if (ok) {
      passed++;
    }
  }

  return { passed, total: evalTasks.length };
}

/**
 * One improvement cycle: run eval, critique, optionally apply suggestions.
 * Returns { passed, total, suggestions }.
 */
export async function runImprovementCycle(
  store: Store,
  runTask: (task: string) => Promise<boolean>,
  evalTasks: string[],
  applySuggestions = false
): Promise<{
  passed: number;
  total: number;
  suggestions: StrategySuggestion[];
}> {
  const { passed, total } = await runEval(runTask, evalTasks, store);
  const suggestions = critiqueStrategies(store, total);

  if (applySuggestions && suggestions.length > 0) {
    // Only apply if we have a concrete new prompt; suggestion text could be used by a meta-agent to generate one
    // For now, this is a no-op placeholder
  }

  return { passed, total, suggestions };
}
