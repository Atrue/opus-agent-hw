# opus-hw

Минимальный проект на **React + Vite** с настроенной инфраструктурой для разработки с AI-агентами (Claude Code).

## Стек

- React 19 + Vite 8 (JavaScript, без TypeScript)
- ESLint с конфигом [airbnb](https://github.com/airbnb/javascript) + `eslint-import-resolver-typescript`

## Команды

```bash
npm run dev        # dev-сервер (http://localhost:5173)
npm run build      # production-сборка в dist/
npm run preview    # предпросмотр собранного dist/
npm run lint       # проверка ESLint
npm run lint:fix   # автофикс ошибок линтера
```

## Что было сделано

1. **Каркас проекта** — минимальное React + Vite приложение (точка входа `src/main.jsx`, корневой компонент `src/App.jsx`), проверено сборкой.
2. **Registry npm** — в `.npmrc` зафиксирован стандартный `registry.npmjs.org` (глобальный `~/.npmrc` указывает на корпоративный Nexus и попадал в `package-lock.json`), пакеты переустановлены.
3. **Линтер** — ESLint с airbnb-конфигом: автофикс стайла, резолвер ESM-пакетов, отключённые правила для конфигов сборки. Все файлы проекта проходят `npm run lint`.
4. **Настройки Claude Code** (`.claude/settings.json`):
   - permissions: `git push` → подтверждение, `.env*` → запрет чтения/записи, `npm run *` → allow;
   - PostToolUse-хук: автоматический `eslint --fix` после каждой записи/правки JS/TS файла.
5. **Правила для агентов** — `.claude/rules/js-ts.md` (код-стайл для JS/TS по globs), `AGENTS.md` (гайд по командам и архитектуре; `CLAUDE.md` импортирует его через `@AGENTS.md`).
6. **Chrome DevTools MCP** — `.mcp.json` с сервером `chrome-devtools` (скриншоты, консоль, network, performance) + автоподтверждение в настройках.

## Инфраструктура агентов

| Файл | Назначение |
|------|------------|
| `AGENTS.md` | гайд для AI-агентов (команды, архитектура); `CLAUDE.md` ссылается на него |
| `.claude/settings.json` | permissions, хук автофикса ESLint, MCP |
| `.claude/rules/js-ts.md` | код-стайл правила для JS/TS |
| `.mcp.json` | chrome-devtools MCP сервер |
