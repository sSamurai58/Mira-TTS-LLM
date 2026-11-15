# Contract — Mira Studio Path (backend)

Кусок: **studio-core** — датасет, сегменты, голосовая модель, текст/LLM, TTS, локальный API.

База URL локального сервиса: `http://127.0.0.1:{port}/v1`  
Auth владельца desktop: без токена (процесс на машине автора).  
Auth внешнего проекта (экран Подключение): заголовок `Authorization: Bearer {api_token}`.

Имена полей — camelCase в JSON. Файлы — multipart или путь в data dir.

---

## Сущности

```text
Кусок: studio-core
Сущности:
  - Dataset — id, name, sampleCount, createdAt, updatedAt — источник правды: локальная БД Mira
  - VoiceSample — id, datasetId, name, path, durationMs, format (wav|flac), createdAt — файлы в data/samples; метаданные в БД
  - Segment — id, sampleId, datasetId, kind (word|phrase), startMs, endMs, label?, status (accepted|rejected|pending), createdAt — БД; границы правятся только через операции сегментов
  - VoiceModel — id, name, status (training|ready|failed), datasetId?, source (trained|imported), packagePath?, progressPct?, errorCode?, createdAt, updatedAt — веса в data/models; метаданные в БД
  - ScriptText — id, body, source (manual|llm|llm_improve), updatedAt — БД; один активный черновик на студию (singleton id=active)
  - RenderJob — id, kind (segment|train|tts|llm), status (queued|running|succeeded|failed), targetId?, progressPct, errorCode?, createdAt, updatedAt — БД; воркер один за раз на kind train/segment/tts
  - AudioRender — id, modelId, scriptTextId, path, durationMs, createdAt — файлы в data/renders
  - ApiSettings — port, tokenHash, defaultModelId?, running (bool) — БД; сырой token показывается один раз при ротации, в БД не хранится
  - ModelPackage — file (.mira-model) — zip: manifest.json (name, modelId, version) + weights; не сущность БД, артефакт импорта/экспорта
```

Поля только для правила (не на экран): `tokenHash`, внутренние `workerPid`, абсолютные пути можно отдавать как `path` относительно data root.

---

## Операции

```text
Операции:
  - listDatasets — desktop — {} — { items: Dataset[] } — список датасетов
  - createDataset — desktop — { name } — Dataset — создан датасет; повтор того же name в течение 2с возвращает тот же id (Idempotency-Key или dedupe)
  - getDataset — desktop — { id } — Dataset — чтение
  - listSamples — desktop — { datasetId } — { items: VoiceSample[] } — семплы датасета
  - importSample — desktop — multipart file + datasetId + name? — VoiceSample — файл скопирован, семпл в списке
  - createSampleFromRecording — desktop — multipart file (wav) + datasetId + name? — VoiceSample — запись с микрофона сохранена как семпл (клиент шлёт готовый blob)
  - startSegmentation — desktop — { datasetId, sampleId? } — RenderJob — job kind=segment queued/running; после успеха Segments для семпла(ов) pending
  - listSegments — desktop — { sampleId } — { items: Segment[] }
  - updateSegment — desktop — { id, startMs?, endMs?, label?, status? } — Segment — границы/статус обновлены; startMs < endMs
  - startTraining — desktop — { datasetId, name } — { model: VoiceModel, job: RenderJob } — модель status=training; нужны ≥1 VoiceSample и ≥1 accepted Segment (если сегментов ещё нет — ошибка NoAcceptedSegments)
  - listModels — desktop — {} — { items: VoiceModel[] }
  - getModel — desktop — { id } — VoiceModel
  - exportModel — desktop — { id } — file ModelPackage — пакет с тем же name
  - importModel — desktop — multipart file — VoiceModel — status=ready, source=imported; name из manifest
  - deleteModel — desktop — { id } — { ok: true } — модель и веса удалены
  - getScriptText — desktop — {} — ScriptText — активный текст
  - saveScriptText — desktop — { body } — ScriptText — source=manual; пустой body допускается как черновик
  - generateScriptText — desktop — { prompt? } — { text: ScriptText, job: RenderJob } — LLM заполняет body; source=llm
  - improveScriptText — desktop — {} — { text: ScriptText, job: RenderJob } — правит текущий body; source=llm_improve
  - startTts — desktop — { modelId, scriptTextId? } — { render?: AudioRender, job: RenderJob } — если script пуст — ScriptTextEmpty; модель не ready — ModelNotReady
  - getAudioRender — desktop — { id } — AudioRender + file stream GET /v1/renders/{id}/audio
  - getJob — desktop — { id } — RenderJob
  - getApiSettings — desktop — {} — { port, running, defaultModelId, hasToken }
  - updateApiSettings — desktop — { port?, defaultModelId?, rotateToken? } — ApiSettings (+ token plaintext только если rotateToken)
  - startApi — desktop — {} — { running: true, port, baseUrl } — внешний listener на port
  - stopApi — desktop — {} — { running: false }
  - externalTts — Bearer token — { modelId?, text } — audio/wav — озвучка для другого проекта; без/битый token — ApiAuthFailed
```

HTTP-карта (реализация):

