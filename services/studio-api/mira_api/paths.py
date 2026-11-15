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


def to_public_path(path: str | Path) -> str:
    """Return path relative to data root when possible (no absolute leak)."""
    root = data_root().resolve()
    p = Path(path).resolve()
    try:
        return str(p.relative_to(root))
    except ValueError:
        return p.name


def resolve_data_path(stored: str) -> Path:
    p = Path(stored)
    if p.is_absolute():
        return p
    return data_root() / p
