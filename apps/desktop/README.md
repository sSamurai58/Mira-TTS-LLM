# Mira Desktop

Electron + React UI для Mira v1 Studio Path.

Спецификация: [`docs/DESIGN.md`](../../docs/DESIGN.md)  
Контракт: [`docs/CONTRACT.md`](../../docs/CONTRACT.md)

## Запуск

В одном терминале API:

```bash
cd services/studio-api
pip install -e .
MIRA_PORT=8741 mira-studio-api
```

В другом — UI:

```bash
cd apps/desktop
npm install
npm run dev          # renderer на http://127.0.0.1:5173
npm run desktop      # Electron + Vite
```

Vite проксирует `/v1` на `http://127.0.0.1:8741`.
