# Architecture

Поверхность: **desktop-приложение** (ADR-2, ADR-4).  
Локальный сервис: **studio-api** на FastAPI (ADR-3), кусок `studio-core`.

## Общая схема (флоу)

1. Человек открывает Mira Desktop (`apps/desktop`).
2. UI вызывает `http://127.0.0.1:{port}/v1` (studio-api; в dev — proxy Vite).
3. Датасет → нарезка → модель → текст/LLM → TTS → локальный API для внешних проектов.

Контракт: [`docs/CONTRACT.md`](CONTRACT.md). Дизайн: [`docs/DESIGN.md`](DESIGN.md).

## Стек технологий

| Слой | Выбор |
|---|---|
| Оболочка UI | Electron + React + Vite (`apps/desktop`) |
| Локальный API | Python 3.11+, FastAPI, Uvicorn |
| Метаданные | SQLite (`~/.mira/mira.db`) |
| Бинарники | `~/.mira/samples|models|renders|packages` |
| Внешний доступ | Bearer token (sha256 в БД) |

## Окружения

| Имя | Как открыть | Кто выкладывает |
|---|---|---|
| local | API `:8741` + `npm run desktop` | разработчик |
| staging | CI artifact `mira-desktop-renderer` + API с отдельным `MIRA_DATA_DIR` | владелец репо |
| production | tagged desktop + local API | человек после тестировщика |

Подробности: [`docs/DEVOPS.md`](DEVOPS.md).

## Структура папок

```text
docs/                     продуктовые документы + CONTRACT + DOMAIN + DEVOPS
services/studio-api/      локальный API studio-core
apps/desktop/             Electron/React UI
.github/workflows/ci.yml  CI
.cursor/skills/           роли команды
```
