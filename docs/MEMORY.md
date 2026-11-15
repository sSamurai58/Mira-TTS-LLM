# Memory

## Текущий статус

2026-11-15 (Europe/Moscow): принято заключение специалиста предмета по речи/датасету (`docs/DOMAIN.md`). Пороги вшиты в контракт и API. Следующая роль — фронтенд desktop.

## Решения

- Mira v1 Studio Path, desktop, FastAPI studio-core.
- Обучение только после accepted сегментов (≥3 и ≥15 с) и `voiceRightsConfirmed`.
- Модель ≠ биометрия; UI говорит «в стиле вашего датасета».

## Баги

- Нет.

## Изменения

- 2026-11-15: PRD, DESIGN, CONTRACT, studio-api.
- 2026-11-15: DOMAIN + валидации порогов в API.
