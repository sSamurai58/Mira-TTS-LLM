import { useEffect, useState } from "react";
import {
  api,
  MiraApiError,
  pollJob,
  type Segment,
  type VoiceSample,
} from "../api/client";
import { Button, ListRow, StatusPill } from "../components/ui";
import type { ScreenId } from "../App";

export function SegmentationScreen({
  datasetId,
  onNavigate,
}: {
  datasetId: string | null;
  onNavigate: (id: ScreenId) => void;
}) {
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) return;
    api
      .listSamples(datasetId)
      .then((r) => {
        setSamples(r.items);
        setSampleId(r.items[0]?.id ?? null);
      })
      .catch((e) => setError(e instanceof MiraApiError ? e.message : "Ошибка загрузки."));
  }, [datasetId]);

  useEffect(() => {
    if (!sampleId) {
      setSegments([]);
      return;
    }
    api
      .listSegments(sampleId)
      .then((r) => setSegments(r.items))
      .catch(() => setSegments([]));
  }, [sampleId]);

  async function runSegmentation() {
    if (!datasetId) {
      setError("Сначала создайте датасет и добавьте семпл.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const job = await api.startSegmentation(datasetId, sampleId ?? undefined);
      const done = await pollJob(job.id);
      if (done.status === "failed") {
        setError("Нарезка не завершилась. Проверьте семпл и запустите снова.");
      } else if (sampleId) {
        const segs = await api.listSegments(sampleId);
        setSegments(segs.items);
      }
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "Нарезка не завершилась.");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: Segment["status"]) {
    try {
      const updated = await api.updateSegment(id, { status });
      setSegments((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "Не удалось обновить сегмент.");
    }
  }

  const sample = samples.find((s) => s.id === sampleId);
  const duration = sample?.durationMs ?? 1;

  return (
    <div className="stack">
      <h1 className="title-screen">Нарезка</h1>
      {!datasetId || samples.length === 0 ? (
        <p className="muted">Нет семплов. Добавьте голос на экране Датасет.</p>
      ) : null}
      {error ? <div className="banner error">{error}</div> : null}
      <div className="row">
        <label className="meta" htmlFor="sample">
          Семпл
        </label>
        <select
          id="sample"
          value={sampleId ?? ""}
          onChange={(e) => setSampleId(e.target.value)}
          disabled={!samples.length || loading}
          style={{ height: 36, borderRadius: 6, border: "1px solid var(--line)", padding: "0 12px" }}
        >
          {samples.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button onClick={runSegmentation} disabled={!datasetId || loading || !samples.length}>
          {loading ? "Нарезаем…" : "Запустить нарезку"}
        </Button>
        <Button variant="secondary" onClick={() => onNavigate("models")} disabled={!segments.length}>
          К моделям
        </Button>
      </div>
      <div
        aria-label="Волна и сегменты"
        style={{
          position: "relative",
          height: 160,
          border: "1px solid var(--line)",
          borderRadius: 6,
          background: "color-mix(in srgb, var(--panel) 35%, var(--surface))",
          overflow: "hidden",
        }}
      >
        {segments.map((s) => (
          <div
            key={s.id}
            title={`${s.startMs}-${s.endMs}`}
            style={{
              position: "absolute",
              top: 24,
              bottom: 24,
              left: `${(s.startMs / duration) * 100}%`,
              width: `${((s.endMs - s.startMs) / duration) * 100}%`,
              background:
                s.status === "rejected"
                  ? "transparent"
                  : "color-mix(in srgb, var(--action) 20%, transparent)",
              border:
                s.status === "rejected"
                  ? "1px dashed var(--mute)"
                  : "1px solid color-mix(in srgb, var(--action) 40%, transparent)",
            }}
          />
        ))}
        <span className="mono muted" style={{ position: "absolute", left: 12, bottom: 8 }}>
          0 ms
        </span>
        <span className="mono muted" style={{ position: "absolute", right: 12, bottom: 8 }}>
          {duration} ms
        </span>
      </div>
      <div style={{ border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
        {segments.map((s) => (
          <ListRow key={s.id}>
            <span>
              {s.label ?? s.kind}{" "}
              <span className="mono muted">
                {s.startMs}–{s.endMs}
              </span>
            </span>
            <span className="row">
              <StatusPill
                tone={s.status === "accepted" ? "success" : s.status === "rejected" ? "mute" : "action"}
              >
                {s.status}
              </StatusPill>
              <Button variant="secondary" onClick={() => setStatus(s.id, "accepted")} disabled={loading}>
                Принять
              </Button>
              <Button variant="secondary" onClick={() => setStatus(s.id, "rejected")} disabled={loading}>
                Отклонить
              </Button>
            </span>
          </ListRow>
        ))}
        {!segments.length ? (
          <div style={{ padding: 16 }} className="muted">
            Сегментов пока нет. Запустите нарезку.
          </div>
        ) : null}
      </div>
    </div>
  );
}
