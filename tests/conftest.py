"""Pytest conftest: add src to path so moltblock is importable when run from repo root."""

import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent / "src"
if str(root) not in sys.path:
    sys.path.insert(0, str(root))
