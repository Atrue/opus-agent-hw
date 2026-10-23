# Project Research Summary

**Project:** opus-hw — минимальный React 19 + Vite 8 SPA (JS, без роутера/state-менеджера), стенд для отладки агентной инфраструктуры Claude Code
**Domain:** Auth-flow demo/testbed SPA; milestone: login → dashboard navigation + per-field inline validation
**Researched:** 2026-10-23
**Confidence:** HIGH

## Executive Summary

opus-hw — не продукт, а учебный стенд: каждая фича существует, чтобы дать AI-агенту проверяемую задачу и сделать его шаги наблюдаемыми. Milestone «пост-логин дашборд + инлайн-валидация» решается целиком внутри зафиксированного стека: **ноль новых зависимостей**. Эксперты для двух экранов без URL-требований используют условный рендер по `useState` в `App` (шаблон "lift state up"), а для формы на 2–3 поля — контролируемые инпуты с локальным per-field error state и чистой функцией-валидатором; роутер, state-менеджер и form-библиотека здесь — анти-паттерны, а не best practices.

Рекомендуемый подход: `App.jsx` держит `user` (`{ email } | null`), `LoginPage` валидирует локально и сообщает об успехе колбэком `onLoginSuccess(email)`, `DashboardPage` — презентационная заглушка (email + logout). Ключевой контекст из кода: `LoginPage` уже рендерит inline summary-error (`role="alert"`) — задача валидации означает **переход к per-field ошибкам** (текст у каждого поля, сброс при вводе), а не замену `alert()`.

Главный риск — не React, а инфраструктура верификации: `npm run lint` **не проверяет `.jsx`** (нет `--ext` — ложнозелёный линт, уже 2 скрытые ошибки jsx-a11y), per-field рефакторинг сломает селекторы `getByRole('alert')` (strict mode), а vitest-include `src/**` и Playwright `reuseExistingServer` создают классы молча-ложнозелёных прогонов. Митигируется Phase 0 (tooling fix: `--ext .js,.jsx`, паттерн label, `strictPort`) и осознанным обновлением тест-контракта вместе с валидацией.

## Key Findings

### Recommended Stack

Подробности: [STACK.md](STACK.md). Ноль новых библиотек — это рекомендация, а не упущение: весь стек (react 19.3.1, vite 8.3.5, vitest 5.0.5, Testing Library, Playwright 1.64.1) уже на последних стабильных версиях (проверено по npm registry 2026-10-23), а `npm install` — ask-gated. Эскалационные пути зафиксированы (react-hook-form при 5+ полях, `useActionState` при async-сабмите, hash-хук при необходимости bookmarkable URL, react-router при 5+ страницах), но ни один не срабатывает для этого milestone.

**Core technologies:**
- `useState` в `App.jsx` (условный рендер) — переключение login → dashboard; textbook-случай state-based switching без роутера
- Контролируемые инпуты + per-field errors (`{ email, password }` map) + чистый `validateLogin()` — ~20 строк, полный контроль над текстами (русские строки), бесплатный unit-test seam; паттерн touched/blur-on-demand
- Нативная семантика + ARIA — `aria-invalid`, `aria-describedby`, per-field `role="alert"`, сохранение `noValidate` (jsdom не умеет native constraint-validation UI)
- Vitest + Testing Library (colocated в `src/`) и Playwright (`e2e/`) — уже установлены и green; расширяются, а не заменяются

### Expected Features

Подробности: [FEATURES.md](FEATURES.md).

**Must have (table stakes):**
- Per-field inline errors для email/password (оба пустых → обе ошибки) — корректная интерпретация требования «инлайн, а не alert»
- Сброс ошибки поля при вводе (иначе inline-UX сломан, тесты вводят в заблуждение)
- `isLoggedIn`/`user` state + `onSuccess(email)` в `App.jsx`/`LoginPage` — enabling-механизм без роутера
- `DashboardPage.jsx`-заглушка (заголовок + email вошедшего) — email доказывает передачу state
- Logout-кнопка → возврат на логин — замыкает цикл, делает возможным round-trip e2e
- Юнит- и e2e-покрытие каждого нового поведения, включая App-level тест перехода и полный e2e-флоу

