# Architecture

Поверхность: **desktop-приложение** (ADR-2).  
Локальный сервис: **studio-api** на FastAPI (ADR-3), кусок `studio-core`.

## Общая схема (флоу)

1. Человек открывает Mira (desktop).
2. Desktop UI вызывает `http://127.0.0.1:{port}/v1` (studio-api).
3. Добавляет голос: запись или импорт → `Dataset` / `VoiceSample`.
4. Запускает автонарезку → `RenderJob(kind=segment)` → `Segment`.
5. Обучает голосовую модель → `VoiceModel` + job `train`.
6. Пишет или генерирует текст (`ScriptText`, LLM jobs) → TTS → `AudioRender`.
7. Экспортирует `ModelPackage` или поднимает listener и отдаёт `POST /v1/external/tts` другим проектам.

Контракт: [`docs/CONTRACT.md`](CONTRACT.md).

## Стек технологий

| Слой | Выбор |
|---|---|
| Оболочка UI | desktop toolkit TBD (фронтенд; ADR позже) |
| Локальный API | Python 3.11+, FastAPI, Uvicorn |
| Метаданные | SQLite (`~/.mira/mira.db`) |
| Бинарники | `~/.mira/samples|models|renders|packages` |
| Внешний доступ | Bearer token (sha256 в БД) |

## Структура папок

```text
docs/                     продуктовые документы + CONTRACT.md
services/studio-api/      локальный API studio-core
  mira_api/               FastAPI приложение
.cursor/skills/           роли команды
```
