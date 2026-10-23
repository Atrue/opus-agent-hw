# Architecture Research

**Domain:** Minimal multi-page React SPA (login → dashboard) without a router library or state manager — page switching via conditional render, state via hooks
**Researched:** 2026-10-23
**Confidence:** HIGH

## Standard Architecture

### System Overview

For a no-router, no-state-manager React SPA, the canonical shape is a single "shell" component (`App`) that owns the application-level state (which page is showing, whether the user is "authenticated") and conditionally renders one page component at a time. Each page owns only its local UI state (form fields, validation errors). Data flows one way: props down, callbacks up.

```
index.html (#root)
    └── src/main.jsx (StrictMode + createRoot)
        └── src/App.jsx  ── shell / page switcher
            │  owns: auth-stub state (isAuthed, userEmail)
            │  renders: <LoginPage> OR <DashboardPage>
            │
            ├── src/pages/LoginPage.jsx
            │   owns: email, password, validation errors (all LOCAL)
            │   props: onLoginSuccess(email)
            │
            └── src/pages/DashboardPage.jsx
                owns: nothing (presentational stub)
                props: email, onLogout (optional)
```

No extra layers: no context, no reducer, no router. The whole "routing" mechanism is one ternary inside `App`.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `App.jsx` | Application shell: owns auth-stub state + page switching; passes data down and callbacks up | `const [user, setUser] = useState(null)` + conditional render `user ? <DashboardPage/> : <LoginPage onLoginSuccess={setUser}/>` |
| `LoginPage.jsx` | Login form: controlled inputs, inline validation, reports success upward | Local `useState` per field + `errors` state; `onLoginSuccess(email)` callback prop when validation passes |
| `DashboardPage.jsx` | Post-login stub page: shows the logged-in identity, demonstrates that switching works | Pure function of props (`email`), no state; optionally an "Exit" button calling `onLogout` to test the reverse transition |
| Unit tests (`src/*.test.jsx`, colocated) | Verify state transitions and validation logic at component level | Vitest + Testing Library; render `App` for the switching test, render `LoginPage`/`DashboardPage` in isolation for page-local behavior |
| E2E (`e2e/*.spec.js`) | Verify the full login → dashboard flow in a real browser | Playwright fills the form, submits, asserts dashboard heading appears (no URL navigation possible without a router) |

## Recommended Project Structure

```
src/
├── main.jsx              # bootstrap (unchanged)
├── App.jsx               # shell: auth state + page switch
├── App.test.jsx          # page-switching tests + re-export of page tests
├── setupTests.js         # Testing Library setup (existing)
└── pages/
    ├── LoginPage.jsx     # form + inline validation (existing, extended)
    ├── LoginPage.test.jsx  # validation unit tests (moved next to page)
    ├── DashboardPage.jsx   # new stub page
    └── DashboardPage.test.jsx
e2e/
└── dashboard.spec.js     # new: full login → dashboard flow
```

### Structure Rationale

- **`pages/`:** one component = one file (PascalCase), matching the existing `LoginPage.jsx` convention. Adding `DashboardPage.jsx` next to it keeps the flat, discoverable layout — no `components/`, `hooks/`, or `views/` folders until there is more than one of a kind.
- **Colocated tests:** project convention — Vitest include is scoped to `src/`, so page tests must live beside the pages. The existing validation tests inside `App.test.jsx` can stay or migrate to `LoginPage.test.jsx`; either satisfies the convention.
- **`e2e/`:** a separate `dashboard.spec.js` per user flow, mirroring `login.spec.js`.

## Architectural Patterns

### Pattern 1: Lift State Up (App owns auth, LoginPage stays dumb about it)

**What:** The only state that outlives a single page — the auth-stub flag and user identity — lives in `App`. Page components receive callbacks instead of holding global state.
**When to use:** Always, in an SPA where one page's action (successful login) must change what another region renders.
**Trade-offs:** One extra prop per page; trivially cheap at this size. The alternative (auth state inside `LoginPage`) fails immediately — `LoginPage` unmounts on switch, so its state would be destroyed.

**Example:**
```jsx
// src/App.jsx
import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

const App = () => {
  const [user, setUser] = useState(null);

  if (!user) return <LoginPage onLoginSuccess={setUser} />;
  return <DashboardPage email={user.email} onLogout={() => setUser(null)} />;
};

export default App;
```

