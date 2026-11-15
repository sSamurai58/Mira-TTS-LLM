# DevOps — сдача Mira v1

```text
Окружения:
  - local — API http://127.0.0.1:8741 + UI npm run desktop / npm run dev — разработчик на своей машине
  - staging — артефакт renderer из CI (artifact mira-desktop-renderer) + тот же studio-api с MIRA_DATA_DIR отдельным каталогом; проверка пути до production — владелец репо
  - production — установленный desktop-билд у автора + studio-api как локальный сервис; выкладка только явным действием человека (тег/релиз), не с каждой ветки
Пайплайн:
  - pull_request / push main — job studio-api smoke; job desktop typecheck+build+upload artifact — статус: GitHub Actions вкладка Checks
Сборка (команды):
  - API: cd services/studio-api && pip install -e . && python scripts/smoke_path.py
  - Desktop: cd apps/desktop && npm ci && npm run typecheck && npm run build
Выкладка staging:
  - Скачать artifact mira-desktop-renderer с зелёного run
  - Запустить studio-api с отдельным MIRA_DATA_DIR
  - Открыть dist через static server или Electron на собранный index
Выкладка production:
  - Создать git tag mira-v1.x.y на main после вердикта тестировщика «к выкладке»
  - Собрать desktop (npm run build + electron pack — pack TBD; v1: tagged commit + инструкции README)
  - Не деплоить автоматически с feature-веток
Секреты (имена):
  - MIRA_LLM_API_KEY — опциональный ключ внешнего LLM (не в репо)
  - MIRA_DATA_DIR — путь данных (не секрет, но env)
  - MIRA_PORT — порт API
  - api token студии — ротация через PATCH /v1/api-settings; plaintext не в CI
Откат:
  - Вернуться на предыдущий git tag mira-v1.* ; перезапустить studio-api и desktop с того тега
  - Данные ~/.mira не откатываются автоматически (риск) — бэкап data dir перед major; целевое время отката кода: <15 мин
Логи и проверка живости:
  - API: GET /health → {"status":"ok"}
  - CI: Actions run зелёный
  - UI: открытие Studio Path без ошибки баннера API
Миграции:
  - SQLite создаётся schema on start; отдельных миграций v1 нет; откат схемы = удаление mira.db (необратимо для локальных данных — риск)
Поверхности:
  - desktop (Electron renderer + studio-api); мобильное/SaaS вне выпуска
Как проверить:
  1. python services/studio-api/scripts/smoke_path.py (после pip install -e .)
  2. cd apps/desktop && npm ci && npm run typecheck && npm run build
  3. Открыть PR — дождаться зелёных checks studio-api + desktop
Риски платформы:
  - Нет автосборки подписанного .dmg/.exe в v1 — ручной desktop pack
  - Откат не откатывает пользовательские модели в data dir
  - Staging = артефакт CI, не отдельный облачный хост (продукт локальный)
```
