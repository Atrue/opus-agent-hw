# AGENTS.md

Гайд для AI-агентов, работающих с этим репозиторием (Claude Code, Codex и др.).

## Проект и стек

Минимальное приложение на React + Vite (JavaScript, без TypeScript, без роутера, без state-менеджера) — стенд для отладки агентной инфраструктуры.

- **React 19 + Vite 8** — сборка и dev-сервер
- **Vitest + Testing Library** (`jsdom`, `user-event`, `jest-dom`) — юнит/компонентные тесты
- **Playwright** — browser e2e (директория `e2e/`)
- **ESLint** (конфиг airbnb) — стайл-проверки
- `index.html` — единственная HTML-точка входа (монтирует `#root`, подключает `src/main.jsx`)
- `src/main.jsx` — bootstrap React (`StrictMode` + `createRoot`); `src/App.jsx` → `src/pages/LoginPage.jsx` (заглушка логина с валидацией пустых полей)
- `.npmrc` — стандартный registry `registry.npmjs.org/` (глобальный `~/.npmrc` указывает на корпоративный Nexus, проектный файл его переопределяет)

## Команды

- `npm run dev` — dev-сервер Vite (http://localhost:5173)
- `npm run build` — production-сборка в `dist/`
- `npm run preview` — локальный предпросмотр собранного `dist/`
- `npm test` — прогон юнит-тестов Vitest (однократный)
- `npm run test:watch` — Vitest в watch-режиме
- `npm run test:e2e` — browser e2e Playwright (сам поднимает dev-сервер)
- `npm run lint` — проверка ESLint
- `npm run lint:fix` — автофикс ошибок линтера

После любых правок JS/JSX запускай `npm run build` и `npm test`; после правок e2e — `npm run test:e2e`.

## Conventions

- Код-стайл JS/TS — `.claude/rules/js-ts.md` (path-scoped правило, globs `**/*.{js,jsx,ts,tsx}`)
- Юнит-тесты colocated с исходниками в `src/` (`*.test.jsx`), e2e-сценарии — в `e2e/`
- Функциональные компоненты + хуки, один компонент = один файл (PascalCase)
- Данные из API — через `useEffect` с cleanup или кастомный хук, не inline в render
- Коммит-месседжи — краткие, в стиле `agent infra: ...`

## Правила работы

1. **Память сессий:** в начале сессии прочитай `docs/memory.md` (журнал работ) — там контекст того, что уже сделано. В конце сессии допиши строку о сделанном.
2. **Защищённые файлы:** `.env` и `.env.*` не читать и не изменять (deny в permissions + PreToolUse-хук).
3. **Опасные действия:** `rm -rf` запрещён; `git push`, `npm install`, `npx playwright install` — только с подтверждением пользователя (ask).
4. **Линтер:** после каждой записи JS/TS файла срабатывает PostToolUse-хук `eslint --fix`; финальную проверку делай через `npm run lint`.
5. **Скриншоты** для документации храни в `docs/assets/`, ссылки — в `docs/about.md`.
6. **Браузер:** UI-проверки делай через chrome-devtools MCP (`.mcp.json`) или Playwright.
