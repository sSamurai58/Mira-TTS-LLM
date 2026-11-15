import type { ReactNode } from "react";
import type { ScreenId } from "../App";

const STEPS: { id: ScreenId; label: string }[] = [
  { id: "studio", label: "Студия" },
  { id: "dataset", label: "Датасет" },
  { id: "segmentation", label: "Нарезка" },
  { id: "models", label: "Модели" },
  { id: "text", label: "Текст" },
  { id: "tts", label: "Озвучка" },
  { id: "connection", label: "Подключение" },
];

export function AppShell({
  screen,
  onNavigate,
  subtitle,
  children,
}: {
  screen: ScreenId;
  onNavigate: (id: ScreenId) => void;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          height: 52,
          padding: "0 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--panel)",
        }}
      >
        <strong style={{ fontSize: 16, fontWeight: 600 }}>Mira</strong>
        <span className="meta">Studio Path</span>
        {subtitle ? <span className="mono muted">{subtitle}</span> : null}
      </header>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <nav
          aria-label="Путь выпуска"
          style={{
            width: "var(--sidebar-width)",
            flexShrink: 0,
            background: "var(--panel)",
            borderRight: "1px solid var(--line)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {STEPS.map((step) => {
            const current = step.id === screen;
            return (
              <button
                key={step.id}
                type="button"
                aria-current={current ? "page" : undefined}
                onClick={() => onNavigate(step.id)}
                style={{
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 6,
                  border: "none",
                  textAlign: "left",
                  background: current ? "var(--surface)" : "transparent",
                  color: current ? "var(--ink)" : "var(--mute)",
                  fontWeight: current ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {step.label}
              </button>
            );
          })}
        </nav>
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: 24,
            background: "var(--canvas)",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: 24,
              minHeight: "100%",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
