from __future__ import annotations

import struct
import wave
from io import BytesIO
from pathlib import Path


SUPPORTED = {"wav", "flac"}
ALLOWED_RATES = {16000, 22050, 24000, 44100, 48000}
SAMPLE_MIN_MS = 500
SAMPLE_MAX_MS = 300_000
SEGMENT_MIN_MS = 50
TRAIN_MIN_ACCEPTED = 3
TRAIN_MIN_ACCEPTED_MS = 15_000


def sniff_format(filename: str, data: bytes) -> str | None:
    name = filename.lower()
    if name.endswith(".wav") or data[:4] == b"RIFF":
        return "wav"
    if name.endswith(".flac") or data[:4] == b"fLaC":
        return "flac"
    return None


def inspect_wav(path: Path) -> tuple[int, int, int]:
    """Return (duration_ms, sample_rate, channels)."""
    with wave.open(str(path), "rb") as wf:
        frames = wf.getnframes()
        rate = wf.getframerate() or 1
        channels = wf.getnchannels()
        duration_ms = int(frames / rate * 1000)
        return duration_ms, rate, channels


def wav_duration_ms(path: Path) -> int:
    duration_ms, _, _ = inspect_wav(path)
    return duration_ms


def write_silence_wav(path: Path, duration_ms: int = 800, rate: int = 22050) -> int:
    n_frames = max(1, int(rate * duration_ms / 1000))
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(b"\x00\x00" * n_frames)
    return duration_ms


def ensure_wav_bytes(data: bytes, fmt: str) -> bytes:
    """v1: accept wav as-is; for flac store raw and report duration heuristically later."""
    if fmt == "wav":
        return data
    # Minimal placeholder wav when only flac bytes provided without decoder.
    buf = BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(22050)
        wf.writeframes(b"\x00\x00" * 22050)
    return buf.getvalue()


def stub_segments(duration_ms: int) -> list[tuple[str, int, int, str]]:
    """Return (kind, start, end, label) covering the sample."""
    if duration_ms <= 0:
        duration_ms = 1000
    chunk = max(200, duration_ms // 4)
    out: list[tuple[str, int, int, str]] = []
    t = 0
    i = 1
    while t < duration_ms:
        end = min(duration_ms, t + chunk)
        kind = "phrase" if (end - t) >= 400 else "word"
        out.append((kind, t, end, f"seg-{i}"))
        t = end
        i += 1
    return out


def package_manifest(name: str, model_id: str) -> dict:
    return {"name": name, "modelId": model_id, "version": 1, "format": "mira-model"}
