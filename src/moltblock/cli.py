"""CLI: run one Code Entity task."""

import argparse
import json
import sys
from pathlib import Path

from .entity import CodeEntity
from .config import default_code_entity_bindings


def main() -> None:
    # Windows console often uses cp1252; ensure we can print LLM Unicode output
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="Moltblock Code Entity — one task through the loop.")
    parser.add_argument("task", help="Task description (e.g. 'Implement a function add(a,b) that returns a+b.')")
    parser.add_argument(
        "--test",
        "-t",
        type=Path,
        default=None,
        help="Path to file containing test code (e.g. pytest test module). If omitted, only syntax check.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output result as JSON (draft, critique, final, verification_passed, authoritative_artifact).",
    )
    args = parser.parse_args()

    test_code = None
    if args.test and args.test.exists():
        test_code = args.test.read_text(encoding="utf-8")

    entity = CodeEntity(bindings=default_code_entity_bindings())
    memory = entity.run(args.task, test_code=test_code)

    if args.json:
        out = {
            "verification_passed": memory.verification_passed,
            "verification_evidence": memory.verification_evidence,
            "authoritative_artifact": memory.authoritative_artifact if memory.verification_passed else None,
            "draft": memory.draft,
            "critique": memory.critique,
            "final_candidate": memory.final_candidate,
        }
        print(json.dumps(out, indent=2))
    else:
        print("=== Draft ===")
        print(memory.draft)
        print("\n=== Critique ===")
        print(memory.critique)
        print("\n=== Final candidate ===")
        print(memory.final_candidate)
        print("\n=== Verification ===")
        print("Passed:" if memory.verification_passed else "Failed:", memory.verification_passed)
        print(memory.verification_evidence)
        if memory.verification_passed and memory.authoritative_artifact:
            print("\n=== Authoritative artifact ===")
            print(memory.authoritative_artifact)


if __name__ == "__main__":
    main()
