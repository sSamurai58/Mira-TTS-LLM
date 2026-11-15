from __future__ import annotations

import threading
import time
from pathlib import Path

from mira_api.audio import stub_segments, write_silence_wav
from mira_api.paths import data_root
from mira_api.store import NOW, STORE, new_id


def _set_job(conn, job_id: str, status: str, progress: int, error: str | None = None) -> None:
    conn.execute(
        "UPDATE jobs SET status=?, progress_pct=?, error_code=?, updated_at=? WHERE id=?",
        (status, progress, error, NOW(), job_id),
    )


def has_running(kind: str) -> bool:
    with STORE.connect() as conn:
        row = conn.execute(
            "SELECT id FROM jobs WHERE kind=? AND status IN ('queued','running') LIMIT 1",
            (kind,),
        ).fetchone()
        return row is not None


def create_job(kind: str, target_id: str | None = None) -> dict:
    job_id = new_id("job")
    ts = NOW()
    with STORE.connect() as conn:
        conn.execute(
            "INSERT INTO jobs(id, kind, status, target_id, progress_pct, error_code, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
            (job_id, kind, "queued", target_id, 0, None, ts, ts),
        )
        row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        from mira_api.store import row_to_job

        return row_to_job(row)


def run_in_thread(fn, *args) -> None:
    threading.Thread(target=fn, args=args, daemon=True).start()


def run_segmentation(job_id: str, dataset_id: str, sample_id: str | None) -> None:
    try:
        with STORE.connect() as conn:
            _set_job(conn, job_id, "running", 10)
            if sample_id:
                samples = conn.execute(
                    "SELECT * FROM samples WHERE id=? AND dataset_id=?",
                    (sample_id, dataset_id),
                ).fetchall()
            else:
                samples = conn.execute(
                    "SELECT * FROM samples WHERE dataset_id=?",
                    (dataset_id,),
                ).fetchall()
            if not samples:
                _set_job(conn, job_id, "failed", 100, "SegmentationFailed")
                return
            for sample in samples:
                conn.execute("DELETE FROM segments WHERE sample_id=?", (sample["id"],))
                for kind, start, end, label in stub_segments(sample["duration_ms"]):
                    conn.execute(
                        "INSERT INTO segments(id, sample_id, dataset_id, kind, start_ms, end_ms, label, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                        (
                            new_id("seg"),
                            sample["id"],
                            dataset_id,
                            kind,
                            start,
                            end,
                            label,
                            "pending",
                            NOW(),
                        ),
                    )
            _set_job(conn, job_id, "succeeded", 100)
    except Exception:
        with STORE.connect() as conn:
            _set_job(conn, job_id, "failed", 100, "SegmentationFailed")


def run_training(job_id: str, model_id: str) -> None:
    try:
        with STORE.connect() as conn:
            _set_job(conn, job_id, "running", 5)
            conn.execute(
                "UPDATE models SET status='training', progress_pct=5, updated_at=? WHERE id=?",
                (NOW(), model_id),
            )
        for pct in (25, 50, 75, 100):
            time.sleep(0.15)
            with STORE.connect() as conn:
                conn.execute(
                    "UPDATE models SET progress_pct=?, updated_at=? WHERE id=?",
                    (pct, NOW(), model_id),
                )
                _set_job(conn, job_id, "running", pct)
        model_dir = data_root() / "models" / model_id
        model_dir.mkdir(parents=True, exist_ok=True)
        (model_dir / "weights.bin").write_bytes(b"MIRA_STUB_WEIGHTS_v1")
        with STORE.connect() as conn:
            conn.execute(
                "UPDATE models SET status='ready', progress_pct=100, error_code=NULL, package_path=?, updated_at=? WHERE id=?",
                (str(model_dir), NOW(), model_id),
            )
            _set_job(conn, job_id, "succeeded", 100)
    except Exception:
        with STORE.connect() as conn:
            conn.execute(
                "UPDATE models SET status='failed', error_code='TrainingFailed', updated_at=? WHERE id=?",
                (NOW(), model_id),
            )
            _set_job(conn, job_id, "failed", 100, "TrainingFailed")


def run_llm(job_id: str, mode: str, prompt: str | None = None) -> None:
    try:
        with STORE.connect() as conn:
            _set_job(conn, job_id, "running", 40)
            row = conn.execute("SELECT body FROM script_text WHERE id='active'").fetchone()
            body = row["body"] if row else ""
            if mode == "generate":
                seed = (prompt or "озвучка").strip() or "озвучка"
                text = f"Добро пожаловать. Это текст для {seed}, подготовленный Mira."
                source = "llm"
            else:
                if not body.strip():
                    _set_job(conn, job_id, "failed", 100, "ScriptTextEmpty")
                    return
                text = body.strip()
                if not text.endswith("."):
                    text += "."
                text = f"{text} (уточнено для озвучки)"
                source = "llm_improve"
            conn.execute(
                "UPDATE script_text SET body=?, source=?, updated_at=? WHERE id='active'",
                (text, source, NOW()),
            )
            _set_job(conn, job_id, "succeeded", 100)
    except Exception:
        with STORE.connect() as conn:
            _set_job(conn, job_id, "failed", 100, "LlmFailed")


def run_tts(job_id: str, model_id: str, script_id: str) -> None:
    try:
        with STORE.connect() as conn:
            _set_job(conn, job_id, "running", 30)
            script = conn.execute("SELECT body FROM script_text WHERE id=?", (script_id,)).fetchone()
            body = (script["body"] if script else "").strip()
            if not body:
                _set_job(conn, job_id, "failed", 100, "ScriptTextEmpty")
                return
            model = conn.execute("SELECT status FROM models WHERE id=?", (model_id,)).fetchone()
            if not model or model["status"] != "ready":
                _set_job(conn, job_id, "failed", 100, "ModelNotReady")
                return
            render_id = new_id("rnd")
            path = data_root() / "renders" / f"{render_id}.wav"
            duration = write_silence_wav(path, duration_ms=max(600, min(8000, len(body) * 40)))
            conn.execute(
                "INSERT INTO renders(id, model_id, script_text_id, path, duration_ms, created_at) VALUES (?,?,?,?,?,?)",
                (render_id, model_id, script_id, str(path), duration, NOW()),
            )
            conn.execute(
                "UPDATE jobs SET target_id=?, status='succeeded', progress_pct=100, updated_at=? WHERE id=?",
                (render_id, NOW(), job_id),
            )
    except Exception:
        with STORE.connect() as conn:
            _set_job(conn, job_id, "failed", 100, "TtsFailed")
