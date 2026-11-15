import { useEffect, useState } from "react";
import { api, MiraApiError, type ApiSettings, type VoiceModel } from "../api/client";
import { Button, StatusPill } from "../components/ui";

export function ConnectionScreen({
  modelId,
  onToast,
}: {
  modelId: string | null;
  onToast: (msg: string) => void;
}) {
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [models, setModels] = useState<VoiceModel[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [port, setPort] = useState(8741);
  const [error, setError] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>("");
  const hasUpdater = typeof window !== "undefined" && Boolean(window.miraUpdater);

  async function refresh() {
    const [s, m] = await Promise.all([api.getApiSettings(), api.listModels()]);
    setSettings(s);
    setPort(s.port);
    setModels(m.items.filter((x) => x.status === "ready"));
  }

  useEffect(() => {
    refresh().catch((e) =>
      setError(e instanceof MiraApiError ? e.message : "Ошибка настроек API."),
    );
    void window.miraUpdater?.getVersion().then(setAppVersion);
  }, []);

  async function rotate() {
    setError(null);
    try {
      const s = await api.patchApiSettings({
        rotateToken: true,
        defaultModelId: modelId ?? settings?.defaultModelId ?? undefined,
        port,
      });
      setSettings(s);
      if (s.token) setToken(s.token);
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "Не удалось обновить настройки.");
    }
  }

  async function toggle() {
    setError(null);
    try {
      if (settings?.running) {
        await api.stopApi();
      } else {
        await api.patchApiSettings({
          port,
          defaultModelId: modelId ?? settings?.defaultModelId ?? undefined,
        });
        await api.startApi();
      }
      await refresh();
    } catch (e) {
      setError(e instanceof MiraApiError ? e.message : "Порт занят. Выберите другой порт и запустите снова.");
    }
  }

  const baseUrl = `http://127.0.0.1:${settings?.port ?? port}/v1`;
  const example = `curl -X POST ${baseUrl}/external/tts \\\n  -H "Authorization: Bearer ${token ?? "<token>"}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"text":"Привет из другого проекта"}' --output out.wav`;

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1 className="title-screen">Подключение</h1>
      {error ? <div className="banner error">{error}</div> : null}
      <section className="stack" style={{ gap: 12 }}>
        <h2 className="title-block">Обновления</h2>
        <p className="meta" style={{ margin: 0 }}>
          Проверка GitHub Releases, фоновое скачивание, перезапуск.
          {appVersion ? (
            <>
              {" "}
              Версия: <span className="mono">{appVersion}</span>
            </>
          ) : null}
        </p>
        <div className="row">
          <Button
            variant="secondary"
            disabled={!hasUpdater}
            onClick={() => void window.miraUpdater?.check()}
          >
            Проверить обновления
          </Button>
        </div>
        {!hasUpdater ? (
          <p className="muted" style={{ margin: 0 }}>
            Автообновление доступно в установленном приложении (релиз). В браузерном dev-режиме
            кнопки нет.
          </p>
        ) : null}
      </section>
      <div className="row">
        <StatusPill tone={settings?.running ? "success" : "mute"}>
          {settings?.running ? "API включён" : "API выключен"}
        </StatusPill>
        <Button onClick={toggle} variant={settings?.running ? "secondary" : "primary"}>
          {settings?.running ? "Остановить API" : "Запустить API"}
        </Button>
        <Button variant="secondary" onClick={rotate}>
          Выпустить токен
        </Button>
      </div>
      <label className="meta" htmlFor="port">
        Порт
      </label>
      <input
        id="port"
        type="number"
        value={port}
        onChange={(e) => setPort(Number(e.target.value))}
        style={{ height: 36, width: 120, padding: "0 12px", borderRadius: 6, border: "1px solid var(--line)" }}
      />
      <label className="meta" htmlFor="defModel">
        Модель по умолчанию
      </label>
      <select
        id="defModel"
        value={modelId ?? settings?.defaultModelId ?? ""}
        onChange={(e) =>
          void api
            .patchApiSettings({ defaultModelId: e.target.value || null })
            .then(refresh)
            .catch((err) => setError(err instanceof MiraApiError ? err.message : "Ошибка."))
        }
        style={{ height: 36, borderRadius: 6, border: "1px solid var(--line)", padding: "0 12px" }}
      >
        <option value="">—</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <div className="row">
        <code className="mono" style={{ padding: 16, background: "var(--panel)", borderRadius: 6, display: "block", width: "100%" }}>
          {baseUrl}
        </code>
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(baseUrl);
            onToast("URL скопирован");
          }}
        >
          Скопировать URL
        </Button>
      </div>
      {token ? (
        <p className="mono" style={{ margin: 0 }}>
          token: {token}
        </p>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          Токен показывается один раз после выпуска.
        </p>
      )}
      <pre
        className="mono"
        style={{
          margin: 0,
          padding: 16,
          borderRadius: 6,
          background: "var(--panel)",
          whiteSpace: "pre-wrap",
        }}
      >
        {example}
      </pre>
    </div>
  );
}
