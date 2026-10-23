# opus-hw

## What This Is

Минимальное приложение на React + Vite (JavaScript, без TS/роутера/state-менеджера) — стенд для отладки агентной инфраструктуры Claude Code. Проект intentional-минимален: каждая новая страница или фича существует, чтобы дать агенту проверяемую задачу, а не ради продукта. Пользователь — единственный разработчик, оттачивающий workflows работы с AI-агентами.

## Core Value

Стенд, на котором каждый шаг агента наблюдаем и воспроизводим: permissions, hooks, память, планирование (GSD) и контекст проверяются на живом, но маленьком коде.

## Requirements

### Validated

Выведено из существующего кода (brownfield):

- ✓ Каркас React 19 + Vite 8, production-сборка зелёная — existing (`src/main.jsx`, `src/App.jsx`)
- ✓ Страница входа-заглушка с валидацией пустых полей — existing (`src/pages/LoginPage.jsx`)
- ✓ 4 юнит-теста Vitest + Testing Library, все зелёные — existing (`src/App.test.jsx`)
- ✓ 2 browser e2e Playwright, зелёные — existing (`e2e/login.spec.js`)
- ✓ Агентная инфраструктура: permissions (allow/ask/deny), 2 хука (protect-paths, eslint --fix), path-правило, 6 skills, chrome-devtools MCP — existing (`.claude/`, `.mcp.json`)
- ✓ GSD v1.18.0 установлен (агенты, команды, hooks, gsd-core) — existing (`.claude/gsd-core/`)

### Active

- [ ] После успешного входа пользователь попадает на страницу-заглушку дашборда
- [ ] Ошибки валидации формы логина показываются инлайн, а не через alert
- [ ] Новые фичи покрыты юнит-тестами и e2e по конвенциям проекта

### Out of Scope

- TypeScript, роутер, state-менеджер — проект сознательно минимален, стек зафиксирован
- Реальная аутентификация/бэкенд — вход остаётся заглушкой, ценность стенда не в этом
- Мобильная адаптивность — десктопный стенд

## Context

- Репозиторий — учебный (hw-ветки), каждая итерация добавляет элемент агентной инфраструктуры: permissions → hooks → path-правила → skills → MCP → GSD
- `docs/memory.md` — журнал работ между сессиями (правило в AGENTS.md)
- Коммит-месседжи: краткие, стиль `agent infra: ...`; после правок JS/JSX обязательны `npm run build` + `npm test`
- `.env` защищён deny-правилами и PreToolUse-хуком — агенты его не читают

## Constraints

- **Tech stack**: React 19 + Vite 8, JavaScript без TypeScript — зафиксировано в AGENTS.md
- **Tooling**: Vitest + Testing Library (юниты в `src/`), Playwright (e2e в `e2e/`), ESLint airbnb
- **Dependencies**: `npm install` только с подтверждения пользователя (ask)
- **Safety**: `rm -rf` запрещён; `.env` deny; push с подтверждением

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GSD установлен из git-стеша, а не из npm | установка уже была выполнена и застешена; восстановление быстрее и идентично | ✓ Good |
| Режим permissions по умолчанию `default` | стенд для проверки агента: наблюдаемость важнее скорости | ✓ Good |
| Юнит-тесты colocated с исходниками | конвенция проекта, Vitest include ограничен `src/` | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-23 after initialization*
