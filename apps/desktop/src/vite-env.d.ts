/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MIRA_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  miraDesktop?: { platform: string };
  miraUpdater?: {
    getVersion: () => Promise<string>;
    check: () => Promise<{ ok: boolean; packaged?: boolean }>;
    installAndRestart: () => Promise<{ ok: boolean }>;
    onStatus: (
      callback: (payload: {
        status: string;
        version?: string;
        percent?: number;
        message?: string;
      }) => void,
    ) => () => void;
  };
}
