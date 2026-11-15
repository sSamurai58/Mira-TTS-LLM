import { useEffect, useRef, useState } from "react";
import {
  api,
  MiraApiError,
  pollJob,
  type VoiceModel,
} from "../api/client";
import { Button, ListRow, StatusPill, TextField } from "../components/ui";
import type { ScreenId } from "../App";

export function ModelsScreen({
  datasetId,
  onNavigate,
  onModelChange,
}: {
  datasetId: string | null;
  onNavigate: (id: ScreenId) => void;
  onModelChange: (id: string | null, name: string | null) => void;
}) {
  const [models, setModels] = useState<VoiceModel[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("voice1");
  const [rights, setRights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const r = await api.listModels();
    setModels(r.items);
    const ready = r.items.find((m) => m.status === "ready");
    const sel = r.items.find((m) => m.id === selected) ?? ready ?? r.items[0] ?? null;
    setSelected(sel?.id ?? null);
    onModelChange(sel?.id ?? null, sel?.name ?? null);
  }

  useEffect(() => {
    refresh().catch((e) =>
      setError(e instanceof MiraApiError ? e.message : "Ошибка загрузки моделей."),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function train() {
    if (!datasetId) {
      setError("Нужен датасет с принятыми сегментами.");
      return;
    }
    if (!rights) {
      setError("Подтвердите право использовать этот голос.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { model, job } = await api.trainModel(datasetId, name.trim() || "voice1", true);
      setSelected(model.id);
      await pollJob(job.id, async () => {
        const m = await api.getModel(model.id);
        setModels((prev) => {
          const others = prev.filter((x) => x.id !== m.id);
          return [...others, m];
        });
      });
      await refresh();
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "Обучение не завершилось.");
    } finally {
      setLoading(false);
    }
  }

  async function onImport(file: File) {
    if (!rights) {
      setError("Подтвердите право использовать этот голос.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.importModel(file, true);
      await refresh();
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "Пакет модели не открылся.");
    } finally {
      setLoading(false);
    }
  }

  const current = models.find((m) => m.id === selected) ?? null;
  const tone =
    current?.status === "ready"
      ? "success"
      : current?.status === "failed"
        ? "danger"
        : current?.status === "training"
          ? "action"
          : "mute";

  return (
    <div className="stack">
      <h1 className="title-screen">Модели</h1>
      <p className="muted" style={{ margin: 0 }}>
        Озвучка в стиле вашего датасета.
      </p>
      {error ? <div className="banner error">{error}</div> : null}
      <label className="row" style={{ gap: 8 }}>
        <input
          type="checkbox"
          checked={rights}
          onChange={(e) => setRights(e.target.checked)}
        />
        <span>У меня есть право использовать этот голос в модели</span>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
        <div style={{ border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
          {models.map((m) => (
            <ListRow
              key={m.id}
              selected={m.id === selected}
              onClick={() => {
                setSelected(m.id);
                onModelChange(m.id, m.name);
              }}
            >
              <span>{m.name}</span>
              <StatusPill
                tone={
                  m.status === "ready" ? "success" : m.status === "failed" ? "danger" : "action"
                }
              >
                {m.status}
              </StatusPill>
            </ListRow>
          ))}
          {!models.length ? (
            <div style={{ padding: 16 }} className="muted">
              Моделей пока нет.
            </div>
          ) : null}
        </div>
        <div className="stack">
          <h2 className="title-block">Новая модель</h2>
          <TextField label="Имя" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="row">
            <Button onClick={train} disabled={loading || !rights}>
              {loading && current?.status === "training" ? `Обучаем… ${current.progressPct ?? 0}%` : "Обучить модель"}
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={loading || !rights}>
              Импортировать модель
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".mira-model"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = "";
              }}
            />
          </div>
          {current ? (
            <div className="stack" style={{ gap: 12 }}>
              <h2 className="title-block">{current.name}</h2>
              <StatusPill tone={tone as "mute" | "action" | "success" | "danger"}>
                {current.status}
                {current.status === "training" ? ` · ${current.progressPct ?? 0}%` : ""}
              </StatusPill>
              <p className="mono muted" style={{ margin: 0 }}>
                {current.id}
              </p>
              <div className="row">
                <a
                  href={api.exportModelUrl(current.id)}
                  style={{ color: "var(--action)" }}
                  aria-disabled={current.status !== "ready"}
                >
                  Экспортировать
                </a>
                <Button
                  variant="secondary"
                  disabled={current.status !== "ready"}
                  onClick={() => onNavigate("text")}
                >
                  К тексту
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
