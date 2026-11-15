# DevOps — сдача Mira v1

```text
Окружения:
  - local — API http://127.0.0.1:8741 + UI npm run desktop / npm run dev — разработчик на своей машине
  - staging — артефакт renderer из CI + studio-api с отдельным MIRA_DATA_DIR — владелец репо
  - production — установленный desktop (AppImage/dmg/nsis) + studio-api; выкладка только tag mira-v*
Пайплайн:
  - pull_request / push main — studio-api smoke + desktop typecheck/build — GitHub Checks
  - push tag mira-v* — Release workflow: CI gate + electron-builder publish (Linux AppImage; macOS dmg/zip; Windows nsis; mac/win soft-fail без подписи)
Сборка (команды):
  - API: cd services/studio-api && pip install -e . && python scripts/smoke_path.py
  - Desktop UI: cd apps/desktop && npm ci && npm run typecheck && npm run build
  - Desktop installers: cd apps/desktop && npm run dist
  - Publish: git tag mira-vX.Y.Z && git push origin mira-vX.Y.Z (Actions npm run release)
Выкладка staging:
  - Artifact mira-desktop-renderer или локальный npm run pack
Выкладка production:
  - Tag mira-vX.Y.Z на main после вердикта тестировщика
  - Actions публикует GitHub Release + latest*.yml для electron-updater
  - Пользователь обновляется из приложения (проверка → фон download → Перезапустить)
Секреты (имена):
  - MIRA_LLM_API_KEY
  - MIRA_DATA_DIR / MIRA_PORT
  - GITHUB_TOKEN — только в Actions для publish (встроенный)
  - api token студии — не в CI
Откат:
  - Предыдущий GitHub Release / tag mira-v*; переустановка или откат тега
  - electron-updater ставит выбранный релиз; data dir не откатывается
  - цель: <15 мин
Автообновление:
  - Провайдер: GitHub Releases (sSamurai58/Mira-TTS-LLM)
  - Клиент: electron-updater в packaged app; autoDownload=true; install через quitAndInstall по кнопке «Перезапустить»
  - Фоновая проверка: через 4 с после старта и каждые 6 ч
Логи и проверка живости:
  - GET /health
  - CI зелёный
  - Баннер обновления / экран Подключение → «Проверить обновления»
Миграции:
  - schema on start; удаление mira.db необратимо
Windows installers (локально в репо):
  - `install/windows/Mira-Setup-*-win-x64.exe` — NSIS установщик
  - `install/windows/Mira-Portable-*-win-x64.exe` — портативный запуск
  - `install/windows/INSTALL.bat` — старт Setup
  - файлы `.exe` через Git LFS
Поверхности:
  - desktop; автообновление: Linux AppImage + mac/win publish jobs в release.yml
Как проверить:
  1. npm ci && npm run typecheck && npm run build в apps/desktop
  2. npm run pack — локальный dir; в packaged проверить updater:check
  3. Tag mira-v* на CI — Release с latest-linux.yml + AppImage (и mac/win артефакты при успешных runners)
Риски платформы:
  - mac/win publish без code signing могут падать (continue-on-error)
  - Dev-режим (vite) не качает обновления — только установленная сборка
  - Откат не трогает ~/.mira
  - npm audit high в electron-builder/tar (dev tooling); prod deps чисты
```

