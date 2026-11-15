# Mira-TTS-LLM

**Mira** — студия TTS + LLM: свой голос, автонарезка, обучение модели, текст, озвучка и подключение к другим проектам.

Текущий выпуск: **Mira v1 — Studio Path** (desktop).

- Требования: [`docs/PRD.md`](docs/PRD.md)
- Дизайн: [`docs/DESIGN.md`](docs/DESIGN.md)
- Контракт API: [`docs/CONTRACT.md`](docs/CONTRACT.md)
- Локальный сервис: [`services/studio-api`](services/studio-api)
- Desktop UI: [`apps/desktop`](apps/desktop)

```bash
# API
cd services/studio-api && pip install -e . && MIRA_PORT=8741 mira-studio-api

# UI (другой терминал)
cd apps/desktop && npm install && npm run desktop
```

## Команда продукта

Скиллы: [`.cursor/skills/product-team/`](.cursor/skills/product-team/). Правила агента: [`AGENTS.md`](AGENTS.md). Документы: [`docs/`](docs/).

Пользователь говорит с **менеджером**. Одна роль — один артефакт за ход.
