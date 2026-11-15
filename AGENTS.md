# AGENTS.md — Mira-TTS-LLM

Этот репозиторий ведётся через пакет **product-team**.

- Точка входа: [`.cursor/skills/product-team/SKILL.md`](.cursor/skills/product-team/SKILL.md)
- Правила агента: [`.cursor/skills/product-team/AGENTS.md`](.cursor/skills/product-team/AGENTS.md)
- Обзор ролей: [`.cursor/skills/product-team/README.md`](.cursor/skills/product-team/README.md)

## Как работать

1. С пользователем говорит только **менеджер**. Открой [`.cursor/skills/product-team/manager/SKILL.md`](.cursor/skills/product-team/manager/SKILL.md).
2. Одно поручение — одна роль — один артефакт за ход.
3. Документы продукта живут в корне репозитория в `docs/` (не внутри `.cursor/skills/`).
4. Чужие `SKILL.md` ролей не читай, пока сдача не требует чужого артефакта.

| Просьба | Роль | Файл |
|---|---|---|
| Указание команде, статус, docs | Менеджер | `.cursor/skills/product-team/manager/SKILL.md` |
| Что строим, объём выпуска | Продакт | `.cursor/skills/product-team/product/SKILL.md` |
| Экран, состояние, движение | Дизайнер | `.cursor/skills/product-team/designer/SKILL.md` |
| Собрать UI | Фронтенд | `.cursor/skills/product-team/frontend/SKILL.md` |
| Данные, API, контракт | Бэкенд | `.cursor/skills/product-team/backend/SKILL.md` |
| Предметная логика | Специалист предмета | `.cursor/skills/product-team/domain/SKILL.md` |
| Телефон / Mac / Linux | mobile / macos / linux | `.cursor/skills/product-team/<роль>/SKILL.md` |
| QA и релиз-чеклист | Тестировщик | `.cursor/skills/product-team/tester/SKILL.md` |
| CI, деплой, откат | DevOps | `.cursor/skills/product-team/devops/SKILL.md` |

Полные правила — в [`.cursor/skills/product-team/AGENTS.md`](.cursor/skills/product-team/AGENTS.md).
