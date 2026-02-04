"""Agents: Generator, Critic, Judge. Each uses LLMGateway and reads/writes WorkingMemory."""

from .gateway import LLMGateway
from .memory import WorkingMemory
from .persistence import Store, get_strategy

# Default prompts; can be overridden by strategy store (recursive improvement)
CODE_GENERATOR_SYSTEM = """You are the Generator for a Code Entity. You produce a single Python implementation that satisfies the user's task. Output only valid Python code, no markdown fences or extra commentary. The code will be reviewed by a Critic and then verified by running tests."""

CODE_CRITIC_SYSTEM = """You are the Critic. Review the draft code for bugs, edge cases, and style. Be concise. List specific issues and suggestions. Do not rewrite the code; only critique."""

CODE_JUDGE_SYSTEM = """You are the Judge. Given the task, the draft code, and the critique, produce the final single Python implementation. Output only valid Python code, no markdown fences or extra commentary. Incorporate the critic's feedback. The result will be run through pytest."""


def _system_prompt(role: str, store: Store | None) -> str:
    if store:
        s = get_strategy(store, role)
        if s:
            return s
    return {
        "generator": CODE_GENERATOR_SYSTEM,
        "critic": CODE_CRITIC_SYSTEM,
        "judge": CODE_JUDGE_SYSTEM,
    }.get(role, CODE_GENERATOR_SYSTEM)


def run_generator(gateway: LLMGateway, memory: WorkingMemory, store: Store | None = None) -> None:
    """Generator: task -> draft artifact (code)."""
    user_content = memory.task
    if memory.long_term_context:
        user_content = user_content + "\n\nRelevant verified knowledge:\n" + memory.long_term_context
    system = _system_prompt("generator", store)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
    draft = gateway.complete(messages)
    memory.set_draft(draft.strip())


def run_critic(gateway: LLMGateway, memory: WorkingMemory, store: Store | None = None) -> None:
    """Critic: draft + task -> critique."""
    system = _system_prompt("critic", store)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"Task:\n{memory.task}\n\nDraft code:\n{memory.draft}"},
    ]
    critique = gateway.complete(messages)
    memory.set_critique(critique.strip())


def run_judge(gateway: LLMGateway, memory: WorkingMemory, store: Store | None = None) -> None:
    """Judge: task + draft + critique -> final candidate artifact."""
    system = _system_prompt("judge", store)
    messages = [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": f"Task:\n{memory.task}\n\nDraft:\n{memory.draft}\n\nCritique:\n{memory.critique}",
        },
    ]
    final = gateway.complete(messages)
    memory.set_final_candidate(final.strip())


def run_role(
    role: str,
    gateway: LLMGateway,
    task: str,
    inputs: dict[str, str],
    long_term_context: str = "",
    store: Store | None = None,
) -> str:
    """
    Run a single role with task and inputs (node_id -> content from predecessors).
    Returns the role's output string. Used by the graph runner.
    """
    user_content = task
    if long_term_context:
        user_content = task + "\n\nRelevant verified knowledge:\n" + long_term_context
    if role == "generator":
        system = _system_prompt("generator", store)
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ]
        return gateway.complete(messages).strip()
    if role == "critic":
        draft = inputs.get("generator", "")
        content = f"Task:\n{task}\n\nDraft code:\n{draft}"
        if long_term_context:
            content = content + "\n\nRelevant verified knowledge:\n" + long_term_context
        system = _system_prompt("critic", store)
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ]
        return gateway.complete(messages).strip()
    if role == "judge":
        draft = inputs.get("generator", "")
        critique = inputs.get("critic", "")
        content = f"Task:\n{task}\n\nDraft:\n{draft}\n\nCritique:\n{critique}"
        if long_term_context:
            content = content + "\n\nRelevant verified knowledge:\n" + long_term_context
        system = _system_prompt("judge", store)
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ]
        return gateway.complete(messages).strip()
    if role == "router":
        # Passthrough: route to first pipeline (single pipeline = no-op)
        messages = [
            {"role": "system", "content": "You are a Router. Classify the task in one word: code, research, or other. Reply with only that word."},
            {"role": "user", "content": task},
        ]
        return gateway.complete(messages).strip()
    raise ValueError(f"Unknown role for graph: {role}")
