# План

## Цель

Домашнее задание hw-2: GSD + заполненные документы проекта, подключённая память (claude-mem), быстрые команды и автоматические hooks, управление контекстом со скринами usage до/после, пройденный Discovery.

## Сделано

- [x] GSD v1.18.0 установлен из git-стеша (`96b2f51`): агенты, команды `/gsd-*`, hooks, gsd-core
- [x] Discovery пройден через `/gsd-new-project --auto`:
  - `.planning/PROJECT.md` — brownfield, 6 Validated из кода (`57420a5`)
  - `.planning/config.json` — yolo / coarse / parallel / adaptive (`bbdf96f`)
  - `.planning/research/` — STACK / FEATURES / ARCHITECTURE / PITFALLS + SUMMARY, 4 параллельных субагента (`0f2a73b`)
  - `.planning/REQUIREMENTS.md` — 6 REQ (TOOL/AUTH/TEST), coverage 6/6 (`6ec5227`)
  - `.planning/ROADMAP.md` (4 фазы MVP-mode) + `STATE.md` (`49825ff`, `219e489`)
  - `.claude/CLAUDE.md` — сгенерированная инструкция агента (`219e489`)

## Осталось

### 1. Память: claude-mem (заменяет docs/memory.md)

- [x] Установлен ранее: плагин claude-mem активен (hooks SessionStart-инъекция / SessionEnd-сохранение, MCP-инструменты)
- [x] Записи `docs/memory.md` перенесены в claude-mem как первые записи (3 observation: инициализация проекта, GSD+Discovery, кейс ложнозелёного lint); файл помечен замороженным
- [x] Правило в AGENTS.md заменено на работу с claude-mem (SessionStart инжектит контекст, `save_memory` для важных решений)
- [x] Демо-сохранение: кейс ложнозелёного `npm run lint` сохранён (observation #3) + корректирующая запись #4 (при живой проверке кейс не воспроизвёлся, 7 ошибок найдены и исправлены). Извлечение — проверить в следующей сессии (auto-инъекция должна показать записи)

### 2. Быстрые команды + автоматические hooks

- [x] GSD-hooks в `.claude/settings.json`: `gsd-validate-commit.sh` (PreToolUse, matcher Bash, Conventional Commits) + `gsd-session-state.sh` (SessionStart, инъекция STATE.md); существующие protect-paths + eslint --fix не тронуты. Opt-in: `hooks.community: true` в `.planning/config.json`. Оба хука проверены вручную (block на bad commit / JSON с STATE.md на старте)
- [x] Своя команда `/check` — build + test + lint (+ страховка `--ext .js,.jsx`) — `.claude/commands/check.md`
- [~] PostToolUse-хук для `.planning/` — пропущен осознанно: GSD-субагенты сами пишут в `.planning/` при исполнении фаз, хук-нотификатор срабатывал бы на каждую легитимную правку; защита через GSD workflow enforcement в `.claude/CLAUDE.md`

### 3. Управление контекстом + /compact (скрины — вручную)

- [ ] Открыть свежую сессию, нагрузить контекст (фазы GSD / чтение больших файлов)
- [ ] Скрин №1: `/context` до компакции (что в контексте, сколько токенов)
- [ ] Ввести `/compact instructions` — компакция с сохранением фокуса задачи
- [ ] Скрин №2: `/context` после — разница в токенах
- [ ] Скрины в `docs/assets/`, ссылки и пояснения в `docs/about.md`

### 4. Финализация

- [x] Обновить `docs/about.md` и README (GSD, claude-mem, hooks, `/check`)
- [x] `npm run build` + `npm test` зелёные (плюс lint и 2 e2e; по пути исправлены 7 ошибок линта в `src/main.jsx` и `src/pages/LoginPage.jsx` — jsx-a11y label nesting, semi, import/extensions)
- [ ] Push (ask)
