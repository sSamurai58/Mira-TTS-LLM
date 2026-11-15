# Mira Studio API (`studio-core`)

Локальный HTTP API для desktop Mira v1. Контракт: [`docs/CONTRACT.md`](../../docs/CONTRACT.md).

## Запуск

```bash
cd services/studio-api
pip install -e .
MIRA_DATA_DIR=~/.mira MIRA_PORT=8741 mira-studio-api
```

База: `http://127.0.0.1:8741/v1`

Данные по умолчанию в `~/.mira/` (`mira.db`, `samples/`, `models/`, `renders/`, `packages/`).

## Smoke

```bash
pip install -e .
python scripts/smoke_path.py
```

## Заметки v1

- Нарезка, обучение, TTS и LLM — рабочие заглушки с полным контрактом состояний/ошибок.
- Реальные модели речи и LLM подключаются тем же API без смены имён полей.
- Внешний TTS: `POST /v1/external/tts` + `Authorization: Bearer <token>` после `start` и `rotateToken`.
- CI: `.github/workflows/ci.yml` — см. `docs/DEVOPS.md`.
