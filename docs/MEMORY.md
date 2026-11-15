# Memory

## Текущий статус

2026-11-15 (Europe/Moscow): первый релиз **опубликован** — tag `mira-v0.1.0` → [Release v0.1.0](https://github.com/sSamurai58/Mira-TTS-LLM/releases/tag/v0.1.0) (AppImage + mac arm64 + Win Setup). Windows также в `install/windows/`. T-1 voice-clone ещё открыт.

## Решения

- Mira v1: desktop Electron + studio-api; CI на Actions (ADR-5).
- Автообновление GitHub Releases (ADR-6).
- Production только после тестировщика и tag.
- Interim TTS: edge-tts (не клон датасета); train/segment остаются stub до ML worker.

## Баги

- T-1 открыт: нет реального voice-clone.
- T-2 открыт: e2e updater на packaged Release не гонялся.
- T-5 принят: npm audit high в electron-builder tree (prod omit=dev = 0).

## Изменения

- 2026-11-15: путь продукта до UI; CI/DEVOPS; auto-update; tester fixes (paths, TTS, release mac/win).
