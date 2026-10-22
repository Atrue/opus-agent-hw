# AGENTS.md

Гайд для AI-агентов, работающих с этим репозиторием (Claude Code, Codex и др.).

## Команды

- `npm run dev` — dev-сервер Vite
- `npm run build` — production-сборка в `dist/`
- `npm run preview` — локальный предпросмотр собранного `dist/`
- `npm run lint` — проверка ESLint (конфиг airbnb)
- `npm run lint:fix` — автофикс ошибок линтера

## Архитектура

Минимальный проект на React + Vite (без TypeScript, без роутера, без state-менеджера).

- `index.html` — единственная HTML-точка входа (монтирует `#root`, подключает `src/main.jsx`)
- `src/main.jsx` — bootstrap React (`StrictMode` + `createRoot`)
- `src/App.jsx` — корневой компонент
- `.eslintrc.cjs` — ESLint с конфигом airbnb; для `*.config.js/cjs` отключён `import/no-extraneous-dependencies`; `react/react-in-jsx-scope` off (React 17+ JSX transform)
- `.npmrc` — стандартный registry `registry.npmjs.org/` (глобальный `~/.npmrc` указывает на корпоративный Nexus, проектный файл его переопределяет)