**Should have (differentiator стенда — agent-observability):**
- Стабильные семантические селекторы/roles везде (именно поэтому текущие тесты чистые)
- Round-trip e2e spec (login → dashboard → logout → login) — максимум верификации на тест
- `aria-invalid`/`aria-describedby` wiring (P2 — добавляется когда само станет агентной задачей)

**Defer (v2+):**
- Fake async login + loading state (конфликтует с e2e-детерминизмом), доп. stub-страницы (Settings), fake failure path — отдельные future milestones
- Всё из anti-features таблицы: реальный бэкенд/OAuth, persistence (localStorage), роутер, state-менеджер, form-библиотека, TS, i18n, format-валидация, forgot-password/sign-up, mobile, UI-киты, analytics

### Architecture Approach

Подробности: [ARCHITECTURE.md](ARCHITECTURE.md). Каноническая shape для no-router SPA: один shell-компонент `App` владеет единственным cross-page state (`user`), страницы владеют только локальным UI-state; data-flow строго однонаправленный (props вниз, колбэки вверх). Весь «роутинг» — один тернар; unmount `LoginPage` при переключении автоматически чистит состояние формы (это фича, не баг).

**Major components:**
1. `App.jsx` — shell: `user` state, условный рендер `user ? <DashboardPage/> : <LoginPage/>`; единственная точка будущей миграции на роутер
2. `LoginPage.jsx` — форма: контролируемые инпуты, локальные `errors`, `onLoginSuccess(email)` при успехе; валидационные ошибки никогда не покидают страницу
3. `DashboardPage.jsx` — презентационная заглушка: props `email` + `onLogout`, без state
4. Тесты: colocated `*.test.jsx` в `src/` (включая App-level тест перехода), новый `e2e/dashboard.spec.js` для полного флоу

**Критичные архитектурные решения (анти-паттерны):** auth state НЕ в `LoginPage` (unmount уничтожит), валидация НЕ в `App` (god component), никаких `window.location`/вторых HTML-входов, никаких `alert()`.

### Critical Pitfalls

Подробности: [PITFALLS.md](PITFALLS.md) (12 pitfalls с проверкой на живом коде).

1. **`npm run lint` не линтит `.jsx`** (`eslint .` без `--ext`) — ложнозелёный линт; уже 2 скрытые ошибки jsx-a11y в `LoginPage.jsx`. Фикс: `--ext .js,.jsx` в Phase 0; верификация — file-level `npx eslint <файлы>`
2. **Per-field валидация ломает тест-селекторы** — несколько `role="alert"` → strict mode violation; `toBeHidden()` даёт ложнозелёные тесты. Фикс: обновить селекторы как часть задачи (уникальные тексты, `toHaveCount(0)`), зафиксировать тексты ошибок на этапе дизайна
3. **Scope creep через «полезность»** — агент предлагает роутер/react-hook-form/zustand/TS; либо стопор на ask-гейте, либо самодельный hash-роутер. Фикс: ограничения явно в преамбуле каждой фазовой спеки
4. **Непротестированный переход логин→дашборд** — юниты per-component, e2e только форма; главный state-механизм milestone остаётся без тестов. Фикс: критерий готовности — «переход покрыт и App-level юнитом, и полным e2e»
5. **Молча-незапущенные/ложные тесты** — vitest include `src/**` (файл вне src не выполняется), Playwright `reuseExistingServer: true` (e2e против старого сервера на 5173). Фикс: сверять счётчик тестов в выводе Vitest; `lsof -ti:5173` перед прогоном, кандидат `strictPort: true`

Плюс hygiene-правила: ноль `console.*` в фичевом коде (риск залогировать пароль), раздельные коммиты (`agent infra:` для `.claude/**`/`.planning/**` vs фичевые для `src/**`/`e2e/**`), `useEffect` с cleanup при любой асинхронности (StrictMode double-mount).

