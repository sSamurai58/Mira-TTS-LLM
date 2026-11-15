# Risks

## Открытые
- Stub ML — качество не продакшен — заменить воркеры — бэкенд
- SNR/клиппинг не измерены — domain — позже
- Запись микрофона / sampleRate браузера — SampleRateUnsupported — фронтенд
- Нет автосборки подписанного .dmg/.exe — ручной pack — DevOps
- Откат кода не откатывает `~/.mira` данные — бэкап data dir перед major — DevOps/пользователь
- Удаление mira.db необратимо для локальных метаданных — предупредить в RELEASE — DevOps

## Снятые
- Расползание DAW/SaaS — ADR-1
- Поверхность — ADR-2
- Нет контракта — ADR-3
- Domain пороги — DOMAIN.md
- Desktop toolkit — ADR-4
- Нет CI/отката на бумаге — 2026-11-15 ADR-5 + DEVOPS.md
