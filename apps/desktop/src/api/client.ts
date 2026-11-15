export type ApiError = {
  code: string;
  field: string | null;
  message: string;
};

export class MiraApiError extends Error {
  code: string;
  field: string | null;

  constructor(err: ApiError) {
    super(err.message);
    this.code = err.code;
    this.field = err.field;
  }
}

const BASE = import.meta.env.VITE_MIRA_API_BASE ?? "";

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (contentType.includes("application/json")) {
      const body = await res.json();
      const err = body.error as ApiError | undefined;
      if (err?.code) throw new MiraApiError(err);
    }
    throw new MiraApiError({
      code: "HttpError",
      field: null,
      message: "Не удалось выполнить запрос. Проверьте, что studio-api запущен.",
    });
  }
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return undefined as T;
}

export type Dataset = {
  id: string;
  name: string;
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
};

export type VoiceSample = {
  id: string;
  datasetId: string;
  name: string;
  path: string;
  durationMs: number;
  format: string;
  createdAt: string;
};

export type Segment = {
  id: string;
  sampleId: string;
  datasetId: string;
  kind: string;
  startMs: number;
  endMs: number;
  label: string | null;
  status: "accepted" | "rejected" | "pending";
  createdAt: string;
};

export type VoiceModel = {
  id: string;
  name: string;
  status: "training" | "ready" | "failed";
  datasetId: string | null;
  source: string;
  packagePath: string | null;
  progressPct: number | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScriptText = {
  id: string;
  body: string;
  source: string;
  updatedAt: string;
};

export type RenderJob = {
  id: string;
  kind: string;
  status: string;
  targetId: string | null;
  progressPct: number;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AudioRender = {
  id: string;
  modelId: string;
  scriptTextId: string;
  path: string;
  durationMs: number;
  createdAt: string;
};

export type ApiSettings = {
  port: number;
  running: boolean;
  defaultModelId: string | null;
  hasToken: boolean;
  token?: string;
};

export const api = {
  health: () => request<{ status: string }>("/health"),
  listDatasets: () => request<{ items: Dataset[] }>("/v1/datasets"),
  createDataset: (name: string) =>
    request<Dataset>("/v1/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  listSamples: (datasetId: string) =>
    request<{ items: VoiceSample[] }>(`/v1/datasets/${datasetId}/samples`),
  importSample: async (datasetId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<VoiceSample>(`/v1/datasets/${datasetId}/samples/import`, {
      method: "POST",
      body: fd,
    });
  },
  recordingSample: async (datasetId: string, blob: Blob, name: string) => {
    const fd = new FormData();
    fd.append("file", blob, name);
    return request<VoiceSample>(`/v1/datasets/${datasetId}/samples/recording`, {
      method: "POST",
      body: fd,
    });
  },
  startSegmentation: (datasetId: string, sampleId?: string) =>
    request<RenderJob>(`/v1/datasets/${datasetId}/segmentation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleId ? { sampleId } : {}),
    }),
  listSegments: (sampleId: string) =>
    request<{ items: Segment[] }>(`/v1/samples/${sampleId}/segments`),
  updateSegment: (id: string, patch: Partial<Segment>) =>
    request<Segment>(`/v1/segments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  listModels: () => request<{ items: VoiceModel[] }>("/v1/models"),
  trainModel: (datasetId: string, name: string, voiceRightsConfirmed: boolean) =>
    request<{ model: VoiceModel; job: RenderJob }>("/v1/models/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetId, name, voiceRightsConfirmed }),
    }),
  getModel: (id: string) => request<VoiceModel>(`/v1/models/${id}`),
  importModel: async (file: File, voiceRightsConfirmed: boolean) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("voiceRightsConfirmed", String(voiceRightsConfirmed));
    return request<VoiceModel>("/v1/models/import", { method: "POST", body: fd });
  },
  exportModelUrl: (id: string) => `${BASE}/v1/models/${id}/export`,
  deleteModel: (id: string) =>
    request<{ ok: boolean }>(`/v1/models/${id}`, { method: "DELETE" }),
  getScript: () => request<ScriptText>("/v1/script"),
  saveScript: (body: string) =>
    request<ScriptText>("/v1/script", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }),
  generateScript: (prompt?: string) =>
    request<{ text: ScriptText; job: RenderJob }>("/v1/script/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }),
  improveScript: () =>
    request<{ text: ScriptText; job: RenderJob }>("/v1/script/improve", {
      method: "POST",
    }),
  startTts: (modelId: string) =>
    request<{ render?: AudioRender; job: RenderJob }>("/v1/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId }),
    }),
  renderAudioUrl: (id: string) => `${BASE}/v1/renders/${id}/audio`,
  getJob: (id: string) => request<RenderJob>(`/v1/jobs/${id}`),
  getApiSettings: () => request<ApiSettings>("/v1/api-settings"),
  patchApiSettings: (body: {
    port?: number;
    defaultModelId?: string | null;
    rotateToken?: boolean;
  }) =>
    request<ApiSettings>("/v1/api-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  startApi: () =>
    request<{ running: boolean; port: number; baseUrl: string }>(
      "/v1/api-settings/start",
      { method: "POST" },
    ),
  stopApi: () =>
    request<{ running: boolean }>("/v1/api-settings/stop", { method: "POST" }),
};

export async function pollJob(
  jobId: string,
  onTick?: (job: RenderJob) => void,
  timeoutMs = 20000,
): Promise<RenderJob> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await api.getJob(jobId);
    onTick?.(job);
    if (job.status === "succeeded" || job.status === "failed") return job;
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new MiraApiError({
    code: "HttpError",
    field: null,
    message: "Задача не завершилась вовремя.",
  });
}
