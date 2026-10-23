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

- [ ] Установить: `claude plugin marketplace add thedotmack/claude-mem` → `claude plugin install claude-mem@thedotmack` (сеть; рестарт Claude Code после)
- [ ] Инициализировать: `npx claude-mem init` — хранилище `~/.claude/memories/` + hooks (SessionStart-инъекция, SessionEnd-сохранение)
- [ ] Перенести текущие файлы: записи `docs/memory.md` сохранить в claude-mem как первые записи; правило в AGENTS.md («читай docs/memory.md в начале, дописывай в конце») заменить на работу с claude-mem
- [ ] Демо сохранение/извлечение: сессия 1 — сохранить решение (кейс ложнозелёного `npm run lint` из Discovery); сессия 2 — извлечь, убедиться что claude-mem инжектит его в контекст

### 2. Быстрые команды + автоматические hooks

- [ ] Завести GSD-hooks в `.claude/settings.json` (validate-commit, session-state и др.) не затерев существующие protect-paths + eslint --fix
- [ ] Своя команда `/check` — build + test + lint одной командой
- [ ] Опционально: PostToolUse-хук для `.planning/`-артефактов

### 3. Управление контекстом + /compact (скрины — вручную)

- [ ] Открыть свежую сессию, нагрузить контекст (фазы GSD / чтение больших файлов)
- [ ] Скрин №1: `/context` до компакции (что в контексте, сколько токенов)
- [ ] Ввести `/compact instructions` — компакция с сохранением фокуса задачи
- [ ] Скрин №2: `/context` после — разница в токенах
- [ ] Скрины в `docs/assets/`, ссылки и пояснения в `docs/about.md`

### 4. Финализация

- [ ] Обновить `docs/about.md` и README (GSD, claude-mem, hooks, контекст-менеджмент)
- [ ] `npm run build` + `npm test` зелёные
- [ ] Push (ask)
