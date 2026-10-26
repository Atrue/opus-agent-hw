# Phase 2: App Auth State + DashboardPage - Research

**Researched:** 2026-10-26
**Domain:** Router-less page switching via lift-state-up in React 19 (client-only SPA)
**Confidence:** HIGH

## Summary

Phase 2 is a small, fully client-side change with **zero new dependencies** and no external services. `App.jsx` gains a `user` state (`{ email } | null`) and switches between `LoginPage` and a new presentational `DashboardPage` via conditional render. `LoginPage`'s success branch replaces `console.log` with a call to the new `onLoginSuccess(email)` prop. The architecture was already researched at HIGH confidence in `.planning/research/ARCHITECTURE.md` (Pattern 1 lift-state-up, Pattern 3 router-less switching), and the user locked every content decision in `02-CONTEXT.md` (D-01..D-07) — so this phase's research is mostly about the **exact code contract** and the **blast radius on existing tests**.

Two findings deserve the planner's attention. First, the `ARCHITECTURE.md` Pattern 1 example passes `onLoginSuccess={setUser}` directly, which **conflicts with the locked contract** D-06/D-07 (`onLoginSuccess(email)` receives a plain string; `user` must be an object) — App must wrap: `onLoginSuccess={(email) => setUser({ email })}`, or `user.email` will be `undefined` on the dashboard. Second, the existing unit test `src/App.test.jsx:31-40` renders `<LoginPage />` with no props; after the change, a valid submit calls the absent prop and throws `TypeError` — existing tests must be updated to pass a mock (e.g., `vi.fn()`), which is exactly what plan 02-01 anticipates ("обновление существующих тестов под новый контракт").

Both existing e2e tests stay green by construction: the empty-submit test never logs in, and the valid-submit test's `toBeHidden()` assertion passes even when `LoginPage` unmounts and the alert disappears from the DOM — confirmed against Playwright docs. Boundary guard: **do not add the App-level transition unit test or the full round-trip e2e** — those are TEST-01/TEST-02, owned by Phase 4.

