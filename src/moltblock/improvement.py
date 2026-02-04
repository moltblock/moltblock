"""Recursive improvement loop: measure outcomes, critique strategies, update prompts, re-evaluate."""

import time
from typing import Callable

from .persistence import (
    Store,
    get_recent_outcomes,
    get_strategy,
    record_outcome,
    set_strategy,
)


def critique_strategies(store: Store, recent_count: int = 10) -> list[dict[str, str]]:
    """
    Review recent outcomes and return suggested strategy updates (rule-based for MVP).
    Returns list of {"role": str, "suggestion": str} for human or governance to apply.
    """
    outcomes = get_recent_outcomes(store, recent_count)
    if len(outcomes) < 3:
        return []
    passed = sum(1 for o in outcomes if o["verification_passed"])
    fail_rate = 1.0 - (passed / len(outcomes))
    suggestions: list[dict[str, str]] = []
    if fail_rate >= 0.5:
        suggestions.append({
            "role": "generator",
            "suggestion": "Add explicit instruction: output only valid Python with no markdown fences or commentary.",
        })
        suggestions.append({
            "role": "judge",
            "suggestion": "Ensure Judge incorporates all critic feedback and outputs runnable code only.",
        })
    return suggestions


def apply_suggestion(store: Store, role: str, new_prompt: str) -> None:
    """Apply a new prompt for role (strategy update). Under governance, this would require approval."""
    set_strategy(store, role, new_prompt)


def run_eval(
    run_task: Callable[[str], bool],
    eval_tasks: list[str],
    store: Store | None = None,
) -> tuple[int, int]:
    """
    Run eval_tasks through run_task (which returns verification_passed).
    If store is provided, record each outcome. Returns (passed_count, total).
    """
    passed = 0
    for task in eval_tasks:
        t0 = time.perf_counter()
        ok = run_task(task)
        latency = time.perf_counter() - t0
        if store:
            record_outcome(store, verification_passed=ok, latency_sec=latency, task_ref=task[:100])
        if ok:
            passed += 1
    return passed, len(eval_tasks)


def run_improvement_cycle(
    store: Store,
    run_task: Callable[[str], bool],
    eval_tasks: list[str],
    apply_suggestions: bool = False,
) -> dict[str, int | list]:
    """
    One improvement cycle: run eval, critique, optionally apply suggestions.
    Returns {"passed": int, "total": int, "suggestions": list}.
    """
    passed, total = run_eval(run_task, eval_tasks, store)
    suggestions = critique_strategies(store, recent_count=total)
    if apply_suggestions and suggestions:
        for s in suggestions:
            # Only apply if we have a concrete new prompt; suggestion text could be used by a meta-agent to generate one
            pass
    return {"passed": passed, "total": total, "suggestions": suggestions}
