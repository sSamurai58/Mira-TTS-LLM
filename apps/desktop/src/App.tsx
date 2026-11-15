import { useState } from "react";
import { AppShell } from "./shell/AppShell";
import { StudioScreen } from "./screens/StudioScreen";
import { DatasetScreen } from "./screens/DatasetScreen";
import { SegmentationScreen } from "./screens/SegmentationScreen";
import { ModelsScreen } from "./screens/ModelsScreen";
import { TextScreen } from "./screens/TextScreen";
import { TtsScreen } from "./screens/TtsScreen";
import { ConnectionScreen } from "./screens/ConnectionScreen";

export type ScreenId =
  | "studio"
  | "dataset"
  | "segmentation"
  | "models"
  | "text"
  | "tts"
  | "connection";

export function App() {
  const [screen, setScreen] = useState<ScreenId>("studio");
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  const subtitle = [datasetName, modelName].filter(Boolean).join(" · ") || undefined;

  return (
    <>
      <AppShell screen={screen} onNavigate={setScreen} subtitle={subtitle}>
        {screen === "studio" ? <StudioScreen onNavigate={setScreen} /> : null}
        {screen === "dataset" ? (
          <DatasetScreen
            onNavigate={setScreen}
            onDatasetChange={(id, name) => {
              setDatasetId(id);
              setDatasetName(name);
            }}
          />
        ) : null}
        {screen === "segmentation" ? (
          <SegmentationScreen datasetId={datasetId} onNavigate={setScreen} />
        ) : null}
        {screen === "models" ? (
          <ModelsScreen
            datasetId={datasetId}
            onNavigate={setScreen}
            onModelChange={(id, name) => {
              setModelId(id);
              setModelName(name);
            }}
          />
        ) : null}
        {screen === "text" ? <TextScreen onNavigate={setScreen} /> : null}
        {screen === "tts" ? (
          <TtsScreen modelId={modelId} onNavigate={setScreen} onToast={showToast} />
        ) : null}
        {screen === "connection" ? (
          <ConnectionScreen modelId={modelId} onToast={showToast} />
        ) : null}
      </AppShell>
      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
