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

## Сборка и обновления

```bash
npm run dist      # локальные установщики без publish
npm run release   # publish на GitHub Releases (нужен GH_TOKEN)
```

Автообновление: `electron-updater` смотрит GitHub Releases репозитория `sSamurai58/Mira-TTS-LLM`.  
Тег `mira-v*` запускает `.github/workflows/release.yml`.

В UI: баннер обновления + «Проверить обновления» на экране Подключение. После скачивания — «Перезапустить».
