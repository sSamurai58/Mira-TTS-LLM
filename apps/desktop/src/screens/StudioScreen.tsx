import { useEffect, useState } from "react";
import { api, MiraApiError, type Dataset, type VoiceModel } from "../api/client";
import { Button } from "../components/ui";
import type { ScreenId } from "../App";

export function StudioScreen({
  onNavigate,
}: {
  onNavigate: (id: ScreenId) => void;
}) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [models, setModels] = useState<VoiceModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api.health();
        const [d, m] = await Promise.all([api.listDatasets(), api.listModels()]);
        if (!alive) return;
        setDatasets(d.items);
        setModels(m.items);
        const failed = m.items.find((x) => x.status === "failed");
        setError(failed ? "Последняя задача не завершилась. Откройте шаг и повторите." : null);
      } catch (e) {
        if (!alive) return;
        setError(
          e instanceof MiraApiError
            ? e.message
            : "Не удалось выполнить запрос. Проверьте, что studio-api запущен.",
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const empty = datasets.length === 0 && models.length === 0;

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <h1 className="title-screen">Студия</h1>
      <p style={{ margin: 0 }}>
        Голос → нарезка → модель → текст → озвучка → подключение к проектам.
      </p>
      {loading ? <p className="muted">Загрузка…</p> : null}
      {!loading && empty ? (
        <p className="muted">Добавьте голос, чтобы собрать модель и озвучку.</p>
      ) : null}
      {error ? <div className="banner error">{error}</div> : null}
      <div className="row" style={{ position: "relative", zIndex: 1 }}>
        <Button
          data-testid="cta-start-dataset"
          aria-label="Начать с датасета"
          onClick={() => onNavigate("dataset")}
        >
          Начать с датасета
        </Button>
        <Button
          variant="secondary"
          data-testid="cta-import-model"
          onClick={() => onNavigate("models")}
        >
          Импортировать модель
        </Button>
        {!empty ? (
          <Button
            variant="secondary"
            data-testid="cta-continue"
            onClick={() =>
              onNavigate(models.some((m) => m.status === "ready") ? "text" : "segmentation")
            }
          >
            Продолжить путь
          </Button>
        ) : null}
      </div>
      <div className="meta">
        Датасет: {datasets[0]?.name ?? "—"} · Модель:{" "}
        <span className="mono">{models.find((m) => m.status === "ready")?.name ?? "—"}</span>
      </div>
    </div>
  );
}
