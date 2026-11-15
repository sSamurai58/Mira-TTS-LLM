# Отчёт тестировщика — Mira v1 Studio Path

Дата: 2026-11-15 (Europe/Moscow)  
Стенд: local (studio-api TestClient + `npm run typecheck` + scripts/smoke_path.py)  
Сборка: ветка `cursor/mira-v1-auto-update-5e31`

```text
Вердикт: не к выкладке (голос-клон всё ещё stub)
Пройдено:
  - API Studio Path smoke (dataset→segment→train→export/import→tts→external Bearer)
  - Ошибки контракта: ApiAuthFailed, VoiceRightsNotConfirmed, SampleDurationInvalid
  - Desktop typecheck
  - Поиск секретов в исходниках (приватные ключи / ghp_ / sk-): пусто
  - Откат описан в DEVOPS/RELEASE
  - CI зелёный на devops и auto-update ветках
  - Пути в JSON API относительные к data dir (T-4 закрыт)
  - TTS render даёт слышимый wav через edge-tts+ffmpeg (fallback silence)
  - release.yml: linux + mac + windows publish jobs
Не проверено:
  - Полный GUI e2e каждого состояния экрана на Electron packaged
  - Автообновление download→Перезапустить на реальном GitHub Release
  - Подписанные macOS / Windows установщики на реальных runners
  - Узнаваемый клон своего голоса (train/segment stub)
  - Staging как отдельный хост (продукт локальный)
Находки:
```

## Находки

```text
ID: T-1
Тип: баг
Серьёзность: высокая
Поверхность: api | данные
Где: jobs segment/train — stub; TTS смягчён edge-tts (не клон)
Шаги: пройти обучение и TTS на реальном голосе
Ожидалось: узнаваемый свой голос / осмысленная нарезка
Получилось: сегменты/веса stub; TTS слышимый neural (edge-tts), не клон датасета
Доказательство: jobs.py stub_segments / MIRA_STUB_WEIGHTS; audio.synthesize_speech_wav
Статус: частично — audible TTS ок; voice-clone открыт
Кому чинить: бэкенд (ML worker)
Чеклист секьюрити: нет
Релиз-чеклист: 2
```

```text
ID: T-2
Тип: релиз
Серьёзность: средняя
Поверхность: ci | Linux | macOS | Windows
Где: автообновление / GitHub Release
Шаги: поставить packaged app → дождаться нового tag → Перезапустить
Ожидалось: новая версия после перезапуска
Получилось: не проверено на стенде (нет опубликованного Release)
Доказательство: release.yml готов (linux/mac/win); e2e updater не гонялся
Статус: открыт (нужен tag mira-v* после merge)
Кому чинить: DevOps + фронтенд (проверка)
Чеклист секьюрити: нет
Релиз-чеклист: 1, пункты обновления
```

```text
ID: T-3
Тип: подозрение
Серьёзность: низкая
Поверхность: Linux (desktop)
Где: Студия — CTA «Начать с датасета»
Шаги: клик по CTA в GUI
Ожидалось: переход на Датасет
Получилось: в одном ручном прогоне клик не сработал (возможен overlay Translate); нав «Датасет» работает; добавлены data-testid / aria-label / z-index
Доказательство: StudioScreen.tsx cta-start-dataset
Статус: смягчено в коде; повторный GUI-прогон желателен
Кому чинить: фронтенд
Чеклист секьюрити: нет
Релиз-чеклист: 3
```

```text
ID: T-4
Тип: секьюрити
Серьёзность: низкая
Поверхность: api
Где: VoiceSample.path / AudioRender.path / packagePath в JSON
Шаги: GET samples / renders / models
Ожидалось: относительные пути или id
Получилось: to_public_path → пути относительно MIRA_DATA_DIR; resolve_data_path на чтении
Доказательство: mira_api/paths.py, store.py, main.py, jobs.py
Статус: закрыт
Кому чинить: —
Чеклист секьюрити: 10
Релиз-чеклист: 7
```

```text
ID: T-5
Тип: подозрение
Серьёзность: средняя
Поверхность: ci | Linux
Где: npm audit apps/desktop (electron-builder / tar tree)
Шаги: npm audit
Ожидалось: нет critical/high без mitigation
Получилось: 0 vulns в production deps (`npm audit --omit=dev`); high/critical только в dev tooling (tar via electron-builder); fix --force → electron-builder@26 (breaking)
Доказательство: npm audit 2026-11-15
Статус: принят риск tooling; prod omit=dev чистый
Кому чинить: DevOps (при апгрейде builder)
Чеклист секьюрити: 8
Релиз-чеклист: 6
```

## Секьюрити-чеклист

| # | Статус |
|---|---|
| 1 Секреты в репо | ok (скан пуст) |
| 2 Auth | ok для local desktop; external Bearer 401 проверен |
| 3 Авторизация | ok для модели «владелец машины»; multi-user нет |
| 4 Ввод/файлы | ok SampleFormat/Duration |
| 5 Данные в покое | ok tokenHash sha256; plaintext token только rotate |
| 6 Граница доверия | ok voiceRightsConfirmed на сервере |
| 7 Redirect | n/a |
| 8 Зависимости | T-5 принят (dev tooling) |
| 9 Права ОС | не проверено packaged permissions |
| 10 Логи/ошибки | ok; T-4 закрыт |
| 11 Отказ в доступе | ok ApiAuthFailed |
| 12 Объём атаки | ok локально |

## Релиз-чеклист

| # | Статус |
|---|---|
| 1 Путь PRD | ok на API smoke; GUI частично |
| 2 Проверки продакта | fail — T-1 voice-clone |
| 3 Состояния UI | не проверено полностью; CTA смягчён |
| 4 Контракт ошибок | ok выборочно |
| 5 Регрессия | ok smoke после path/TTS |
| 6 Секьюрити блокеры | ok (нет блокеров) |
| 7 Секреты | ok |
| 8 Пайплайн | ok; release.yml mac/win добавлены |
| 9 Откат | ok описан |
| 10 GLOSSARY | ok сверка имён по CONTRACT |
| 11 Поверхности | desktop code ok; mac/win publish в workflow, не гонялся |
| 12 Вердикт | **не к выкладке** (блокер T-1 voice-clone) |

## Итог менеджеру

Блокер выкладки: **T-1** (реальный voice-clone / train).  
TTS стал слышимым (edge-tts); пути API и mac/win release jobs закрыты/добавлены.  
**T-2** ждёт tag после merge; **T-5** принят для prod.