## Implications for Roadmap

### Phase 1: Tooling fix — сделать верификацию честной
**Rationale:** Блокер: без него «lint green» в каждой следующей фазе фиктивно (Pitfall 1, 2); одна строка в `package.json`.
**Delivers:** `"lint": "eslint . --ext .js,.jsx"`; устранение накопленных ошибок jsx-a11y (вложенный `<label>` или настройка правила); опц. `strictPort: true` в playwright.config.
**Addresses:** none (infra) — но открывает честную верификацию всех фич.
**Avoids:** Pitfalls 1, 2; частично 7.

### Phase 2: App auth state + DashboardPage (переход)
**Rationale:** State-switch — enabling-механизм: без него дашборду некуда подключиться (ARCHITECTURE.md Build Order, шаги 1–2). State-дизайн утверждается до кода, чтобы отсечь drift (Pitfall 3).
**Delivers:** `user` state + условный рендер в `App.jsx`; `DashboardPage.jsx` (заголовок, email, logout); `onLoginSuccess(email)` в `LoginPage` вместо `console.log`-стаба.
**Uses:** `useState` (STACK.md), lift-state-up pattern (ARCHITECTURE.md Pattern 1/3).
**Implements:** архитектурные компоненты 1–3.
**Avoids:** Pitfalls 3 (state drift), 9 (scope creep — ограничения в спеке), 12 (console.log).

### Phase 3: Per-field inline validation
**Rationale:** Зависит от Phase 2 (success-path уже отделён от failure-path); независимо от неё по коду, но логично вторым шагом.
**Delivers:** per-field `errors` map, сообщения у каждого поля (`aria-invalid`/`aria-describedby`), сброс ошибки при вводе, `role="alert"` per field; осознанное обновление селекторов существующих тестов (`toHaveCount(0)` вместо `toBeHidden()`).
**Uses:** контролируемые инпуты + чистый валидатор (STACK.md Pattern 2).
**Avoids:** Pitfalls 4 (селекторы), UX-pitfalls (stale errors, screen-reader re-announce).

### Phase 4: Test coverage — unit + e2e флоу
**Rationale:** Переход логин→дашборд — ровно та новая логика, которую per-component тесты пропускают (Pitfall 5); e2e верифицирует собранное целое последним.
**Delivers:** App-level юнит (fill → submit → dashboard heading, login исчез); per-field validation юниты (colocated `src/pages/LoginPage.test.jsx`); `e2e/dashboard.spec.js` — полный round-trip login → dashboard → logout → login.
**Avoids:** Pitfalls 5 (разрыв покрытия), 6 (молча не запущенные тесты — сверять вывод Vitest), 7 (e2e против старого сервера).

### Phase 5: Verification + hygiene wrap-up
**Rationale:** Финальный прогон всех гейтов и гигиена коммитов/журнала — отдельный класс «looks done but isn't» проблем.
**Delivers:** `npm run build` + `npm test` + `npm run test:e2e` зелёные (против свежего dev-сервера); `grep console` пуст; раздельные коммиты; запись в `docs/memory.md`; ручное подтверждение через chrome-devtools MCP (hard reload + snapshot).
**Avoids:** Pitfalls 7, 11, 12 и «Looks Done But Isn't» чек-лист целиком.

### Phase Ordering Rationale

