from __future__ import annotations

import os
from pathlib import Path


def data_root() -> Path:
    raw = os.environ.get("MIRA_DATA_DIR")
    root = Path(raw).expanduser() if raw else Path.home() / ".mira"
    for name in ("samples", "models", "renders", "packages"):
        (root / name).mkdir(parents=True, exist_ok=True)
    return root


def db_path() -> Path:
    return data_root() / "mira.db"
