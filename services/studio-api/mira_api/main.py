from __future__ import annotations

import io
import json
import secrets
import zipfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, Field

from mira_api import audio
from mira_api.errors import error_response, raise_error
from mira_api import jobs as joblib
from mira_api.paths import data_root
from mira_api.store import (
    NOW,
    STORE,
    new_id,
    row_to_dataset,
    row_to_job,
    row_to_model,
    row_to_render,
    row_to_sample,
    row_to_script,
    row_to_segment,
    sha256_bytes,
    sha256_text,
)

app = FastAPI(title="Mira Studio API", version="0.1.0")


@app.exception_handler(HTTPException)
async def http_exc_handler(_, exc: HTTPException):
    return error_response(exc)


@app.exception_handler(RequestValidationError)
async def validation_handler(_, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "ValidationError",
                "field": exc.errors()[0].get("loc", ["body"])[-1] if exc.errors() else "body",
                "message": "Некорректный запрос.",
            }
        },
    )


class NameBody(BaseModel):
    name: str = Field(min_length=1)


class SegmentationBody(BaseModel):
    sampleId: str | None = None


class TrainBody(BaseModel):
    datasetId: str
    name: str = Field(min_length=1)


class SegmentPatch(BaseModel):
    startMs: int | None = None
    endMs: int | None = None
    label: str | None = None
    status: str | None = None


class ScriptBody(BaseModel):
    body: str


class GenerateBody(BaseModel):
    prompt: str | None = None


class TtsBody(BaseModel):
    modelId: str
    scriptTextId: str | None = "active"


class ApiSettingsPatch(BaseModel):
    port: int | None = None
    defaultModelId: str | None = None
    rotateToken: bool | None = None


class ExternalTtsBody(BaseModel):
    text: str = Field(min_length=1)
    modelId: str | None = None


def _sample_count(conn, dataset_id: str) -> int:
    row = conn.execute(
        "SELECT COUNT(*) AS c FROM samples WHERE dataset_id=?",
        (dataset_id,),
    ).fetchone()
    return int(row["c"])


def _require_dataset(conn, dataset_id: str):
    row = conn.execute("SELECT * FROM datasets WHERE id=?", (dataset_id,)).fetchone()
    if not row:
        raise_error("DatasetNotFound", "datasetId", 404)
    return row


