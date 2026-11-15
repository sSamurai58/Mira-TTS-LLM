#!/usr/bin/env python3
"""Studio Path smoke: dataset → segment → train → export/import → tts → external API."""

from __future__ import annotations

import os
import sys
import time
import wave
from pathlib import Path

# Allow running from repo root without install.
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("MIRA_DATA_DIR", str(Path("/tmp") / f"mira-ci-smoke-{os.getpid()}"))
Path(os.environ["MIRA_DATA_DIR"]).mkdir(parents=True, exist_ok=True)

from fastapi.testclient import TestClient  # noqa: E402
from mira_api.main import app  # noqa: E402


def wait_job(client: TestClient, job_id: str, timeout_s: float = 20.0) -> dict:
    start = time.time()
    while time.time() - start < timeout_s:
        job = client.get(f"/v1/jobs/{job_id}").json()
        if job["status"] in ("succeeded", "failed"):
            return job
        time.sleep(0.05)
    raise SystemExit(f"job timeout: {job_id}")


def main() -> None:
    client = TestClient(app)
    wav = Path(os.environ["MIRA_DATA_DIR"]) / "sample.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(22050)
        w.writeframes(b"\x00\x00" * 22050 * 20)

    ds = client.post("/v1/datasets", json={"name": "ci-demo"}).json()["id"]
    with wav.open("rb") as f:
        smp = client.post(
            f"/v1/datasets/{ds}/samples/import",
            files={"file": ("a.wav", f, "audio/wav")},
        )
        assert smp.status_code == 200, smp.text
        sample_id = smp.json()["id"]

    job = client.post(f"/v1/datasets/{ds}/segmentation", json={}).json()
    assert wait_job(client, job["id"])["status"] == "succeeded"
    segs = client.get(f"/v1/samples/{sample_id}/segments").json()["items"]
    assert len(segs) >= 3
    for s in segs:
        client.patch(f"/v1/segments/{s['id']}", json={"status": "accepted"})

    train = client.post(
        "/v1/models/train",
        json={"datasetId": ds, "name": "voice1", "voiceRightsConfirmed": True},
    )
    assert train.status_code == 200, train.text
    model_id = train.json()["model"]["id"]
    for _ in range(100):
        m = client.get(f"/v1/models/{model_id}").json()
        if m["status"] in ("ready", "failed"):
            break
        time.sleep(0.05)
    assert m["status"] == "ready", m

    exp = client.get(f"/v1/models/{model_id}/export")
    assert exp.status_code == 200
    imp = client.post(
        "/v1/models/import",
        files={"file": ("v.mira-model", exp.content, "application/octet-stream")},
        data={"voiceRightsConfirmed": "true"},
    )
    assert imp.status_code == 200, imp.text

    client.put("/v1/script", json={"body": "Привет CI"})
    tts = client.post("/v1/tts", json={"modelId": model_id})
    assert tts.status_code == 200 and "render" in tts.json(), tts.text

    tok = client.patch(
        "/v1/api-settings",
        json={"rotateToken": True, "defaultModelId": model_id},
    ).json()["token"]
    client.post("/v1/api-settings/start")
    assert client.post("/v1/external/tts", json={"text": "hi"}).status_code == 401
    ok = client.post(
        "/v1/external/tts",
        json={"text": "hi"},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert ok.status_code == 200
    assert ok.headers["content-type"].startswith("audio/wav")
    print("SMOKE_OK")


if __name__ == "__main__":
    main()
