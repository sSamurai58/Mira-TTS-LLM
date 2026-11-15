import { useEffect, useRef, useState } from "react";
import {
  api,
  MiraApiError,
  type Dataset,
  type VoiceSample,
} from "../api/client";
import { Button, ListRow, TextField } from "../components/ui";
import type { ScreenId } from "../App";

export function DatasetScreen({
  onNavigate,
  onDatasetChange,
}: {
  onNavigate: (id: ScreenId) => void;
  onDatasetChange: (id: string | null, name: string | null) => void;
}) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [name, setName] = useState("Голос 1");
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const d = await api.listDatasets();
    setDatasets(d.items);
    const current = d.items.find((x) => x.id === datasetId) ?? d.items[0] ?? null;
    setDatasetId(current?.id ?? null);
    onDatasetChange(current?.id ?? null, current?.name ?? null);
    if (current) {
      const s = await api.listSamples(current.id);
      setSamples(s.items);
    } else {
      setSamples([]);
    }
  }

  useEffect(() => {
    refresh().catch((e) =>
      setError(e instanceof MiraApiError ? e.message : "Ошибка загрузки датасета."),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureDataset(): Promise<string> {
    if (datasetId) return datasetId;
    const ds = await api.createDataset(name.trim() || "Голос 1");
    setDatasetId(ds.id);
    onDatasetChange(ds.id, ds.name);
    return ds.id;
  }

  async function onImport(file: File) {
    setError(null);
    setLoading(true);
    try {
      const id = await ensureDataset();
      await api.importSample(id, file);
      await refresh();
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "Не удалось импортировать файл.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleRecord() {
    setError(null);
    if (recording && mediaRef.current) {
      mediaRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => chunksRef.current.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        // Convert via AudioContext to wav is heavy; send as wav-named webm may fail format check.
        // For v1: ask user to import wav if browser can't record wav. Prefer MediaRecorder wav if available.
        const wavBlob = blob.type.includes("wav")
          ? blob
          : await webmToWavFallback(blob);
        try {
          const id = await ensureDataset();
          await api.recordingSample(id, wavBlob, "recording.wav");
          await refresh();
        } catch (e) {
          setError(
            e instanceof MiraApiError
              ? e.message
              : "Запись не сохранена. Импортируйте WAV вручную.",
          );
        }
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("Нет доступа к микрофону. Импортируйте аудиофайл.");
    }
  }

  return (
    <div className="stack">
      <h1 className="title-screen">Датасет</h1>
      <TextField label="Имя датасета" value={name} onChange={(e) => setName(e.target.value)} />
      {error ? <div className="banner error">{error}</div> : null}
      {loading ? <p className="muted">Загрузка…</p> : null}
      {!loading && samples.length === 0 ? (
        <p className="muted">Запишите голос или импортируйте файл WAV/FLAC.</p>
      ) : null}
      <div className="row">
        <Button variant={recording ? "danger" : "primary"} onClick={toggleRecord} disabled={loading}>
          {recording ? "Остановить запись" : "Записать семпл"}
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={recording || loading}>
          Импортировать аудио
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".wav,.flac,audio/wav,audio/flac"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="secondary"
          disabled={samples.length === 0}
          onClick={() => onNavigate("segmentation")}
        >
          К нарезке
        </Button>
      </div>
      {recording ? (
        <p className="meta">
          <span style={{ color: "var(--danger)" }}>●</span> Идёт запись…
        </p>
      ) : null}
      <div style={{ border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
        {samples.map((s) => (
          <ListRow key={s.id}>
            <span>{s.name}</span>
            <span className="mono muted">{s.durationMs} ms · {s.format}</span>
          </ListRow>
        ))}
        {datasets.length === 0 && samples.length === 0 ? (
          <div style={{ padding: 16 }} className="muted">
            Список семплов пуст.
          </div>
        ) : null}
      </div>
    </div>
  );
}

async function webmToWavFallback(blob: Blob): Promise<Blob> {
  // Decode and rewrite as PCM wav for API format rules.
  const buffer = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audioBuf = await ctx.decodeAudioData(buffer.slice(0));
    const length = audioBuf.length;
    const rate = Math.round(audioBuf.sampleRate);
    const channel = audioBuf.getChannelData(0);
    const pcm = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeStr = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + pcm.byteLength, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, pcm.byteLength, true);
    return new Blob([header, pcm.buffer], { type: "audio/wav" });
  } finally {
    await ctx.close();
  }
}
