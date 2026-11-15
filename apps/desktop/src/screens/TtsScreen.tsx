import { useEffect, useState } from "react";
import {
  api,
  MiraApiError,
  type AudioRender,
  type ScriptText,
  type VoiceModel,
} from "../api/client";
import { Button } from "../components/ui";
import type { ScreenId } from "../App";

export function TtsScreen({
  modelId,
  onNavigate,
  onToast,
}: {
  modelId: string | null;
  onNavigate: (id: ScreenId) => void;
  onToast: (msg: string) => void;
}) {
  const [models, setModels] = useState<VoiceModel[]>([]);
  const [selected, setSelected] = useState<string | null>(modelId);
  const [script, setScript] = useState<ScriptText | null>(null);
  const [render, setRender] = useState<AudioRender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listModels(), api.getScript()])
      .then(([m, s]) => {
        const ready = m.items.filter((x) => x.status === "ready");
        setModels(ready);
        setSelected(modelId && ready.some((x) => x.id === modelId) ? modelId : ready[0]?.id ?? null);
        setScript(s);
      })
      .catch((e) => setError(e instanceof MiraApiError ? e.message : "Ошибка загрузки."));
  }, [modelId]);

  async function speak() {
    if (!selected) {
      setError("Выберите готовую модель.");
      return;
    }
    if (!script?.body.trim()) {
      setError("Нет текста для озвучки. Введите или сгенерируйте текст.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await api.startTts(selected);
      if (r.render) setRender(r.render);
      else setError("Озвучка не собралась. Выберите модель и повторите.");
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "Озвучка не собралась.");
    } finally {
      setLoading(false);
    }
  }

  const blocked = !selected || !script?.body.trim();

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <h1 className="title-screen">Озвучка</h1>
      {error ? <div className="banner error">{error}</div> : null}
      {blocked && !error ? (
        <p className="muted">Нужны готовая модель и непустой текст.</p>
      ) : null}
      <label className="meta" htmlFor="model">
        Модель
      </label>
      <select
        id="model"
        value={selected ?? ""}
        onChange={(e) => setSelected(e.target.value)}
        style={{ height: 36, borderRadius: 6, border: "1px solid var(--line)", padding: "0 12px" }}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <p style={{ margin: 0 }}>{script?.body ? script.body.slice(0, 240) : "—"}</p>
      <div className="row">
        <Button onClick={speak} disabled={loading || blocked}>
          {loading ? "Озвучиваем…" : "Озвучить"}
        </Button>
        <Button variant="secondary" onClick={() => onNavigate("connection")}>
          К подключению
        </Button>
      </div>
      {render ? (
        <div className="stack" style={{ gap: 12 }}>
          <audio controls src={api.renderAudioUrl(render.id)} style={{ width: "100%" }} />
          <span className="mono muted">{render.durationMs} ms</span>
          <a
            href={api.renderAudioUrl(render.id)}
            download={`${render.id}.wav`}
            onClick={() => onToast("Аудио сохранено.")}
            style={{ color: "var(--action)" }}
          >
            Сохранить аудио
          </a>
        </div>
      ) : null}
    </div>
  );
}
