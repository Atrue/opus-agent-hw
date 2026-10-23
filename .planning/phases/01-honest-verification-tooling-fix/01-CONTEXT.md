# Phase 1: Honest Verification (tooling fix) - Context

**Gathered:** 2026-10-23
**Status:** Ready for verification (work already done)

<domain>
## Phase Boundary

Сделать «lint green» правдивым: `npm run lint` покрывает `.js` и `.jsx`, накопленные ошибки jsx-a11y в `LoginPage.jsx` устранены (TOOL-01). Границы фазы — только tooling; никаких фич.

</domain>

<decisions>
## Implementation Decisions

### Состояние фазы
- **D-01:** Основная работа уже сделана коммитом `9ebd606` во время hw-2: 7 ошибок линта исправлены (5 в `src/main.jsx`: semi/import; 2 в `src/pages/LoginPage.jsx`: jsx-a11y `label-has-associated-control`, решено вложением input в label, не отключением правила), `npm run lint` зелёный и реально линтит `.jsx` (ложнозелёная находка Discovery при живой проверке 2026-10-23 не воспроизвелась: `eslint .` нашёл все 7 ошибок).
- **D-02:** Фаза закрывается без планирования и execute-цикла (user chose 3b): считать сделанной, сразу `/gsd-verify-work` после двух мелких правок ниже.

### Линтер
- **D-03:** В `package.json` скрипт `lint` меняется с `eslint .` на `eslint . --ext .js,.jsx` — явное покрытие `.jsx` по букве критерия 1, читаемость и страховка от регресса конфига. Страховка `npx eslint src/ --ext .js,.jsx` в `/check` остаётся.

### Playwright
- **D-04:** В `playwright.config.js` добавляется `strictPort: true` (webServer) — падать сразу при занятом порту 5173 вместо молчаливого переезда на 5174 и «зелёных» тестов против чужого сервера.

### Claude's Discretion
Детали реализации правок D-03/D-04 — тривиальны, формат фиксирован.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tooling
- `package.json` — скрипт `lint` (объект правки D-03)
- `playwright.config.js` — webServer-конфиг (объект правки D-04)
- `.claude/commands/check.md` — команда `/check` со страховкой `--ext .js,.jsx`

### Правила проекта
- `AGENTS.md` — конвенции и правила (build+test после правок, e2e после правок e2e-конфигов)
- `.planning/REQUIREMENTS.md` — TOOL-01 (требование фазы)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/LoginPage.jsx` — уже исправлен (label nesting), контракт `role="alert"` сохранён, тесты зелёные.

### Established Patterns
- Conventional Commits энфорсятся PreToolUse-хуком `gsd-validate-commit.sh`.
- Правка playwright.config.js требует прогона `npm run test:e2e` после (AGENTS.md).

### Integration Points
- `package.json` scripts.lint используется `/check` и CI-практиками проекта.

</code_context>

<specifics>
## Specific Ideas

Пользователь явно выбрал: добавить `--ext .js,.jsx` (1), добавить `strictPort: true` (2), фазу не планировать — verify как есть (3b).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Honest Verification (tooling fix)*
*Context gathered: 2026-10-23*
