# Release

## Версия / имя выпуска

Mira v1 — Studio Path

## Критерий «выпуск закрыт»
- [ ] Путь PRD пройден на staging
- [ ] Блокеры тестировщика = 0 (открыт T-1 voice-clone)
- [x] Секьюрити-чеклист без открытых высоких/блокеров — T-4 закрыт; T-5 tooling принят
- [x] Пайплайн зелёный — CI на feature-ветках (2026-11-15, Europe/Moscow)
- [x] Откат описан и проверен на бумаге — `docs/DEVOPS.md`
- [x] Секреты не в репозитории — только имена в DEVOPS/CONTRACT
- [x] GLOSSARY совпадает с экранами и контрактом

## Чеклист выкладки
- [x] путь Studio Path пройден end-to-end (API smoke)
- [x] импорт/экспорт VoiceModel проверен (smoke)
- [x] локальный API отвечает на озвучку из внешнего вызова (smoke)
- [x] LLM-текст → TTS проверен (smoke; TTS = edge-tts interim, не клон)
- [ ] CI Checks зелёные на теге/main
- [x] GET /health ок на целевом API
- [ ] desktop открывает Студию без баннера «studio-api не запущен» (packaged e2e)
- [ ] GitHub Release по tag `mira-v*` содержит AppImage + latest-linux.yml (+ mac/win при успешных runners)
- [ ] В установленной сборке: проверка обновления → скачивание → «Перезапустить» поднимает новую версию

## Откат
- процедура: checkout предыдущего git tag `mira-v1.*`; перезапуск studio-api и desktop с того тега; data dir не откатывается автоматически (см. RISKS)
- цель: вернуть прошлую версию кода < 15 мин

## Заметки выпуска

Тестировщик: `docs/TEST_REPORT.md` — вердикт **не к выкладке** из‑за T-1 (voice-clone).  
Release workflow: Linux AppImage + macOS (dmg/zip) + Windows (nsis); mac/win `continue-on-error` пока нет подписи.  
Interim TTS: `edge-tts` → ffmpeg wav; fallback silence.  
Ручной Windows installer в репо: `install/windows/` (Setup + Portable, Git LFS).