def _save_sample(dataset_id: str, filename: str, data: bytes, name: str | None) -> dict[str, Any]:
    fmt = audio.sniff_format(filename, data)
    if not fmt:
        raise_error("SampleFormatUnsupported", "file")
    digest = sha256_bytes(data)
    with STORE.connect() as conn:
        _require_dataset(conn, dataset_id)
        existing = conn.execute(
            "SELECT * FROM samples WHERE dataset_id=? AND sha256=?",
            (dataset_id, digest),
        ).fetchone()
        if existing:
            return row_to_sample(existing)
        sample_id = new_id("smp")
        rel = f"samples/{sample_id}.{fmt}"
        path = data_root() / rel
        if fmt == "wav":
            path.write_bytes(data)
            try:
                duration = audio.wav_duration_ms(path)
            except Exception:
                raise_error("SampleImportFailed", "file")
        else:
            # Store original flac bytes; duration stub until decoder lands.
            path.write_bytes(data)
            duration = max(1000, len(data) // 32)
        sample_name = name or Path(filename).stem or sample_id
        ts = NOW()
        try:
            conn.execute(
                "INSERT INTO samples(id, dataset_id, name, path, duration_ms, format, sha256, created_at) VALUES (?,?,?,?,?,?,?,?)",
                (sample_id, dataset_id, sample_name, str(path), duration, fmt, digest, ts),
            )
            conn.execute(
                "UPDATE datasets SET updated_at=? WHERE id=?",
                (ts, dataset_id),
            )
        except Exception:
            raise_error("SampleImportFailed", "file")
        row = conn.execute("SELECT * FROM samples WHERE id=?", (sample_id,)).fetchone()
        return row_to_sample(row)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/datasets")
def list_datasets() -> dict[str, list]:
    with STORE.connect() as conn:
        rows = conn.execute("SELECT * FROM datasets ORDER BY created_at").fetchall()
        return {
            "items": [row_to_dataset(r, _sample_count(conn, r["id"])) for r in rows]
        }


@app.post("/v1/datasets")
def create_dataset(
    body: NameBody,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> dict[str, Any]:
    route = "POST /v1/datasets"
    if idempotency_key:
        cached = STORE.get_idempotent(idempotency_key, route)
        if cached:
            return cached
    dataset_id = new_id("ds")
    ts = NOW()
    with STORE.connect() as conn:
        conn.execute(
            "INSERT INTO datasets(id, name, created_at, updated_at) VALUES (?,?,?,?)",
            (dataset_id, body.name, ts, ts),
        )
        row = conn.execute("SELECT * FROM datasets WHERE id=?", (dataset_id,)).fetchone()
        payload = row_to_dataset(row, 0)
    if idempotency_key:
        STORE.put_idempotent(idempotency_key, route, payload)
    return payload


@app.get("/v1/datasets/{dataset_id}")
def get_dataset(dataset_id: str) -> dict[str, Any]:
    with STORE.connect() as conn:
        row = _require_dataset(conn, dataset_id)
        return row_to_dataset(row, _sample_count(conn, dataset_id))


@app.get("/v1/datasets/{dataset_id}/samples")
def list_samples(dataset_id: str) -> dict[str, list]:
    with STORE.connect() as conn:
        _require_dataset(conn, dataset_id)
        rows = conn.execute(
            "SELECT * FROM samples WHERE dataset_id=? ORDER BY created_at",
            (dataset_id,),
        ).fetchall()
        return {"items": [row_to_sample(r) for r in rows]}


@app.post("/v1/datasets/{dataset_id}/samples/import")
async def import_sample(
    dataset_id: str,
    file: UploadFile = File(...),
    name: str | None = None,
) -> dict[str, Any]:
    data = await file.read()
    if not data:
        raise_error("SampleImportFailed", "file")
    return _save_sample(dataset_id, file.filename or "audio.wav", data, name)


@app.post("/v1/datasets/{dataset_id}/samples/recording")
async def recording_sample(
    dataset_id: str,
    file: UploadFile = File(...),
    name: str | None = None,
) -> dict[str, Any]:
    data = await file.read()
    if not data:
        raise_error("SampleImportFailed", "file")
    return _save_sample(dataset_id, file.filename or "recording.wav", data, name)


@app.post("/v1/datasets/{dataset_id}/segmentation")
def start_segmentation(dataset_id: str, body: SegmentationBody | None = None) -> dict[str, Any]:
    body = body or SegmentationBody()
    with STORE.connect() as conn:
        _require_dataset(conn, dataset_id)
    if joblib.has_running("segment"):
        raise_error("JobConflict", "kind", 409)
    job = joblib.create_job("segment", body.sampleId or dataset_id)
    joblib.run_in_thread(joblib.run_segmentation, job["id"], dataset_id, body.sampleId)
    return job


@app.get("/v1/samples/{sample_id}/segments")
def list_segments(sample_id: str) -> dict[str, list]:
    with STORE.connect() as conn:
        sample = conn.execute("SELECT id FROM samples WHERE id=?", (sample_id,)).fetchone()
        if not sample:
            raise_error("SampleNotFound", "sampleId", 404)
        rows = conn.execute(
            "SELECT * FROM segments WHERE sample_id=? ORDER BY start_ms",
            (sample_id,),
        ).fetchall()
        return {"items": [row_to_segment(r) for r in rows]}


@app.patch("/v1/segments/{segment_id}")
def update_segment(segment_id: str, body: SegmentPatch) -> dict[str, Any]:
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM segments WHERE id=?", (segment_id,)).fetchone()
        if not row:
            raise_error("SampleNotFound", "sampleId", 404)
        sample = conn.execute("SELECT * FROM samples WHERE id=?", (row["sample_id"],)).fetchone()
        start = body.startMs if body.startMs is not None else row["start_ms"]
        end = body.endMs if body.endMs is not None else row["end_ms"]
        if start >= end or start < 0 or end > sample["duration_ms"]:
            raise_error("SegmentInvalidRange", "startMs")
        status = body.status if body.status is not None else row["status"]
        if status not in ("accepted", "rejected", "pending"):
            raise_error("SegmentInvalidRange", "status")
        label = body.label if body.label is not None else row["label"]
        conn.execute(
            "UPDATE segments SET start_ms=?, end_ms=?, label=?, status=? WHERE id=?",
            (start, end, label, status, segment_id),
        )
        updated = conn.execute("SELECT * FROM segments WHERE id=?", (segment_id,)).fetchone()
        return row_to_segment(updated)


@app.post("/v1/models/train")
def start_training(body: TrainBody) -> dict[str, Any]:
    if joblib.has_running("train"):
        raise_error("JobConflict", "kind", 409)
    with STORE.connect() as conn:
        _require_dataset(conn, body.datasetId)
        accepted = conn.execute(
            "SELECT COUNT(*) AS c FROM segments WHERE dataset_id=? AND status='accepted'",
            (body.datasetId,),
        ).fetchone()
        if int(accepted["c"]) < 1:
            raise_error("NoAcceptedSegments", "datasetId")
        model_id = new_id("mdl")
        ts = NOW()
        conn.execute(
            "INSERT INTO models(id, name, status, dataset_id, source, package_path, progress_pct, error_code, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (model_id, body.name, "training", body.datasetId, "trained", None, 0, None, ts, ts),
        )
        model = row_to_model(conn.execute("SELECT * FROM models WHERE id=?", (model_id,)).fetchone())
    job = joblib.create_job("train", model_id)
    joblib.run_in_thread(joblib.run_training, job["id"], model_id)
    return {"model": model, "job": job}


@app.get("/v1/models")
def list_models() -> dict[str, list]:
    with STORE.connect() as conn:
        rows = conn.execute("SELECT * FROM models ORDER BY created_at").fetchall()
        return {"items": [row_to_model(r) for r in rows]}


@app.get("/v1/models/{model_id}")
def get_model(model_id: str) -> dict[str, Any]:
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM models WHERE id=?", (model_id,)).fetchone()
        if not row:
            raise_error("ModelNotFound", "modelId", 404)
        return row_to_model(row)


@app.get("/v1/models/{model_id}/export")
def export_model(model_id: str):
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM models WHERE id=?", (model_id,)).fetchone()
        if not row:
            raise_error("ModelNotFound", "modelId", 404)
        if row["status"] != "ready":
            raise_error("ModelNotReady", "modelId", 409)
        model_dir = Path(row["package_path"] or (data_root() / "models" / model_id))
        weights = model_dir / "weights.bin"
        if not weights.exists():
            weights.parent.mkdir(parents=True, exist_ok=True)
            weights.write_bytes(b"MIRA_STUB_WEIGHTS_v1")
        out = data_root() / "packages" / f"{model_id}.mira-model"
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(
                "manifest.json",
                json.dumps(audio.package_manifest(row["name"], model_id), ensure_ascii=False),
            )
            zf.write(weights, arcname="weights.bin")
        return FileResponse(
            out,
            media_type="application/octet-stream",
            filename=f"{row['name']}.mira-model",
        )


@app.post("/v1/models/import")
async def import_model(file: UploadFile = File(...)) -> dict[str, Any]:
    data = await file.read()
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            manifest = json.loads(zf.read("manifest.json").decode("utf-8"))
            weights = zf.read("weights.bin")
            name = manifest["name"]
    except Exception:
        raise_error("ModelImportFailed", "file")
    model_id = new_id("mdl")
    model_dir = data_root() / "models" / model_id
    model_dir.mkdir(parents=True, exist_ok=True)
    (model_dir / "weights.bin").write_bytes(weights)
    ts = NOW()
    with STORE.connect() as conn:
        conn.execute(
            "INSERT INTO models(id, name, status, dataset_id, source, package_path, progress_pct, error_code, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (model_id, name, "ready", None, "imported", str(model_dir), 100, None, ts, ts),
        )
        row = conn.execute("SELECT * FROM models WHERE id=?", (model_id,)).fetchone()
        return row_to_model(row)


@app.delete("/v1/models/{model_id}")
def delete_model(model_id: str) -> dict[str, bool]:
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM models WHERE id=?", (model_id,)).fetchone()
        if not row:
            raise_error("ModelNotFound", "modelId", 404)
        conn.execute("DELETE FROM models WHERE id=?", (model_id,))
    return {"ok": True}


@app.get("/v1/script")
def get_script() -> dict[str, Any]:
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM script_text WHERE id='active'").fetchone()
        return row_to_script(row)


@app.put("/v1/script")
def save_script(body: ScriptBody) -> dict[str, Any]:
    with STORE.connect() as conn:
        conn.execute(
            "UPDATE script_text SET body=?, source='manual', updated_at=? WHERE id='active'",
            (body.body, NOW()),
        )
        row = conn.execute("SELECT * FROM script_text WHERE id='active'").fetchone()
        return row_to_script(row)


@app.post("/v1/script/generate")
def generate_script(body: GenerateBody | None = None) -> dict[str, Any]:
    body = body or GenerateBody()
    if joblib.has_running("llm"):
        raise_error("JobConflict", "kind", 409)
    job = joblib.create_job("llm", "active")
    joblib.run_in_thread(joblib.run_llm, job["id"], "generate", body.prompt)
    # Small wait so sync clients often see result; still return job for polling.
    import time

    time.sleep(0.05)
    with STORE.connect() as conn:
        text = row_to_script(conn.execute("SELECT * FROM script_text WHERE id='active'").fetchone())
        job_row = row_to_job(conn.execute("SELECT * FROM jobs WHERE id=?", (job["id"],)).fetchone())
    return {"text": text, "job": job_row}


@app.post("/v1/script/improve")
def improve_script() -> dict[str, Any]:
    with STORE.connect() as conn:
        row = conn.execute("SELECT body FROM script_text WHERE id='active'").fetchone()
        if not row["body"].strip():
            raise_error("ScriptTextEmpty", "body")
    if joblib.has_running("llm"):
        raise_error("JobConflict", "kind", 409)
    job = joblib.create_job("llm", "active")
    joblib.run_in_thread(joblib.run_llm, job["id"], "improve", None)
    import time

    time.sleep(0.05)
    with STORE.connect() as conn:
        text = row_to_script(conn.execute("SELECT * FROM script_text WHERE id='active'").fetchone())
        job_row = row_to_job(conn.execute("SELECT * FROM jobs WHERE id=?", (job["id"],)).fetchone())
    return {"text": text, "job": job_row}


@app.post("/v1/tts")
def start_tts(body: TtsBody) -> dict[str, Any]:
    script_id = body.scriptTextId or "active"
    with STORE.connect() as conn:
        model = conn.execute("SELECT * FROM models WHERE id=?", (body.modelId,)).fetchone()
        if not model:
            raise_error("ModelNotFound", "modelId", 404)
        if model["status"] != "ready":
            raise_error("ModelNotReady", "modelId", 409)
        script = conn.execute("SELECT body FROM script_text WHERE id=?", (script_id,)).fetchone()
        if not script or not script["body"].strip():
            raise_error("ScriptTextEmpty", "body")
    if joblib.has_running("tts"):
        raise_error("JobConflict", "kind", 409)
    job = joblib.create_job("tts", None)
    joblib.run_in_thread(joblib.run_tts, job["id"], body.modelId, script_id)
    import time

    for _ in range(40):
        time.sleep(0.05)
        with STORE.connect() as conn:
            job_row = conn.execute("SELECT * FROM jobs WHERE id=?", (job["id"],)).fetchone()
            if job_row["status"] in ("succeeded", "failed"):
                payload: dict[str, Any] = {"job": row_to_job(job_row)}
                if job_row["status"] == "succeeded" and job_row["target_id"]:
                    render = conn.execute(
                        "SELECT * FROM renders WHERE id=?",
                        (job_row["target_id"],),
                    ).fetchone()
                    payload["render"] = row_to_render(render)
                if job_row["status"] == "failed":
                    raise_error(job_row["error_code"] or "TtsFailed", "job")
                return payload
    with STORE.connect() as conn:
        return {"job": row_to_job(conn.execute("SELECT * FROM jobs WHERE id=?", (job["id"],)).fetchone())}


@app.get("/v1/renders/{render_id}")
def get_render(render_id: str) -> dict[str, Any]:
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM renders WHERE id=?", (render_id,)).fetchone()
        if not row:
            raise_error("ModelNotFound", "modelId", 404)
        return row_to_render(row)


@app.get("/v1/renders/{render_id}/audio")
def get_render_audio(render_id: str):
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM renders WHERE id=?", (render_id,)).fetchone()
        if not row:
            raise_error("ModelNotFound", "modelId", 404)
        path = Path(row["path"])
        if not path.exists():
            raise_error("TtsFailed", "job")
        return FileResponse(path, media_type="audio/wav", filename=f"{render_id}.wav")


@app.get("/v1/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not row:
            raise_error("DatasetNotFound", "datasetId", 404)
        return row_to_job(row)


@app.get("/v1/api-settings")
def get_api_settings() -> dict[str, Any]:
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM api_settings WHERE id='default'").fetchone()
        return {
            "port": row["port"],
            "running": bool(row["running"]),
            "defaultModelId": row["default_model_id"],
            "hasToken": bool(row["token_hash"]),
        }


@app.patch("/v1/api-settings")
def patch_api_settings(body: ApiSettingsPatch) -> dict[str, Any]:
    token_plain: str | None = None
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM api_settings WHERE id='default'").fetchone()
        port = body.port if body.port is not None else row["port"]
        default_model = (
            body.defaultModelId if body.defaultModelId is not None else row["default_model_id"]
        )
        token_hash = row["token_hash"]
        if body.rotateToken:
            token_plain = secrets.token_urlsafe(24)
            token_hash = sha256_text(token_plain)
        conn.execute(
            "UPDATE api_settings SET port=?, token_hash=?, default_model_id=? WHERE id='default'",
            (port, token_hash, default_model),
        )
        out = {
            "port": port,
            "running": bool(row["running"]),
            "defaultModelId": default_model,
            "hasToken": bool(token_hash),
        }
        if token_plain:
            out["token"] = token_plain
        return out


@app.post("/v1/api-settings/start")
def start_api() -> dict[str, Any]:
    with STORE.connect() as conn:
        row = conn.execute("SELECT * FROM api_settings WHERE id='default'").fetchone()
        conn.execute("UPDATE api_settings SET running=1 WHERE id='default'")
        return {
            "running": True,
            "port": row["port"],
            "baseUrl": f"http://127.0.0.1:{row['port']}/v1",
        }


@app.post("/v1/api-settings/stop")
def stop_api() -> dict[str, bool]:
    with STORE.connect() as conn:
        conn.execute("UPDATE api_settings SET running=0 WHERE id='default'")
    return {"running": False}


@app.post("/v1/external/tts")
def external_tts(
    body: ExternalTtsBody,
    authorization: str | None = Header(default=None),
):
    with STORE.connect() as conn:
        settings = conn.execute("SELECT * FROM api_settings WHERE id='default'").fetchone()
        if not settings["running"]:
            raise_error("ApiAuthFailed", "Authorization", 401)
        if not authorization or not authorization.startswith("Bearer "):
            raise_error("ApiAuthFailed", "Authorization", 401)
        token = authorization.removeprefix("Bearer ").strip()
        if not settings["token_hash"] or sha256_text(token) != settings["token_hash"]:
            raise_error("ApiAuthFailed", "Authorization", 401)
        model_id = body.modelId or settings["default_model_id"]
        if not model_id:
            raise_error("ModelNotFound", "modelId", 422)
        model = conn.execute("SELECT * FROM models WHERE id=?", (model_id,)).fetchone()
        if not model:
            raise_error("ModelNotFound", "modelId", 404)
        if model["status"] != "ready":
            raise_error("ModelNotReady", "modelId", 409)
        conn.execute(
            "UPDATE script_text SET body=?, source='manual', updated_at=? WHERE id='active'",
            (body.text, NOW()),
        )
    job = joblib.create_job("tts", None)
    joblib.run_tts(job["id"], model_id, "active")
    with STORE.connect() as conn:
        job_row = conn.execute("SELECT * FROM jobs WHERE id=?", (job["id"],)).fetchone()
        if job_row["status"] != "succeeded" or not job_row["target_id"]:
            raise_error(job_row["error_code"] or "TtsFailed", "job")
        render = conn.execute(
            "SELECT * FROM renders WHERE id=?",
            (job_row["target_id"],),
        ).fetchone()
        path = Path(render["path"])
        return Response(content=path.read_bytes(), media_type="audio/wav")


def run() -> None:
    import uvicorn

    uvicorn.run(
        "mira_api.main:app",
        host="127.0.0.1",
        port=int(__import__("os").environ.get("MIRA_PORT", "8741")),
        reload=False,
    )


if __name__ == "__main__":
    run()