| Операция | Метод и путь |
|---|---|
| listDatasets | `GET /v1/datasets` |
| createDataset | `POST /v1/datasets` |
| getDataset | `GET /v1/datasets/{id}` |
| listSamples | `GET /v1/datasets/{id}/samples` |
| importSample | `POST /v1/datasets/{id}/samples/import` |
| createSampleFromRecording | `POST /v1/datasets/{id}/samples/recording` |
| startSegmentation | `POST /v1/datasets/{id}/segmentation` |
| listSegments | `GET /v1/samples/{id}/segments` |
| updateSegment | `PATCH /v1/segments/{id}` |
| startTraining | `POST /v1/models/train` |
| listModels | `GET /v1/models` |
| getModel | `GET /v1/models/{id}` |
| exportModel | `GET /v1/models/{id}/export` |
| importModel | `POST /v1/models/import` |
| deleteModel | `DELETE /v1/models/{id}` |
| getScriptText | `GET /v1/script` |
| saveScriptText | `PUT /v1/script` |
| generateScriptText | `POST /v1/script/generate` |
| improveScriptText | `POST /v1/script/improve` |
| startTts | `POST /v1/tts` |
| getAudioRender | `GET /v1/renders/{id}` |
| audio file | `GET /v1/renders/{id}/audio` |
| getJob | `GET /v1/jobs/{id}` |
| getApiSettings | `GET /v1/api-settings` |
| updateApiSettings | `PATCH /v1/api-settings` |
| startApi | `POST /v1/api-settings/start` |
| stopApi | `POST /v1/api-settings/stop` |
| externalTts | `POST /v1/external/tts` |

---

## Ошибки

```text
Ошибки:
  - SampleImportFailed — 422 — file — «Не удалось импортировать файл. Выберите WAV или FLAC и повторите.»
  - SampleFormatUnsupported — 422 — file — формат не wav/flac
  - DatasetNotFound — 404 — datasetId — датасет не найден
  - SampleNotFound — 404 — sampleId — семпл не найден
  - SegmentationFailed — 422 — job — «Нарезка не завершилась. Проверьте семпл и запустите снова.»
  - SegmentInvalidRange — 422 — startMs|endMs — startMs < endMs и в пределах длительности семпла
  - NoAcceptedSegments — 422 — datasetId — нет принятых сегментов для обучения
  - TrainingFailed — 422 — job — «Обучение не завершилось. Откройте лог и запустите снова.»
  - ModelNotFound — 404 — modelId — модель не найдена
  - ModelNotReady — 409 — modelId — модель ещё не status=ready
  - ModelImportFailed — 422 — file — «Пакет модели не открылся. Выберите файл Mira Model Package.»
  - ScriptTextEmpty — 422 — body — нет текста для TTS/improve
  - LlmFailed — 422 — job — «LLM не вернул текст. Проверьте связь с моделью и повторите.»
  - TtsFailed — 422 — job — «Озвучка не собралась. Выберите модель и повторите.»
  - ApiAuthFailed — 401 — Authorization — «Запрос без доступа отклонён. Проверьте токен в настройках API.»
  - PortInUse — 409 — port — «Порт занят. Выберите другой порт и запустите снова.»
  - JobConflict — 409 — kind — уже есть running job этого kind
```

Тело ошибки:

```json
{ "error": { "code": "SampleImportFailed", "field": "file", "message": "..." } }
```

---

## Права

```text
Права:
  - Все /v1/* кроме /v1/external/* — только локальный desktop-клиент (loopback; без Bearer).
  - /v1/external/* — Bearer api_token; modelId если не передан = defaultModelId; без default и modelId — 422 field modelId.
  - Мультипользовательских ролей в v1 нет: владелец = пользователь машины.
```

---

## Повтор

```text
Повтор:
  - createDataset + Idempotency-Key: тот же ключ → тот же Dataset.
  - importSample: повтор того же содержимого (sha256) в том же datasetId → тот же VoiceSample, без второй копии файла.
  - startSegmentation / startTraining / startTts / generateScriptText: повтор пока job running того же kind → JobConflict; после succeeded — новый job.
  - saveScriptText: идемпотентная перезапись active.
  - externalTts: не идемпотентен по файлу (новый render каждый вызов); auth обязан.
```

---

## Хранение

```text
Хранение:
  - data root по умолчанию: ~/.mira/ (переопределение MIRA_DATA_DIR)
  - SQLite: ~/.mira/mira.db — метаданные
  - samples/, models/, renders/, packages/ — бинарники
  - ScriptText active переживает перезапуск
  - RenderJob и AudioRender хранятся; failed jobs не удаляются автоматически (для лога)
  - api token: plaintext только в ответе rotate; в БД sha256
  - Секреты и ключи внешнего LLM — только env (MIRA_LLM_API_KEY), не в репо и не в error.message
```

---

## Как проверить

```text
Как проверить:
  1. POST /v1/datasets {"name":"demo"} → 200 id
  2. POST /v1/datasets/{id}/samples/import (wav) → sample в GET .../samples
  3. POST /v1/datasets/{id}/segmentation → job; poll GET /v1/jobs/{id} до succeeded; GET /v1/samples/{sid}/segments длина > 0
  4. PATCH сегмент status=accepted; POST /v1/models/train {"datasetId","name":"voice1"} → model training→ready
  5. GET /v1/models/{id}/export → файл; POST /v1/models/import тем файлом → name сохраняется
  6. PUT /v1/script {"body":"Привет"} ; POST /v1/tts {"modelId"} → render; GET audio 200 audio/wav
  7. PATCH /v1/api-settings {"rotateToken":true}; POST /v1/api-settings/start; POST /v1/external/tts без token → ApiAuthFailed 401; с Bearer и text → audio/wav
```
