# Glossary

## Экраны
- Студия — главный вход desktop-окна Mira, старт пути выпуска
- Датасет — список голосовых семплов (запись и импорт)
- Нарезка — просмотр и правка сегментов слов/фраз
- Модели — список голосовых моделей, обучение, импорт/экспорт
- Текст — ввод и LLM-правка текста озвучки
- Озвучка — TTS выбранной моделью, превью и сохранение
- Подключение — локальный API/SDK для других проектов

## Поверхность
- DesktopShell — локальное окно приложения v1 (шапка + шаг-навигатор + сцена)

## Сущности
- VoiceSample — исходный аудиосемпл голоса
- Dataset — набор семплов для обучения
- Segment — нарезанный кусок (слово или фраза) с границами
- VoiceModel — обученная голосовая модель (именованный артефакт)
- ScriptText — текст озвучки (ручной или от LLM)
- RenderJob — задача TTS / обучения / нарезки
- AudioRender — результат озвучки
- ModelPackage — пакет импорта/экспорта модели

## Ошибки
- SampleImportFailed — не удалось импортировать аудио
- SampleFormatUnsupported — формат не wav/flac
- SampleDurationInvalid — длительность семпла вне 0,5 с–5 мин
- SampleChannelsUnsupported — больше 2 каналов
- SampleRateUnsupported — частота не из белого списка
- DatasetNotFound — датасет не найден
- SampleNotFound — семпл не найден
- SegmentationFailed — автонарезка не завершилась
- SegmentInvalidRange — неверные границы сегмента
- SegmentTooShort — сегмент < 50 мс
- NoAcceptedSegments — нет принятых сегментов для обучения
- DatasetTooSmallForTraining — меньше 3 accepted или < 15 с суммарно
- VoiceRightsNotConfirmed — нет подтверждения прав на голос
- TrainingFailed — обучение модели упало
- ModelNotFound — модель не найдена
- ModelNotReady — модель ещё не готова
- ModelImportFailed — пакет модели не открылся
- ScriptTextEmpty — нет текста для TTS
- TtsFailed — озвучка не собралась
- LlmFailed — LLM не вернул текст
- ApiAuthFailed — внешний вызов без доступа к локальному API
- PortInUse — порт занят
- JobConflict — уже выполняется задача этого типа

## Предмет
- voiceRightsConfirmed — явное подтверждение права использовать голос в модели
- Заключение: [`docs/DOMAIN.md`](DOMAIN.md)
- Контракт: [`docs/CONTRACT.md`](CONTRACT.md)
