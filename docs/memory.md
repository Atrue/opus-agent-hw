# Журнал работ

| Дата | Что сделано |
|------|-------------|
| 2026-10-22 | Инициализировано React-приложение: Vite + React, ESLint (airbnb), точки входа `index.html` / `src/main.jsx` / `src/App.jsx` |
| 2026-10-22 | Создан план работ `docs/plan.md` |
| 2026-10-22 | Отрисована страница входа-заглушка: `src/pages/LoginPage.jsx` (email + пароль, валидация пустых полей), подключена в `src/App.jsx` |
| 2026-10-22 | Добавлен тестовый стек: Vitest + Testing Library (`jsdom`, `user-event`, `jest-dom`), скрипты `npm test` / `npm test:watch`, сетап `src/setupTests.js` (ручной `cleanup` — vitest без globals), тесты `src/App.test.jsx` (4 теста, все зелёные) |
| 2026-10-22 | Агентная инфраструктура доведена до полного состояния: permissions в `.claude/settings.json` (6 allow / 3 ask / deny `.env` + `rm -rf`), PreToolUse-хук `.claude/hooks/protect-paths.sh` (блокировка `.env`), AGENTS.md переписан (4 секции: проект и стек, команды, conventions, правила работы), Playwright e2e (`e2e/login.spec.js`, 2 теста, скрипт `test:e2e`, vitest include ограничен `src/`), UI-сценарий логина пройден через chrome-devtools MCP, создан `docs/about.md` + `docs/assets/e2e-page.png`, README дополнен секцией «Как агент работает в проекте». Все проверки зелёные: build, 4 юнита, lint, 2 e2e. **Осталось:** скриншоты пользователя в `docs/assets/` (env-deny, lint-hook, memory-session2, e2e-green, path-experiment) и push (ask) |