### Pattern 2: Controlled form with local validation-error state

**What:** Inputs are controlled (`value` + `onChange` from local `useState`). Validation errors are also local state, computed on submit (or on blur), rendered inline next to the offending field — never via `alert()`.
**When to use:** Any form in a hooks-only React app. Per-field error maps (`{ email: '...', password: '...' }`) scale better than the current single-string error and make inline placement natural.
**Trade-offs:** Slightly more state than a single error string; in exchange, each message can sit next to its input, and `aria` wiring stays simple. Overkill would be adding a form library (Formik/react-hook-form) — out of scope for this stack.

**Example:**
```jsx
// inside LoginPage
const [errors, setErrors] = useState({ email: '', password: '' });

const handleSubmit = (e) => {
  e.preventDefault();
  const next = {
    email: !email ? 'Введите email' : '',
    password: !password ? 'Введите пароль' : '',
  };
  setErrors(next);
  if (!next.email && !next.password) onLoginSuccess(email);
};

// per field, inline:
<input id="email" ... aria-invalid={!!errors.email} />
{errors.email && <p role="alert">{errors.email}</p>}
```

### Pattern 3: Page switching via conditional render (router-less)

**What:** `App` renders exactly one page based on state, using a ternary (2 pages) or a small map (`{ login: <LoginPage/>, dashboard: <DashboardPage/> }[page]` for 3+). No URL changes, no history — the browser back button does not navigate pages.
**When to use:** Deliberate choice here: the project is a testbed, the stack is frozen (router is Out of Scope), and there are only two pages.
**Trade-offs:** No deep-linking (dashboard is unreachable by URL — e2e tests must log in through the form), no back-button semantics. Acceptable for the milestone; the escape hatch is a later migration to `react-router` or `history`-based switching, which `App`'s single switch point makes cheap.

## Data Flow

### Auth Flow (login → dashboard)

```
User types email/password + submit
    ↓
LoginPage.handleSubmit  ──(local validation; errors stay in LoginPage)
    ↓ pass
onLoginSuccess(email)   ── callback prop, called upward
    ↓
App: setUser({ email }) ── state change in the shell
    ↓ re-render
App renders DashboardPage (LoginPage unmounts, its form state is discarded)
```

### State Management

```
App state:   user ({ email } | null)        ← the ONLY cross-page state
LoginPage:   email, password, errors        ← form-local, dies with the page
Dashboard:   (none)                          ← presentational
```

### Key Data Flows

1. **Login success:** child → parent via callback (`onLoginSuccess`), then top-down via prop (`email` into `DashboardPage`). Strictly unidirectional; no sibling communication ever occurs.
2. **Validation error:** entirely internal to `LoginPage` — submit sets `errors`, re-render shows inline `<p role="alert">` messages. `App` never sees validation failures. This is the correct boundary: errors are form-scoped, auth is app-scoped.
3. **Logout (optional):** `DashboardPage` → `onLogout` → `App: setUser(null)` → back to `LoginPage`. Cheap to add and doubles as a test of the reverse transition.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 2 pages (now) | Conditional render in `App`. Nothing more. |
| 3–4 pages | Keep the switch in `App`, move it to a lookup map; extract `user` access into a custom `useAuth()` hook if prop depth grows. Still no router. |
| 5+ pages / need for URLs, deep links, back button | Migrate to `react-router-dom` — a single-file change confined to `App.jsx` because pages already communicate only through props. Out of scope for this project. |

### Scaling Priorities

1. **First bottleneck — page count:** the ternary becomes unreadable at ~3 pages; switch to a map, then to a router (explicitly deferred).
2. **Second bottleneck — prop drilling:** if a third nesting level needs `user`, wrap it in a Context provider before reaching for a state manager (also deferred — stack is frozen).

## Anti-Patterns

### Anti-Pattern 1: Auth state inside LoginPage

**What people do:** Keep `isLoggedIn` in `LoginPage` and render the dashboard beneath the form.
**Why it's wrong:** Couples the two pages, makes the switch invisible to `App`, and destroys the natural unmount boundary; every future page change has to touch the login form.
**Do this instead:** Lift `user` into `App`; `LoginPage` only reports success upward.

### Anti-Pattern 2: Global validation state

