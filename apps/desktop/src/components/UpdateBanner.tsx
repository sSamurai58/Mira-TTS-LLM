import { useEffect, useState } from "react";
import { Button } from "./ui";

export type UpdateStatusPayload = {
  status: "checking" | "available" | "downloading" | "ready" | "upToDate" | "error" | "idle";
  version?: string;
  percent?: number;
  message?: string;
};

const initial: UpdateStatusPayload = { status: "idle" };

export function UpdateBanner() {
  const [state, setState] = useState<UpdateStatusPayload>(initial);
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    const updater = window.miraUpdater;
    if (!updater) return;

    void updater.getVersion().then(setVersion);
    const off = updater.onStatus((payload) =>
      setState({
        status: payload.status as UpdateStatusPayload["status"],
        version: payload.version,
        percent: payload.percent,
        message: payload.message,
      }),
    );
    return off;
  }, []);

  if (!window.miraUpdater) {
    return null;
  }

  if (state.status === "idle" || state.status === "upToDate") {
    return null;
  }

  const text = (() => {
    switch (state.status) {
      case "checking":
        return "Проверяем обновления…";
      case "available":
        return `Доступна версия ${state.version ?? ""}`.trim();
      case "downloading":
        return `Скачиваем обновление… ${state.percent ?? 0}%`;
      case "ready":
        return `Обновление ${state.version ?? ""} готово. Перезапустите Mira.`;
      case "error":
        return state.message || "Не удалось проверить обновления. Проверьте сеть и повторите.";
      default:
        return "";
    }
  })();

  return (
    <div
      className="banner"
      role="status"
      aria-live="polite"
      style={{
        margin: "0 0 16px",
        borderColor:
          state.status === "ready"
            ? "var(--success)"
            : state.status === "error"
              ? "var(--danger)"
              : "var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div>{text}</div>
        {version ? <div className="mono muted">текущая {version}</div> : null}
      </div>
      <div className="row">
        {state.status === "ready" ? (
          <Button onClick={() => void window.miraUpdater?.installAndRestart()}>
            Перезапустить
          </Button>
        ) : null}
        {state.status === "error" || state.status === "available" ? (
          <Button variant="secondary" onClick={() => void window.miraUpdater?.check()}>
            Проверить обновления
          </Button>
        ) : null}
      </div>
    </div>
  );
}
