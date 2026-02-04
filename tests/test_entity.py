"""Tests for Code Entity and verifier (no LLM calls)."""

import pytest

from moltblock.memory import WorkingMemory
from moltblock.verifier import extract_code_block, run_pytest_on_code, run_verifier


def test_extract_code_block_no_fence() -> None:
    assert extract_code_block("def f(): pass") == "def f(): pass"


def test_extract_code_block_with_fence() -> None:
    text = "```python\ndef f(): pass\n```"
    assert "def f(): pass" in extract_code_block(text)


def test_verifier_syntax_only_pass() -> None:
    mem = WorkingMemory()
    mem.set_final_candidate("def add(a, b): return a + b")
    run_verifier(mem, test_code=None)
    assert mem.verification_passed is True
    assert mem.authoritative_artifact == "def add(a, b): return a + b"


def test_verifier_syntax_only_fail() -> None:
    mem = WorkingMemory()
    mem.set_final_candidate("def add(a b): return a + b")
    run_verifier(mem, test_code=None)
    assert mem.verification_passed is False


def test_run_pytest_on_code_with_test() -> None:
    code = "def add(a, b): return a + b"
    test_code = """
def test_add():
    from solution import add
    assert add(1, 2) == 3
    assert add(0, 0) == 0
"""
    passed, out = run_pytest_on_code(code, test_code)
    assert passed is True


def test_run_pytest_on_code_fail() -> None:
    code = "def add(a, b): return a - b"
    test_code = """
def test_add():
    from solution import add
    assert add(1, 2) == 3
"""
    passed, _ = run_pytest_on_code(code, test_code)
    assert passed is False
