# Roadmap: opus-hw

## Overview

Milestone «login → dashboard + per-field валидация»: сначала делаем верификацию честной (линтер реально проверяет `.jsx` и накопленные ошибки устранены), затем включаем главный state-механизм milestone — переход login → dashboard с logout-циклом, потом per-field inline-валидацию формы логина, и завершаем полноценным тестовым покрытием нового поведения (App-level юнит + round-trip e2e) и финальным прогоном всех гейтов. Каждая фаза оставляет build и тесты зелёными; ноль новых зависимостей.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Honest Verification (tooling fix)** - `npm run lint` реально проверяет `.jsx`, накопленные ошибки jsx-a11y устранены (completed 2026-10-23)
- [ ] **Phase 2: App Auth State + DashboardPage** - переход login → dashboard (email + logout) через условный рендер в `App`
- [ ] **Phase 3: Per-field Inline Validation** - ошибки валидации под каждым полем отдельно, сброс при вводе
- [ ] **Phase 4: Test Coverage & Final Verification** - App-level юнит перехода, round-trip e2e, все гейты зелёные

## Phase Details

### Phase 1: Honest Verification (tooling fix)

**Goal**: Сделать «lint green» правдивым: `npm run lint` проверяет `.js` и `.jsx`, накопленные ошибки jsx-a11y в `LoginPage.jsx` устранены.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: [TOOL-01]
**Success Criteria** (what must be TRUE):
  1. `npm run lint` проверяет файлы с расширениями `.js` и `.jsx` (`--ext .js,.jsx`), что видно по выводу команды
  2. `npm run lint` завершается без ошибок, включая `src/pages/LoginPage.jsx` (label-паттерн исправлен: вложенный `<label>` или настройка правила `jsx-a11y/label-has-associated-control`)
  3. После исправлений `npm run build` и `npm test` остаются зелёными

**Plans**: 1/1 plans complete

Plans:
- [x] 01-01: Fix lint script (`--ext .js,.jsx`), устранить ошибки jsx-a11y в `LoginPage.jsx`, опц. `strictPort: true` в `playwright.config.js`

### Phase 2: App Auth State + DashboardPage

**Goal**: Переход login → dashboard: `App.jsx` владеет `user` state и рендерит `LoginPage` или `DashboardPage` условно; дашборд показывает email вошедшего и кнопку выхода.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: [AUTH-02, AUTH-03]
**Success Criteria** (what must be TRUE):
  1. После успешного входа пользователь видит страницу-заглушку дашборда (заголовок), а не форму логина
  2. На дашборде отображается email вошедшего пользователя
  3. Кнопка logout на дашборде возвращает пользователя на страницу входа; повторный вход работает
  4. State живёт в `App.jsx` (lift state up), без роутера/state-менеджера/window.location; build и существующие тесты зелёные

**Plans**: 1 plan

Plans:
- [ ] 02-01: `user` state + условный рендер в `App.jsx`, новый `DashboardPage.jsx` (email + logout), `onLoginSuccess(email)` в `LoginPage`, обновление существующих тестов под новый контракт

### Phase 3: Per-field Inline Validation

**Goal**: Per-field inline-валидация формы логина: ошибка под каждым пустым полем отдельно, сброс ошибки поля при вводе в него; селекторы тестов обновлены осознанно.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: [AUTH-01]
**Success Criteria** (what must be TRUE):
  1. При сабмите с обоими пустыми полями пользователь видит две отдельные ошибки — под полем email и под полем пароля
  2. При сабмите с одним пустым полем ошибка показывается только под этим полем
  3. Ошибка поля исчезает, как только пользователь начинает вводить текст в это поле (ошибка соседнего поля сохраняется)
  4. Никаких `alert()`; per-field `role="alert"` не ломает strict mode существующих тестов (селекторы обновлены как часть задачи)

**Plans**: 1 plan

Plans:
- [ ] 03-01: Per-field `errors` map + чистый валидатор в `LoginPage.jsx`, тексты ошибок и селекторы зафиксированы в спеке до кода, обновление существующих юнит- и e2e-тестов

### Phase 4: Test Coverage & Final Verification

**Goal**: Полное покрытие нового поведения тестами: App-level юнит перехода login → dashboard, полный round-trip e2e (login → dashboard → logout → login), финальный прогон всех гейтов.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: [TEST-01, TEST-02]
**Success Criteria** (what must be TRUE):
  1. App-level юнит-тест (colocated в `src/`) покрывает переход login → dashboard: fill → submit → заголовок дашборда, форма логина исчезает
  2. `e2e/dashboard.spec.js` содержит полный round-trip (login → dashboard → logout → login) и проходит зелёным
  3. Счётчик тестов в выводе Vitest сверён с ожидаемым числом (нет молча не запущенных тестов)
  4. Финальный прогон против свежего dev-сервера: `npm run build` + `npm test` + `npm run lint` + `npm run test:e2e` — все зелёные

**Plans**: 2 plans

Plans:
- [ ] 04-01: App-level юнит-тест перехода (login → dashboard) и per-field валидационные юниты, сверка счётчика Vitest
- [ ] 04-02: `e2e/dashboard.spec.js` round-trip (login → dashboard → logout → login) и финальный прогон всех гейтов

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Honest Verification (tooling fix) | 1/1 | Complete    | 2026-10-23 |
| 2. App Auth State + DashboardPage | 0/1 | Not started | - |
| 3. Per-field Inline Validation | 0/1 | Not started | - |
| 4. Test Coverage & Final Verification | 0/2 | Not started | - |
