# Phase 2: App Auth State + DashboardPage - Context

**Gathered:** 2026-10-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Переход login → dashboard: `App.jsx` владеет auth-state и рендерит `LoginPage` или `DashboardPage` условно; дашборд показывает email вошедшего и кнопку выхода (AUTH-02, AUTH-03). Только этот переход — без per-field валидации (Phase 3), без новых App-level/e2e тестов полного покрытия (Phase 4), без роутера/state-менеджера/persistence.

</domain>

<decisions>
## Implementation Decisions

### Контент дашборда
- **D-01:** Заголовок страницы (h1) — «Дашборд». Тесты ищут `heading` с этим именем.
- **D-02:** Email отображается одной строкой `<p>Вы вошли как {email}</p>` под заголовком — минимум разметки, легко искать по тексту.
- **D-03:** Кнопка logout — «Выйти» (короткая, однозначная; e2e Phase 4 будет кликать `getByRole('button', { name: 'Выйти' })`).

### Поведение logout
- **D-04:** После logout пользователь возвращается на страницу входа с пустыми полями. Сброс происходит естественно при размонтировании `LoginPage` — никакого допкода и никакого persistence (Out of Scope по REQUIREMENTS.md).
- **D-05:** Form-level ошибка «Заполните email и пароль» исчезает вместе с размонтированием `LoginPage`; error-state остаётся локальным внутри `LoginPage` (анти-паттерн 2 из research: не поднимать ошибки в App).

### Форма user state
- **D-06:** Auth-state в `App.jsx` — `const [user, setUser] = useState(null)`: вход → `setUser({ email })`, выход → `setUser(null)`. Условный рендер: `user ? <DashboardPage … /> : <LoginPage … />`. Объект устойчив к будущим полям пользователя; семантика «пользователь вошёл», а не «строка не пустая».
- **D-07:** Контракт `LoginPage → App`: проп `onLoginSuccess(email)` — только email, пароль наружу не выходит. — **Reversibility:** costly — контракт пропа закрепляется тестами (App.test.jsx, e2e Phase 4); смена сигнатуры позже затронет все точки вызова.

### Claude's Discretion
- Семантика/классы разметки `DashboardPage` (например, `<main className="dashboard-page">` по аналогии с `login-page`).
- Судьба `console.log('login', { email })` (`src/pages/LoginPage.jsx:17`) и комментария-заглушки — лог уходит, комментарий обновляется под новый контракт.
- Объём правок существующих тестов под новый контракт (область «Тесты в Phase 2» не обсуждалась — рамка остаётся как в плане 02-01: обновить существующие, не добавляя покрытие Phase 4).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Требования и план фазы
- `.planning/REQUIREMENTS.md` — AUTH-02, AUTH-03 (требования фазы); Out of Scope (no persistence, no router/state-manager)
- `.planning/ROADMAP.md` §Phase 2 — goal, success criteria 1–4, план 02-01
- `.planning/research/ARCHITECTURE.md` — Pattern 3 (router-less page switching через conditional render), Pattern 2 и анти-паттерны (errors живут внутри LoginPage)

### Код — объекты правок
- `src/App.jsx` — текущая точка монтирования `LoginPage`; сюда добавляется `user` state
- `src/pages/LoginPage.jsx` — сюда добавляется `onLoginSuccess(email)` в handleSubmit
- `src/App.test.jsx` — существующие юниты под обновление контракта
- `e2e/login.spec.js` — существующие e2e под обновление контракта

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/LoginPage.jsx` — готовая форма с controlled inputs и form-level `role="alert"` ошибкой; меняется только успешная ветка `handleSubmit`
- `src/App.test.jsx` — 4 зелёных теста (App renders login, поля/кнопка, ошибка при пустых полях, нет ошибки при заполненных) — база для обновления контракта

### Established Patterns
- Один компонент = один файл, PascalCase, функциональные компоненты + хуки (`.claude/rules/js-ts.md`)
- Страница оборачивается в `<main className="<page>-page">` с одним `h1` (паттерн `LoginPage`)
- После правок JS/JSX обязательны `npm run build` + `npm test` (AGENTS.md)

### Integration Points
- `src/main.jsx` монтирует `App` — выше по стеку ничего не меняется
- `src/App.jsx:3-5` — единственное место, где `LoginPage` рендерится; сюда встаёт условный рендер
- Существующие тесты: `App.test.jsx` рендерит и `App`, и `LoginPage` напрямую; `e2e/login.spec.js` проверяет alert после сабмита — при новом контракте после успешного входа форма исчезает (оба текущих позитивных теста остаются зелёными, alert отсутствует)

</code_context>

<specifics>
## Specific Ideas

Пользователь явно выбрал: заголовок «Дашборд», строка «Вы вошли как {email}», кнопка «Выйти»; поля формы сбрасываются естественно при logout; `user: { email } | null` + `onLoginSuccess(email)`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 2-App Auth State + DashboardPage*
*Context gathered: 2026-10-26*
