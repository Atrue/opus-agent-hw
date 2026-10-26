# Requirements: opus-hw

**Defined:** 2026-10-23
**Core Value:** Стенд, на котором каждый шаг агента наблюдаем и воспроизводим: permissions, hooks, память, планирование (GSD) и контекст проверяются на живом, но маленьком коде.

## v1 Requirements

Requirements for milestone «login → dashboard + per-field валидация». Each maps to roadmap phases.

### Tooling

- [x] **TOOL-01**: `npm run lint` проверяет `.js` и `.jsx` (`--ext .js,.jsx`); накопленные ошибки jsx-a11y в `LoginPage.jsx` устранены — без этого «lint green» фиктивен

### Auth Flow

- [ ] **AUTH-01**: Пользователь видит per-field ошибку валидации под каждым пустым полем (email и пароль отдельно); ошибка поля сбрасывается при вводе в него
- [x] **AUTH-02**: После успешного входа пользователь попадает на страницу-заглушку дашборда, где отображается email вошедшего
- [x] **AUTH-03**: Пользователь может выйти (кнопка на дашборде) и возвращается на страницу входа

### Testing

- [ ] **TEST-01**: Переход login → dashboard покрыт App-level юнит-тестом (colocated в `src/`), счётчик тестов Vitest сверяется с ожидаемым
- [ ] **TEST-02**: Полный round-trip e2e-сценарий (login → dashboard → logout → login) зелёный в `e2e/dashboard.spec.js`

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Async & A11y

- **ASYNC-01**: Loading state при fake async-логине (React 19 `useActionState`)
- **A11Y-01**: Полное `aria-invalid` / `aria-describedby` wiring для полей формы

### Extra pages

- **PAGE-01**: Дополнительные stub-страницы (например, Settings) для новых агентных задач

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Реальный бэкенд / OAuth / аутентификация | Ценность стенда не в продукте; вход остаётся заглушкой |
| Роутер (react-router) | Стек зафиксирован; conditional rendering достаточен для 2 экранов |
| State-менеджер (zustand и т.п.) | Один cross-page state — textbook lift-state-up |
| Form-библиотеки (react-hook-form, zod) | 2 поля; нативные контролируемые инпуты проще и наблюдаемее |
| TypeScript | Стек зафиксирован в AGENTS.md (JS без TS) |
| Persistence (localStorage) | Ломает повторяемость e2e |
| i18n, мобильная адаптивность, UI-киты | Десктопный стенд, одна локаль |
| Email-format / password-strength валидация | Валидация пустых полей достаточна для задач стенда |
| Forgot-password / sign-up / remember-me | За пределами milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOOL-01 | 1 | Complete |
| AUTH-01 | 3 | Pending |
| AUTH-02 | 2 | Complete |
| AUTH-03 | 2 | Complete |
| TEST-01 | 4 | Pending |
| TEST-02 | 4 | Pending |

**Coverage:**
- v1 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0

---
*Requirements defined: 2026-10-23*
*Last updated: 2026-10-23 after roadmap creation*
