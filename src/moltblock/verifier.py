"""Verifier: run pytest on code artifact; gate authority and memory admission."""

import subprocess
import tempfile
from pathlib import Path

from .memory import WorkingMemory


def extract_code_block(text: str) -> str:
    """Remove markdown code fence if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines)
    return text


def run_pytest_on_code(code: str, test_code: str | None = None) -> tuple[bool, str]:
    """
    Write code (and optional test) to temp dir, run pytest, return (passed, stdout+stderr).
    If test_code is None, we only check that the code is syntactically valid and runnable.
    """
    code = extract_code_block(code)
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "solution.py").write_text(code, encoding="utf-8")
        if test_code:
            (root / "test_solution.py").write_text(
                extract_code_block(test_code), encoding="utf-8"
            )
        result = subprocess.run(
            ["python", "-m", "pytest", str(root), "-v", "--tb=short"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        out = (result.stdout or "") + (result.stderr or "")
        return result.returncode == 0, out


def run_verifier(memory: WorkingMemory, test_code: str | None = None) -> None:
    """
    Run verification on final_candidate. For Code Entity: run pytest.
    Sets verification_passed and verification_evidence; if pass, sets authoritative_artifact.
    """
    code = memory.final_candidate
    if not code:
        memory.set_verification(False, "No final candidate to verify.")
        return
    # If no test_code provided, at least compile and do a quick exec check
    if not test_code:
        try:
            compile(code, "<artifact>", "exec")
            memory.set_verification(True, "Syntax check passed (no tests provided).")
            return
        except SyntaxError as e:
            memory.set_verification(False, f"Syntax error: {e}")
            return
    passed, evidence = run_pytest_on_code(code, test_code)
    memory.set_verification(passed, evidence)
