#!/usr/bin/env python3
"""
Run the Code Entity from the repo root without installing the package.
Usage: python run.py "Your task here"
       python run.py "Your task" --test path/to/test.py
       python run.py "Your task" --json
"""
import sys
from pathlib import Path

# Add src to path so moltblock can be imported
src = Path(__file__).resolve().parent / "src"
if str(src) not in sys.path:
    sys.path.insert(0, str(src))

from moltblock.cli import main

if __name__ == "__main__":
    main()
