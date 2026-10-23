# opus-hw

Минимальный проект на **React + Vite** с настроенной инфраструктурой для разработки с AI-агентами (Claude Code).

## Стек

- React 19 + Vite 8 (JavaScript, без TypeScript)
- Vitest + Testing Library — юнит/компонентные тесты (`src/*.test.jsx`)
- Playwright — browser e2e (`e2e/`)
- ESLint с конфигом [airbnb](https://github.com/airbnb/javascript) + `eslint-import-resolver-typescript`

## Команды

```bash
npm run dev        # dev-сервер (http://localhost:5173)
npm run build      # production-сборка в dist/
npm run preview    # предпросмотр собранного dist/
npm test           # юнит-тесты Vitest (однократный прогон)
npm run test:watch # Vitest в watch-режиме
npm run test:e2e   # browser e2e Playwright (сам поднимает dev-сервер)
npm run lint       # проверка ESLint
npm run lint:fix   # автофикс ошибок линтера
```

## Как агент работает в проекте

Подробности — в [docs/about.md](docs/about.md).

### Права (permissions)

| Режим | Правила | Зачем |
|-------|---------|-------|
| allow | `npm run *`, `npm test *`, `npx playwright test*`, `npx eslint *`, `git add *`, `git commit*` | рутина без трения: тесты, линтер, сборка, локальный коммит |
| ask | `git push`, `npm install *`, `npx playwright install*` | наружные действия и смена зависимостей — с подтверждением |
| deny | `Read/Edit(.env*)`, `rm -rf *` | секреты и необратимое удаление — запрещены |

### Режим по умолчанию — `default`, и почему

Режим `default` означает: любое действие, не перечисленное в allow, агент выполнить сам не может — он спрашивает пользователя. Для этого репозитория это осознанный выбор:

- **Это стенд для проверки агента**, а не продакшен-код: корректность и наблюдаемость действий агента важнее скорости.
- **Меньше явного allow — меньше поверхность атаки**: если агент придумает неожиданную команду, она не выполнится молча.
- **Необратимое и наружное — под контролем человека**: push меняет удалённый репозиторий, install меняет зависимости и lock-файл, `rm -rf` и чтение `.env` необратимы/утекают секреты — поэтому push/install в ask, а `.env` и `rm -rf` в deny (запрет без запроса, чтобы случайно не подтвердить).

### Hooks

- **SessionStart** (`gsd-session-state.sh`): инжектит состояние `.planning/STATE.md` (фаза, прогресс) в начало каждой сессии.
- **PreToolUse** (`.claude/hooks/protect-paths.sh`): блокирует запись в `.env` / `.env.*` — второй рубеж поверх deny-правил.
- **PreToolUse** (`gsd-validate-commit.sh`, matcher `Bash`): энфорсит Conventional Commits для `git commit`.
- **PostToolUse**: `eslint --fix` на каждом записанном js/ts-файле.

### Прочее

- **GSD** (`.claude/gsd-core/`): 80+ команд `/gsd-*`, 40+ субагентов, planning-артефакты в `.planning/` (Discovery пройден: PROJECT / REQUIREMENTS / ROADMAP / STATE).
- **Память** — журнал `docs/memory.md`: агент читает историю в начале сессии и дописывает результаты работы в конце.
- **Быстрая команда** `/check` — build + test + lint одной командой (`.claude/commands/check.md`).
- **Path-правило** `.claude/rules/js-ts.md` — код-стайл для `**/*.{js,jsx,ts,tsx}` (загружается только при работе с этими файлами).
- **Skills** — 6 skills в `.claude/skills/` (code-review, grill-me, implement, research, tdd, wayfinder).
- **MCP** — chrome-devtools сервер (`.mcp.json`): скриншоты, консоль, network.

## Что было сделано

1. **Каркас проекта** — минимальное React + Vite приложение (точка входа `src/main.jsx`, корневой компонент `src/App.jsx`), проверено сборкой.
2. **Registry npm** — в `.npmrc` зафиксирован стандартный `registry.npmjs.org` (глобальный `~/.npmrc` указывает на корпоративный Nexus и попадал в `package-lock.json`), пакеты переустановлены.
3. **Линтер** — ESLint с airbnb-конфигом: автофикс стайла, резолвер ESM-пакетов, отключённые правила для конфигов сборки. Все файлы проекта проходят `npm run lint`.
4. **Тесты** — Vitest + Testing Library (4 юнита) и Playwright (2 browser e2e), все зелёные.
5. **Настройки Claude Code** (`.claude/settings.json`): permissions (allow/ask/deny), два хука (protect-paths + eslint --fix), MCP.
6. **Правила для агентов** — `.claude/rules/js-ts.md` (path-scoped код-стайл), `AGENTS.md` (проект, команды, conventions, правила работы); `CLAUDE.md` импортирует его через `@AGENTS.md`.
7. **Chrome DevTools MCP** — `.mcp.json` с сервером `chrome-devtools` + автоподтверждение в настройках; UI-сценарий логина пройден агентом и зафиксирован в `docs/about.md`.

## Инфраструктура агентов

| Файл | Назначение |
|------|------------|
| `AGENTS.md` | гайд для AI-агентов (проект и стек, команды, conventions, правила работы); `CLAUDE.md` ссылается на него |
| `.claude/settings.json` | permissions (allow/ask/deny), хуки (protect-paths, eslint --fix, gsd-validate-commit, gsd-session-state), MCP |
| `.claude/rules/js-ts.md` | path-scoped код-стайл правила для JS/TS |
| `.claude/skills/` | 6 skills для рабочих процессов агента |
| `.claude/commands/check.md` | быстрая команда `/check`: build + test + lint |
| `.claude/gsd-core/` | GSD v1.18.0: workflow-движок, `/gsd-*`-команды, субагенты |
| `.planning/` | GSD planning-артефакты: PROJECT / REQUIREMENTS / ROADMAP / STATE / research |
| `.claude/hooks/protect-paths.sh` | скрипт PreToolUse-хука блокировки `.env` |
| `.mcp.json` | chrome-devtools MCP сервер |
| `docs/about.md` | обзор агентной инфраструктуры + скриншоты |
| `docs/memory.md` | журнал работ: память между сессиями (агент читает историю и дописывает результаты) |