- **Tooling первым**, иначе верификация всех последующих фаз фиктивна (зависимость, а не удобство)
- **State+Dashboard раньше валидации**: dashboard требует `isLoggedIn`/`onSuccess` (FEATURES.md dependency graph); валидация независима по коду, но build order ARCHITECTURE.md ставит success-path перед per-field рефакторингом — меньше rework
- **Тесты флоу последними среди кодовых фаз**: e2e верифицирует собранное целое; App-юнит требует завершённого перехода
- **Группировка по архитектурным границам**: Phase 2 = `App` + новая страница; Phase 3 = внутренности `LoginPage` — фазы не пересекаются по файлам, каждая оставляет build зелёным
- **Pitfall-to-Phase mapping** (PITFALLS.md) прямо задаёт порядок: P1/P2 → tooling, P3/P9 → spec, P10/P12 → implementation, P5/P6 → unit, P7/P11 → e2e/hygiene

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (per-field validation):** контракт тестов — точные тексты ошибок и селекторы должны быть зафиксированы в спеке ДО кода (мини-контракт, меняющий DOM); вопрос re-announce `role="alert"` при повторном сабмите (key/пересоздание узла)

Phases with standard patterns (skip research-phase):
- **Phase 1 (tooling):** однострочные конфиг-фиксы, проверены в исследовании на живом репо
- **Phase 2 (dashboard/state):** lift-state-up + conditional render — канонический React-паттерн, примеры кода уже в ARCHITECTURE.md
- **Phase 4/5 (tests/verification):** established Testing Library/Playwright паттерны, документированы в PITFALLS.md с готовыми критериями готовности

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Все версии проверены по npm registry 2026-10-23; ноль новых deps; альтернативы оценены с триггер-условиями |
| Features | HIGH | Grounded в реальном коде репо (`LoginPage.jsx`, `App.test.jsx`, `e2e/login.spec.js`) и PROJECT.md; MVP-список полный и зависимый-упорядоченный |
| Architecture | HIGH | Канонический React-паттерн (lift state up, react.dev); согласован с существующей структурой; build order минимизирует rework |
| Pitfalls | HIGH | Проверено эмпирически на живом репо (ложнозелёный `npm run lint` подтверждён прогонами; 2 скрытые ошибки найдены) |

**Overall confidence:** HIGH

### Gaps to Address

- **Тексты ошибок и селекторы (мини-контракт):** не зафиксированы в исследовании окончательно («Введите email»/«Введите пароль» — кандидаты) — утвердить в спеке Phase 3 до кода
- **Решение по label-паттерну:** вложенный `<label>…<input/></label>` vs настройка `jsx-a11y/label-has-associated-control: { assert: 'htmlFor' }` — оба валидны; выбрать в Phase 1 и применить консистентно
- **Версионирование GSD-файлов:** сейчас untracked, «решилось само» — один раз закрепить в Key Decisions (влияет на commit-гигиену всех фаз)
- **F5-поведение дашборда:** принято «перезагрузка → логин», но нужно явно зафиксировать в спеке и проверить вручную (не «чинить»)

## Sources

### Primary (HIGH confidence)
- Живой код репозитория: `src/pages/LoginPage.jsx`, `src/App.jsx`, `src/App.test.jsx`, `e2e/login.spec.js`, `vite.config.js`, `playwright.config.js`, `.claude/settings.json`, `.eslintrc.cjs`, `package.json` — включая эмпирические прогоны `npm run lint` vs `npx eslint <file>` 2026-10-23
- npm registry (`npm view <pkg> version`, 2026-10-23) — версии всех установленных и рассмотренных пакетов
- react.dev — lift state up, sharing state, `useActionState` (React 19)
- MDN — `aria-invalid`, error messaging patterns

### Secondary (MEDIUM confidence)
- ESLint 8 docs (`--ext` default), jsx-a11y `label-has-associated-control` известные ограничения
- Playwright docs — strict mode, `toBeHidden()` vs `toHaveCount(0)`, `webServer.reuseExistingServer`/`strictPort`
- Testing Library / React 19 — `act`-предупреждения, `userEvent`, `findBy*`, StrictMode double-mount

### Tertiary (LOW confidence)
- Domain-калибровка по типичным React auth-демо и стартовым шаблонам (Vite starter, NextAuth/Clerk samples) — из общих знаний, не fetched; используется только как контраст в FEATURES.md

Детальные источники — в каждом из четырёх исследовательских документов.

---
*Research completed: 2026-10-23*
*Ready for roadmap: yes*
