import { useEffect, useState } from "react";
import { api, MiraApiError } from "../api/client";
import { Button } from "../components/ui";
import type { ScreenId } from "../App";

export function TextScreen({ onNavigate }: { onNavigate: (id: ScreenId) => void }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getScript()
      .then((s) => setBody(s.body))
      .catch((e) => setError(e instanceof MiraApiError ? e.message : "Ошибка загрузки текста."));
  }, []);

  async function save() {
    setError(null);
    try {
      const s = await api.saveScript(body);
      setBody(s.body);
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "Не удалось сохранить.");
    }
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      await save();
      const r = await api.generateScript();
      setBody(r.text.body);
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "LLM не вернул текст.");
    } finally {
      setLoading(false);
    }
  }

  async function improve() {
    setLoading(true);
    setError(null);
    try {
      await api.saveScript(body);
      const r = await api.improveScript();
      setBody(r.text.body);
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "LLM не вернул текст.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <h1 className="title-screen">Текст</h1>
      {error ? <div className="banner error">{error}</div> : null}
      <label htmlFor="script" className="meta">
        Текст озвучки
      </label>
      <textarea
        id="script"
        value={body}
        disabled={loading}
        placeholder="Введите текст озвучки или сгенерируйте."
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => void save()}
        style={{
          minHeight: 280,
          padding: 16,
          borderRadius: 6,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          resize: "vertical",
          lineHeight: "22px",
        }}
      />
      <div className="row">
        <Button onClick={generate} disabled={loading}>
          {loading ? "Пишем…" : "Сгенерировать текст"}
        </Button>
        <Button variant="secondary" onClick={improve} disabled={loading || !body.trim()}>
          Улучшить текст
        </Button>
        <Button variant="secondary" onClick={() => onNavigate("tts")} disabled={!body.trim()}>
          К озвучке
        </Button>
      </div>
    </div>
  );
}
