# Memory

## Текущий статус

2026-11-15 (Europe/Moscow): тестировщик прошёл smoke/секьюрити; вердикт **не к выкладке** (T-1 voice-clone). Закрыты/смягчены T-3/T-4; TTS audible через edge-tts; release.yml linux+mac+win; стек на `cursor/mira-v1-auto-update-5e31` → PR в main.

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
