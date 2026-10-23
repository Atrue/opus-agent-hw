---
phase: 01-honest-verification-tooling-fix
plan: 01
subsystem: tooling
tags: [eslint, jsx-a11y, playwright, lint]
provides:
  - правдивый lint green: npm run lint явно покрывает .js и .jsx
  - устранённые ошибки jsx-a11y в LoginPage.jsx (label nesting)
  - strictPort в playwright webServer (fail-fast на занятом порту)
affects: [tooling, e2e]
actuals:
  tokens: ~600
  tasks: 3
  commits: 1
tech-stack:
  added: []
  patterns: [explicit --ext, strictPort]
key-files:
  created: []
  modified: [package.json, playwright.config.js, src/main.jsx, src/pages/LoginPage.jsx]
key-decisions:
  - label nesting вместо отключения правила jsx-a11y
  - --ext .js,.jsx явно в скрипте lint (критерий 1 фазы), страховка в /check остаётся
plan_head_before: 597113f
plan_head_after: a13c349
duration: 5min
completed: 2026-10-23
status: complete
---

# Phase 1: Honest Verification (tooling fix) Summary (Minimal)

**`npm run lint` стал правдивой проверкой: явное `--ext .js,.jsx`, 7 ошибок устранены, все проверки зелёные.** Большая часть работы выполнена во время hw-2 (коммит `9ebd606`) до создания GSD-контекста фазы; GSD-часть — `a13c349`.

## Performance
- **Duration:** ~5 мин (GSD-часть; hw-2 часть — в рамках hw-2 сессии)
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- 7 ошибок линта устранены: `src/main.jsx` (semi ×4, import/extensions), `src/pages/LoginPage.jsx` (jsx-a11y `label-has-associated-control` ×2 — вложение input в label, правило не отключалось, контракт `role="alert"` и тесты сохранены) — `9ebd606`
- Скрипт `lint`: `eslint . --ext .js,.jsx` — явное покрытие `.jsx` по букве критерия 1 — `a13c349`
- `strictPort: true` в `playwright.config.js` (webServer): занятый 5173 → немедленный фейл вместо молчаливого 5174 — `a13c349`
- Все критерии фазы проверены живыми прогонами 2026-10-23: lint 0 ошибок (1 warning `no-console` — заглушка логина), build ✓, 4 юнит-теста ✓, 2 e2e ✓ (со strictPort)
- Ложнозелёная находка Discovery («eslint . не линтит .jsx») при живой проверке не воспроизвелась — корректирующая запись в `docs/memory.md`

## Task Commits
1. **Task 1: lint-ошибки main.jsx + LoginPage.jsx** - `9ebd606` *(вне GSD-цикла, hw-2)*
2. **Task 2: --ext .js,.jsx в lint-скрипт** - `a13c349`
3. **Task 3: strictPort в playwright.config.js** - `a13c349`

## Files Created/Modified
- `package.json` — скрипт lint: `eslint . --ext .js,.jsx`
- `playwright.config.js` — webServer `strictPort: true`
- `src/main.jsx` — стайл-фиксы (semi, import)
- `src/pages/LoginPage.jsx` — label nesting для jsx-a11y

## Next Phase Readiness
Phase 2 (App Auth State + DashboardPage) может планироваться: tooling честный, все проверки зелёные.
