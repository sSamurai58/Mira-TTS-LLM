# Memory

## Текущий статус

2026-11-15 (Europe/Moscow): сдан контракт и локальный API **studio-core** (`docs/CONTRACT.md`, `services/studio-api`). Smoke path закрыт. Следующие роли: специалист предмета (речь/датасет), затем фронтенд desktop.

## Решения

- Продукт: Mira — TTS + LLM студия для создателя-разработчика.
- Выпуск v1: датасет → нарезка → модель → текст/LLM → TTS → экспорт/API.
- Поверхность v1: desktop (ADR-2).
- Локальный API: FastAPI + SQLite в `~/.mira` (ADR-3); ML-воркеры stub.
- Вне v1: DAW, видео, маркетплейс, мобильное, чужой SaaS.

## Баги

- Нет.

## Изменения

- 2026-11-15: `docs/*`; решение продакта.
- 2026-11-15: desktop; `docs/DESIGN.md`.
- 2026-11-15: `docs/CONTRACT.md` + `services/studio-api`.