**Primary recommendation:** One plan (02-01) with build order: `DashboardPage.jsx` stub → `App.jsx` state + switch → `LoginPage` success wiring → update `App.test.jsx` + optionally strengthen `e2e/login.spec.js` → gates (`npm run lint` + `npm run build` + `npm test` + `npm run test:e2e`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-02 | После успешного входа пользователь попадает на страницу-заглушку дашборда, где отображается email вошедшего | Lift-state-up pattern (ARCHITECTURE.md Pattern 1) + locked D-01/D-02/D-06/D-07 define the exact contract; target `App.jsx`/`DashboardPage.jsx` code below; existing e2e valid-submit test can assert the new heading |
| AUTH-03 | Пользователь может выйти (кнопка на дашборде) и возвращается на страницу входа | D-03/D-04: `onLogout` → `setUser(null)` → `LoginPage` remounts with fresh state (unmount = natural reset, no extra code); works by construction since no persistence exists |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

Directives the plan MUST honor (same authority as locked decisions):

1. **Zero new dependencies** — `npm install` requires user confirmation (ask); this phase needs none (see Standard Stack).
2. **Verification gates after every JS/JSX edit:** `npm run build` + `npm test` (AGENTS.md); after e2e edits also `npm run test:e2e`. Final lint check: `npm run lint` (PostToolUse hook runs `eslint --fix` on each write; it is not the final gate).
3. **Conventional Commits** (`type(scope): subject`) enforced by PreToolUse hook `gsd-validate-commit.sh`.
4. **Code style** (`.claude/rules/js-ts.md`): ES modules only; arrow-function components; `const` by default; `===`; functional components + hooks; one component = one file, PascalCase; keys by stable ids (N/A here); no TypeScript.
5. **Tests:** unit tests colocated in `src/` (`*.test.jsx`), e2e in `e2e/`.
6. **Safety:** `rm -rf` forbidden; `.env`/`.env.*` never read or modified; `git push` needs user confirmation.
7. **Session memory:** append a row to `docs/memory.md` at end of session (date, what was done, what's next).
8. **UI checks in browser** via chrome-devtools MCP or Playwright.

## Architectural Responsibility Map

Pure client-side SPA — every capability lives in the Browser/Client tier; no other tier exists in this app.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth-stub state (`user: { email } \| null`) | Browser/Client — `App.jsx` | — | The only cross-page state; must survive `LoginPage` unmount, so it lives above both pages (lift state up, ARCHITECTURE.md Pattern 1) |
| Page switching (login ↔ dashboard) | Browser/Client — `App.jsx` conditional render | — | Router is Out of Scope (REQUIREMENTS.md); 2 pages = one ternary (Pattern 3) |
| Form fields + validation error state | Browser/Client — `LoginPage.jsx` (local) | — | Errors die with the page (D-05, anti-pattern 2: never lift into App) |
| Dashboard content + logout action | Browser/Client — `DashboardPage.jsx` (presentational, no state) | — | Pure function of props `email`/`onLogout`; keeps the page trivially testable |
| Persistence / session storage | — (explicitly none) | — | localStorage is Out of Scope (breaks e2e repeatability); reload returns to login by design |
| API / backend | — (stub by design) | — | Real auth is Out of Scope (REQUIREMENTS.md) |

## Standard Stack

### Core

Zero new packages. The installed stack is complete and verified green (Phase 1 gates + existing tests pass on it).

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react / react-dom | 19.3.1 (installed, `package.json:17-18`) | `useState` in `App.jsx`; conditional render | Built-in; the entire phase is core React — lift state up + ternary switching [VERIFIED: package.json:16-19] |
| @testing-library/react | 16.3.3 (installed) | Render/assert updated unit tests | Existing green tests already use it [VERIFIED: src/App.test.jsx:2] |
| @testing-library/user-event | 14.6.8 (installed) | Type + submit flows in updated tests | Already used [VERIFIED: src/App.test.jsx:3,23] |
| @testing-library/jest-dom | 7.0.1 (installed) | `toBeInTheDocument` matchers | Already used [VERIFIED: src/App.test.jsx:10] |
| vitest | 5.0.5 (installed) | Test runner; `vi.fn()` for the login-success mock | Already imported from 'vitest' [VERIFIED: src/App.test.jsx:1] |
| @playwright/test | 1.64.1 (installed) | e2e updates in `e2e/login.spec.js` | Already wired with dev-server auto-start + `strictPort: true` (Phase 1) |

**Installation:** none — do not run `npm install` (requires user approval; nothing to install).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useState` + ternary in `App.jsx` | react-router, Context, zustand, `window.location` | ALL explicitly Out of Scope (REQUIREMENTS.md) and forbidden by success criterion 4. Not considered further |
| `vi.fn()` mock in tests | Default-noop prop `onLoginSuccess = () => {}` in `LoginPage` | Default param keeps old tests green untouched but hides a required-prop contract and weakens the test seam; prefer explicit mock in tests (see Pitfall 2) |

## Package Legitimacy Audit

**No external packages are installed or recommended in this phase.** The gate is not applicable — zero new dependencies by design (frozen stack; `npm install` behind user approval). All tooling listed in Standard Stack is already installed and pinned in `package.json` [VERIFIED: package.json:16-36].

## Architecture Patterns

### System Architecture Diagram (target state)

```
index.html (#root)
    └── src/main.jsx (StrictMode + createRoot — unchanged)
        └── src/App.jsx  ── shell / page switcher
            │  owns: user ({ email } | null)   ← the ONLY cross-page state
            │
            ├─ user === null ──────────────► <LoginPage onLoginSuccess={(email) => setUser({ email })} />
            │                                    │  local: email, password, error
            │                                    │  invalid submit → local <p role="alert"> (never reaches App)
            │                                    └─ valid submit ──► onLoginSuccess(email) ─┐
            │                                                                        │ callback up (string!)
            │  setUser({ email }) ◄─────────────────────────────────────────────────────┘
            │
            └─ user !== null ──────────────► <DashboardPage email={user.email} onLogout={() => setUser(null)} />
                                             │  presentational, no state
                                             │  h1 «Дашборд» / <p>Вы вошли как {email}</p> / кнопка «Выйти»
                                             └─ click «Выйти» ──► setUser(null) ──► LoginPage remounts fresh
                                                                                  (unmount = form + error reset, D-04/D-05)
```

One-way data flow: props down (`email`, callbacks), events up (`onLoginSuccess`, `onLogout`). No sibling communication, no context, no router.

### Recommended Project Structure (delta from current)

```
src/
├── main.jsx                 # unchanged
├── App.jsx                  # + user state, conditional render
├── App.test.jsx             # updated: mock prop for LoginPage tests; App test unchanged
└── pages/
    ├── LoginPage.jsx        # success branch: onLoginSuccess(email) replaces console.log
    └── DashboardPage.jsx    # NEW — presentational stub
e2e/
└── login.spec.js            # updated (discretion): optionally assert dashboard heading after login
```

Note: ARCHITECTURE.md's fuller structure (`LoginPage.test.jsx`, `DashboardPage.test.jsx` colocated per page) remains optional; the existing tests live in `App.test.jsx` and both layouts satisfy the colocated-in-`src/` convention. Minimal churn is preferable in this phase.

### Pattern 1: Lift state up with an object user (locked by D-06/D-07)

**What:** `App` owns `user`; pages communicate only via callback props.
**When to use:** Always here — `LoginPage` unmounts on switch, so it cannot hold auth state (ARCHITECTURE.md anti-pattern 1).

Target `App.jsx` (exact contract per D-06/D-07):

```jsx
// src/App.jsx — target
import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <LoginPage onLoginSuccess={(email) => setUser({ email })} />;
  }
  return <DashboardPage email={user.email} onLogout={() => setUser(null)} />;
}

export default App;
```

**Critical:** the wrapper `(email) => setUser({ email })` is mandatory — see Pitfall 1. `user ? <DashboardPage … /> : <LoginPage … />` (D-06's ternary form) is equivalent to the early-return form above.

### Pattern 2: Presentational stub page (locked by D-01/D-02/D-03)

```jsx
// src/pages/DashboardPage.jsx — skeleton (className per discretion, mirrors login-page)
function DashboardPage({ email, onLogout }) {
  return (
    <main className="dashboard-page">
      <h1>Дашборд</h1>
      <p>Вы вошли как {email}</p>
      <button type="button" onClick={onLogout}>Выйти</button>
    </main>
  );
}

export default DashboardPage;
```

Locked verbatim values (from CONTEXT.md D-01/D-02/D-03): heading text `«Дашборд»`, string `<p>Вы вошли как {email}</p>`, button text `«Выйти»` — Phase 4's e2e will select `getByRole('button', { name: 'Выйти' })` and `heading` named `Дашборд`, so these strings are a cross-phase contract.

### Pattern 3: Unmount-as-reset (logout needs no code)

D-04: logout = `setUser(null)` → `LoginPage` remounts with fresh `useState('')` fields and empty error. Never write manual "clear fields on logout" code — the unmount already does it, and manual reset would require keeping form state alive across pages (anti-pattern 2).

### Pattern 4: Login success wiring (locked by D-07)

```jsx
// src/pages/LoginPage.jsx — handleSubmit success branch replaces lines 14-17
    setError('');
    onLoginSuccess(email);
```

Only `email` crosses the boundary — the password never leaves `LoginPage` (D-07). The comment stub at `src/pages/LoginPage.jsx:14-15` should be updated to describe the new contract (discretion item).

### Anti-Patterns to Avoid

- **`onLoginSuccess={setUser}` (shape mismatch):** breaks `user.email` — see Pitfall 1.
- **Auth state inside `LoginPage`:** destroyed on unmount; couples pages (ARCHITECTURE.md anti-pattern 1).
- **`window.location` / second HTML entry:** forbidden by success criterion 4 and ARCHITECTURE.md anti-pattern 4.
- **Manual form-reset code on logout:** unmount already resets (Pattern 3).
- **Adding Phase 4 test coverage now:** TEST-01 (App-level transition unit) and TEST-02 (round-trip e2e) are Phase 4; this phase only *updates existing* tests (CONTEXT.md discretion, plan 02-01 scope).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Page navigation | `window.location.href` / second HTML entry / hash hacks | Conditional render in `App.jsx` | Success criterion 4 forbids it; breaks SPA state and Playwright config (ARCHITECTURE.md anti-pattern 4) |
| Global auth store | Context / reducer / zustand | `useState` in `App.jsx` | One boolean-equivalent state; store is pure overhead and Out of Scope |
| Form reset on logout | Field-clearing effects or lifted form state | Natural unmount of `LoginPage` | D-04: zero code, zero persistence, provably fresh remount |
| Test spy for `onLoginSuccess` | Hand-rolled `let called = false` closure | `vi.fn()` + `toHaveBeenCalled*` | Vitest provides it; gives call-argument assertions for free |

**Key insight:** every mechanism this phase needs (state ownership, switching, reset, test doubles) is either core React or the existing test stack. The phase's entire risk lives in the prop contract and test updates, not in any technology choice.

## Common Pitfalls

### Pitfall 1: `onLoginSuccess={setUser}` — the ARCHITECTURE.md example conflicts with the locked contract
**What goes wrong:** `.planning/research/ARCHITECTURE.md:82` shows `if (!user) return <LoginPage onLoginSuccess={setUser} />;`. With the locked D-07 contract, `LoginPage` calls `onLoginSuccess(email)` with a **string**. Passing `setUser` directly would set `user = 'user@example.com'`, so `user.email` is `undefined` and the dashboard renders «Вы вошли как » with an empty email — a silent bug that all "does something render" tests can miss.
**Why it happens:** the architecture doc's example was written before the user locked the object shape (D-06: `setUser({ email })`).
**How to avoid:** CONTEXT.md wins. App must pass `onLoginSuccess={(email) => setUser({ email })}` [VERIFIED: 02-CONTEXT.md:26-27 — «вход → `setUser({ email })`», «проп `onLoginSuccess(email)` — только email»]. A test asserting the rendered text contains the actual email (e.g., `Вы вошли как user@example.com`) catches this class of bug.
**Warning signs:** dashboard shows «Вы вошли как » with nothing after it.

### Pitfall 2: Existing unit test renders `<LoginPage />` with no props — valid submit now throws
**What goes wrong:** `src/App.test.jsx:31-40` («не показывает ошибку при заполненных полях») renders `<LoginPage />` bare. After the change, a valid submit reaches `onLoginSuccess(email)` — `undefined is not a function`, test fails.
**Why it happens:** the prop is new; the test predates the contract.
**How to avoid:** update the test to pass an explicit mock and (recommended) assert the contract:

```jsx
// src/App.test.jsx — updated test (add vi to the vitest import on line 1)
import { describe, expect, test, vi } from 'vitest';

test('не показывает ошибку при заполненных полях и сообщает об успехе', async () => {
  const user = userEvent.setup();
  const onLoginSuccess = vi.fn();
  render(<LoginPage onLoginSuccess={onLoginSuccess} />);

  await user.type(screen.getByLabelText(/email/i), 'user@example.com');
  await user.type(screen.getByLabelText(/пароль/i), 'secret');
  await user.click(screen.getByRole('button', { name: 'Войти' }));

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(onLoginSuccess).toHaveBeenCalledWith('user@example.com');
});
```

The other three tests need no changes: the App test renders `App` (starts at `user = null` → login heading still shows), and the two error-path tests never reach the success branch [VERIFIED: src/App.test.jsx:7-40].

### Pitfall 3: Assuming the valid-submit e2e test breaks when LoginPage unmounts
**What goes wrong (the worry, not the bug):** after login succeeds, `LoginPage` unmounts, so `page.getByRole('alert')` matches nothing.
**Why it's actually fine:** Playwright's `toBeHidden()` "Ensures that Locator either does not resolve to any DOM node, or resolves to a non-visible one" — an element absent from the DOM counts as hidden, so the assertion passes [CITED: playwright.dev/docs/api/class-locatorassertions, fetched 2026-10-26]. The empty-submit e2e test never logs in, so it is unaffected.
**How to avoid (the real risk):** the test now passes *vacuously* — it would have passed before this phase too. Since test-update scope is discretion, the cheap, meaningful strengthening is to also assert the transition (see Code Examples). Full round-trip stays in Phase 4 (TEST-02).
**Warning signs:** e2e "passing" while asserting nothing about the new behavior.

### Pitfall 4: Dead `console.log` left behind / style regressions
**What goes wrong:** leaving `console.log('login', { email })` (src/pages/LoginPage.jsx:17) alongside the new callback, or letting the PostToolUse `eslint --fix` hook be mistaken for the final lint gate.
**How to avoid:** the log goes and the stub comment is rewritten per the discretion item; final gates are always the explicit commands — `npm run lint`, `npm run build`, `npm test`, and (e2e touched) `npm run test:e2e` (AGENTS.md).
**Warning signs:** any `console.` call surviving in `LoginPage.jsx` after the change.

### Pitfall 5: Scope creep into Phase 3/Phase 4 territory
**What goes wrong:** implementing per-field validation errors (AUTH-01, Phase 3), the App-level transition unit test (TEST-01, Phase 4), or `e2e/dashboard.spec.js` round-trip (TEST-02, Phase 4) inside this phase.
**Why it happens:** they sit in the same files and feel natural to do "while here."
**How to avoid:** this phase's test surface = update existing tests for the new contract only [VERIFIED: 02-CONTEXT.md:32 — «обновить существующие, не добавляя покрытие Phase 4»]. Success criterion 4 requires existing tests green, not new coverage.
**Warning signs:** plan tasks mentioning `errors` map, `aria-invalid`, or `dashboard.spec.js`.

## Code Examples

### DashboardPage.jsx (new file — full skeleton)
See Pattern 2 above. All three user-facing strings are locked (D-01/D-02/D-03); only the wrapper element/className is discretion.

### LoginPage handleSubmit — success branch
See Pattern 4 above. The failure branch (`setError('Заполните email и пароль')`, src/pages/LoginPage.jsx:10-13) is **unchanged** in this phase — the error text is a test contract for both existing suites [VERIFIED: src/pages/LoginPage.jsx:11; src/App.test.jsx:28; e2e/login.spec.js:10].

### e2e/login.spec.js — optional strengthening of the valid-submit test (discretion)
```js
// Source: project e2e conventions (e2e/login.spec.js) + Playwright docs
test('заполненная форма отправляется без предупреждения', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Пароль').fill('secret');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByRole('alert')).toBeHidden();
  // Optional strengthening (recommended — makes the test assert the new behavior):
  await expect(page.getByRole('heading', { name: 'Дашборд' })).toBeVisible();
  await expect(page.getByText('Вы вошли как user@example.com')).toBeVisible();
});
```

### Verification of success criterion 3 (logout → re-login) without Phase 4's round-trip e2e
Works by construction: logout = `setUser(null)` → `LoginPage` remounts with fresh state; re-login calls `setUser({ email })` again. No persistence exists anywhere (REQUIREMENTS.md Out of Scope), so there is no stale state to break the cycle. Confirm once manually via `npm run dev` (browser check per AGENTS.md rule 6) or with the strengthened e2e above plus a «Выйти» click; the dedicated automated round-trip is Phase 4's TEST-02.

## State of the Art

Not applicable in any meaningful sense — this phase uses only stable, years-old core React (`useState`, conditional render, lift-state-up as documented on react.dev and cited in `.planning/research/ARCHITECTURE.md`). Nothing deprecated, nothing new to adopt.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Strengthening the existing e2e valid-submit test (adding dashboard assertions) is within the discretion area "объём правок существующих тестов" rather than Phase 4 scope creep | Common Pitfalls 3, Code Examples | Low — if the user disagrees, the planner simply skips the two added `expect` lines; the core phase is unaffected |

All other claims are verified against in-repo files (cited with line ranges) or Playwright's official docs. `[ASSUMED]`-tagged knowledge is not load-bearing for this phase.

## Open Questions

1. **How far to strengthen `e2e/login.spec.js`?**
   - What we know: both existing e2e tests remain green without changes (verified semantics); test-update scope is explicit discretion; full round-trip e2e is Phase 4 (TEST-02).
   - What's unclear: whether the user wants the two extra assertions now or the absolute minimum diff.
   - Recommendation: add the dashboard-heading + email assertions to the valid-submit test (cheap, makes the e2e meaningful for this phase's headline behavior); leave the logout round-trip to Phase 4. Flag as a small decision at plan review if needed.

2. **Where do updated LoginPage unit tests live?**
   - What we know: today all four tests are in `src/App.test.jsx`; ARCHITECTURE.md suggests optional per-page colocated files; both satisfy the project convention (tests in `src/`).
   - Recommendation: keep them in `App.test.jsx` — minimal churn, and Phase 4 will reorganize coverage anyway (TEST-01). Not worth a user decision.

## Security Domain

`security_enforcement: true`, ASVS level 1 (`.planning/config.json:48-50`). Assessment: **no new attack surface** — the phase adds no inputs, no network, no storage, no secrets.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Auth is a deliberate stub; real backend/OAuth is Out of Scope (REQUIREMENTS.md) |
| V3 Session Management | No | No session exists; state is in-memory only, lost on reload by design |
| V4 Access Control | No | The dashboard "gate" is cosmetic (`user` truthiness) — acceptable and intentional for a testbed; no real resource is protected |
| V5 Input Validation | No change | No new inputs; existing empty-field check in `LoginPage` (Phase 3 refines it) |
| V6 Cryptography | No | No credentials, tokens, or secrets handled |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credential leakage into app-level state / logs | Information Disclosure | D-07 contract: only `email` crosses `LoginPage → App`; password stays local. Removing `console.log` (src/pages/LoginPage.jsx:17) eliminates the current log of the email — do not add a replacement log of credentials |
| Token/credential persistence (localStorage) | Spoofing/Replay | Explicitly Out of Scope — nothing may be persisted (REQUIREMENTS.md); keep it that way |

## Sources

### Primary (HIGH confidence)
- In-repo files read this session: `src/App.jsx` (1-7), `src/pages/LoginPage.jsx` (1-51), `src/App.test.jsx` (1-41), `e2e/login.spec.js` (1-21), `package.json` (1-37), `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (Phase 2, lines 38-53), `.planning/STATE.md`, `.planning/config.json`
- `.planning/phases/02-app-auth-state-dashboardpage/02-CONTEXT.md` — locked decisions D-01..D-07, discretion areas, canonical refs
- `.planning/research/ARCHITECTURE.md` — Patterns 1-3, anti-patterns 1-4, build order (note: its Pattern 1 example conflicts with D-06/D-07 — see Pitfall 1)

### Secondary (MEDIUM confidence)
- Playwright official docs — LocatorAssertions API, `toBeHidden()` semantics for absent DOM nodes (fetched 2026-10-26)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; everything verified installed and green in `package.json` and existing tests
- Architecture: HIGH — fully specified by locked CONTEXT.md decisions + prior ARCHITECTURE.md research; only the setUser-shape conflict needed resolution (Pitfall 1)
- Pitfalls: HIGH — grounded in exact lines of the actual test files that must change; Playwright behavior doc-verified

**Research date:** 2026-10-26
**Valid until:** indefinite — no external moving parts (frozen stack, no deps, no services)
