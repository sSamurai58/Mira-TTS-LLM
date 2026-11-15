from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from typing import Any, Iterator

from mira_api.paths import db_path


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class Store:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._init_db()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            conn = sqlite3.connect(db_path(), check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

    def _init_db(self) -> None:
        with self.connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS datasets (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS samples (
                  id TEXT PRIMARY KEY,
                  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
                  name TEXT NOT NULL,
                  path TEXT NOT NULL,
                  duration_ms INTEGER NOT NULL,
                  format TEXT NOT NULL,
                  sha256 TEXT NOT NULL,
                  created_at TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS samples_dataset_sha
                  ON samples(dataset_id, sha256);
                CREATE TABLE IF NOT EXISTS segments (
                  id TEXT PRIMARY KEY,
                  sample_id TEXT NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
                  dataset_id TEXT NOT NULL,
                  kind TEXT NOT NULL,
                  start_ms INTEGER NOT NULL,
                  end_ms INTEGER NOT NULL,
                  label TEXT,
                  status TEXT NOT NULL,
                  created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS models (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  status TEXT NOT NULL,
                  dataset_id TEXT,
                  source TEXT NOT NULL,
                  package_path TEXT,
                  progress_pct INTEGER,
                  error_code TEXT,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS script_text (
                  id TEXT PRIMARY KEY,
                  body TEXT NOT NULL,
                  source TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS jobs (
                  id TEXT PRIMARY KEY,
                  kind TEXT NOT NULL,
                  status TEXT NOT NULL,
                  target_id TEXT,
                  progress_pct INTEGER NOT NULL DEFAULT 0,
                  error_code TEXT,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS renders (
                  id TEXT PRIMARY KEY,
                  model_id TEXT NOT NULL,
                  script_text_id TEXT NOT NULL,
                  path TEXT NOT NULL,
                  duration_ms INTEGER NOT NULL,
                  created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS api_settings (
                  id TEXT PRIMARY KEY,
                  port INTEGER NOT NULL,
                  token_hash TEXT,
                  default_model_id TEXT,
                  running INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS idempotency (
                  key TEXT PRIMARY KEY,
                  route TEXT NOT NULL,
                  response_json TEXT NOT NULL,
                  created_at TEXT NOT NULL
                );
                """
            )
            row = conn.execute("SELECT id FROM script_text WHERE id='active'").fetchone()
            if not row:
                conn.execute(
                    "INSERT INTO script_text(id, body, source, updated_at) VALUES ('active', '', 'manual', ?)",
                    (_now(),),
                )
            settings = conn.execute("SELECT id FROM api_settings WHERE id='default'").fetchone()
            if not settings:
                conn.execute(
                    "INSERT INTO api_settings(id, port, token_hash, default_model_id, running) VALUES ('default', 8741, NULL, NULL, 0)"
                )

    def get_idempotent(self, key: str, route: str) -> dict[str, Any] | None:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT response_json FROM idempotency WHERE key=? AND route=?",
                (key, route),
            ).fetchone()
            return json.loads(row["response_json"]) if row else None

    def put_idempotent(self, key: str, route: str, payload: dict[str, Any]) -> None:
        with self.connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO idempotency(key, route, response_json, created_at) VALUES (?,?,?,?)",
                (key, route, json.dumps(payload), _now()),
            )


def row_to_dataset(row: sqlite3.Row, sample_count: int) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "sampleCount": sample_count,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def row_to_sample(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "datasetId": row["dataset_id"],
        "name": row["name"],
        "path": row["path"],
        "durationMs": row["duration_ms"],
        "format": row["format"],
        "createdAt": row["created_at"],
    }


def row_to_segment(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "sampleId": row["sample_id"],
        "datasetId": row["dataset_id"],
        "kind": row["kind"],
        "startMs": row["start_ms"],
        "endMs": row["end_ms"],
        "label": row["label"],
        "status": row["status"],
        "createdAt": row["created_at"],
    }


def row_to_model(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "status": row["status"],
        "datasetId": row["dataset_id"],
        "source": row["source"],
        "packagePath": row["package_path"],
        "progressPct": row["progress_pct"],
        "errorCode": row["error_code"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def row_to_job(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "kind": row["kind"],
        "status": row["status"],
        "targetId": row["target_id"],
        "progressPct": row["progress_pct"],
        "errorCode": row["error_code"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def row_to_render(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "modelId": row["model_id"],
        "scriptTextId": row["script_text_id"],
        "path": row["path"],
        "durationMs": row["duration_ms"],
        "createdAt": row["created_at"],
    }


def row_to_script(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "body": row["body"],
        "source": row["source"],
        "updatedAt": row["updated_at"],
    }


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


STORE = Store()
NOW = _now