**What people do:** Put form-field values or errors in `App` "so tests can see them."
**Why it's wrong:** `App` becomes a god component; form state has no reason to outlive the page.
**Do this instead:** Validation state is local to `LoginPage`; unit tests render `LoginPage` directly (the existing tests already do this).

### Anti-Pattern 3: alert()/console-only feedback

**What people do:** Use `alert()` or only `console.log` for validation failures.
**Why it's wrong:** Not testable via Testing Library/Playwright roles, blocks the e2e runner with native dialogs, and is an explicit Active requirement to remove.
**Do this instead:** Inline `<p role="alert">` per field (the codebase already uses `role="alert"` for the shared error — keep that attribute so existing tests keep matching).

### Anti-Pattern 4: Fake routing hacks

**What people do:** `window.location.href = '/dashboard.html'` or a second HTML entry.
**Why it's wrong:** Vite multi-page setup fights `index.html`-single-entry convention; breaks SPA state and the Playwright config; `.env`/config churn for zero value.
**Do this instead:** Conditional render in `App`.

## Integration Points

### External Services

None — auth is a stub by design (real backend is Out of Scope). No fetch, no context, no storage beyond memory; a page reload returns to the login screen, which is the desired testbed behavior.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `App` ↔ pages | Props down, callbacks up (`onLoginSuccess`, `onLogout`) | Only contract in the app; keep it — it makes a future router swap local to `App.jsx` |
| App code ↔ `.claude/` agent infra | None (separate trees) | `src/` + `e2e/` are app code; `.claude/`, `.planning/`, GSD hooks never import or reference app files. Tests scoped to `src/` and `e2e/` keep both worlds from colliding. |
| E2E ↔ no-router reality | Form-driven navigation only | Dashboard has no URL; e2e specs must fill the login form before asserting dashboard content. Extract a shared `loginViaUi(page)` helper if more than one spec needs it. |
| Tests ↔ PostToolUse eslint hook | Write, then `npm run lint` | After JS/JSX edits the hook auto-fixes; final gates remain `npm run build` + `npm test` (+ `npm run test:e2e` for e2e changes). |

## Build Order (dependencies between components)

The order below minimizes rework — each step leaves the build green and is independently verifiable:

1. **`App` auth state + switch first** (`src/App.jsx`): add `user` state and the conditional render. Initially `DashboardPage` can be a heading-only stub in the same step; without the switch, nothing else has anywhere to plug in.
2. **`DashboardPage.jsx`** (`src/pages/DashboardPage.jsx`): presentational stub, props `email` + `onLogout`. No dependencies beyond `App` calling it.
3. **`LoginPage` success wiring**: call `onLoginSuccess(email)` after validation passes (replacing the `console.log` stub). Depends on steps 1–2 existing; this completes the login → dashboard flow end-to-end.
4. **Inline validation refactor**: split the single `error` string into a per-field `errors` map, render messages next to inputs, clear a field's error on change. Depends on step 3 (success path already separated from failure path).
5. **Unit tests** (`App.test.jsx`, `pages/*.test.jsx`): page-switch test needs step 3; per-field validation tests need step 4. Write alongside each step if following TDD, but at minimum after steps 3–4.
6. **E2E** (`e2e/dashboard.spec.js`): full flow — fill form, submit, assert dashboard heading; logout round-trip if implemented. Must come last since it verifies the assembled whole.
7. **`docs/memory.md` journal entry** per repo rule (end of session, not part of build order per se).

Steps 1–2 are one commit-sized unit; steps 3 and 4 are separate verifiable units; 5–6 verify each.

## Sources

- Existing codebase: `/Users/anton.trusov/extGit/opus-hw/src/App.jsx`, `src/pages/LoginPage.jsx`, `src/App.test.jsx`, `e2e/login.spec.js`
- Project context: `/Users/anton.trusov/extGit/opus-hw/.planning/PROJECT.md` (Active requirements, Out of Scope: router/state-manager/TS)
- Conventions: `/Users/anton.trusov/extGit/opus-hw/AGENTS.md`, `/Users/anton.trusov/extGit/opus-hw/.claude/rules/js-ts.md`
- React docs: "Lifting State Up" / "Sharing State Between Components" (react.dev) — the canonical pattern for cross-page state without a store

---
*Architecture research for: minimal router-less React SPA (login → dashboard)*
*Researched: 2026-10-23*
