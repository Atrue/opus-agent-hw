# Phase 2: App Auth State + DashboardPage - Pattern Map

**Mapped:** 2026-10-26
**Files analyzed:** 5 (1 new, 4 modified)
**Analogs found:** 5 / 5 (codebase is tiny — every analog is exact or near-exact)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/pages/DashboardPage.jsx` (NEW) | component (presentational page) | event-driven (callback up: `onLogout`) | `src/pages/LoginPage.jsx` | role-match (page shell + local handler pattern; DashboardPage has no state) |
| `src/App.jsx` (modified) | component (shell / page switcher) | event-driven (lift state up) | `src/App.jsx` itself + `src/pages/LoginPage.jsx` `useState` pattern | exact (same file, additive change) |
| `src/pages/LoginPage.jsx` (modified) | component (form page) | event-driven | `src/pages/LoginPage.jsx` itself | exact (same file; only success branch of `handleSubmit` changes) |
| `src/App.test.jsx` (modified) | test (unit, colocated) | request-response (render → assert) | `src/App.test.jsx` itself | exact |
| `e2e/login.spec.js` (modified, optional strengthening) | test (e2e) | request-response (browser flow) | `e2e/login.spec.js` itself | exact |

All analog paths verified git-tracked via `git ls-files`.

## Pattern Assignments

### `src/pages/DashboardPage.jsx` (NEW — component, presentational)

**Analog:** `src/pages/LoginPage.jsx`

Copy the structural conventions from LoginPage: default-exported arrow-less `function` component (project style), one `<main className="<page>-page">` wrapper, single `h1`, default export at the bottom. Do NOT copy the form/state — DashboardPage is pure props (`email`, `onLogout`), zero `useState`, zero imports.

**Page shell pattern** (`src/pages/LoginPage.jsx` lines 20-23, 47-51 — wrapper + h1 + export):
```jsx
  return (
    <main className="login-page">
      <h1>Вход</h1>
      {/* ... */}
    </main>
  );
}

export default LoginPage;
```

Target skeleton (research Pattern 2; strings locked by D-01/D-02/D-03 — «Дашборд», «Вы вошли как {email}», «Выйти» are a cross-phase contract with Phase 4 e2e):
```jsx
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

**Destructured props** per `.claude/rules/js-ts.md` ("Деструктуризация для props") — see `LoginPage`'s destructuring style in its `handleSubmit` param usage; here props destructure directly in the signature.

---

### `src/App.jsx` (modified — shell / page switcher)

**Analog:** itself + `useState` import pattern from `src/pages/LoginPage.jsx` line 1

**Current state** (`src/App.jsx` lines 1-7):
```jsx
import LoginPage from './pages/LoginPage';

function App() {
  return <LoginPage />;
}

export default App;
```

**State hook import pattern** (`src/pages/LoginPage.jsx` line 1):
```jsx
import { useState } from 'react';
```

Target (research Pattern 1, locked D-06/D-07 — **mandatory wrapper** `(email) => setUser({ email })`, never `onLoginSuccess={setUser}`, see Pitfall 1 in 02-RESEARCH.md):
```jsx
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

---

### `src/pages/LoginPage.jsx` (modified — success branch only)

**Analog:** itself

**Change target** — `handleSubmit` lines 8-18. Keep failure branch (lines 10-13) **verbatim**; error text «Заполните email и пароль» is a test contract (`src/App.test.jsx:28`, `e2e/login.spec.js:10`).

**Current success branch** (lines 14-17 — to be replaced):
```jsx
    // Заглушка: реальная авторизация будет добавлена позже.
    // Поведение формы покрыто тестами: src/App.test.jsx (юниты) и e2e/login.spec.js (browser).
    setError('');
    console.log('login', { email });
```

**Target** (research Pattern 4; D-07 — only `email` crosses the boundary; `console.log` is removed, comment rewritten to describe the new contract):
```jsx
    setError('');
    onLoginSuccess(email);
```

Unchanged patterns to preserve: controlled inputs with `onChange` (lines 26-32, 35-42), `noValidate` on the form (line 23), `{error && <p role="alert">{error}</p>}` conditional error render (line 44), `autoComplete` attrs.

---

### `src/App.test.jsx` (modified — unit tests)

**Analog:** itself

**Test file structure pattern** (lines 1-5 — imports; lines 7-12 — describe/test blocks with Russian test names):
```jsx
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

**Change target** — only the valid-submit test (lines 31-40). It currently renders `<LoginPage />` bare; after the change a valid submit would call the absent prop and throw. Add `vi` to the vitest import (line 1) and pass a mock:

```jsx
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

The other three tests need no changes: App test renders `App` (starts at `user = null` → «Вход» heading still shows); the two error-path tests never reach the success branch. **Do not add** the App-level transition unit test (TEST-01, Phase 4).

---

### `e2e/login.spec.js` (modified — optional strengthening, discretion)

**Analog:** itself

**e2e structure pattern** (lines 1, 13-21): import from `@playwright/test`, `page.goto('/')`, role/label-based locators with Russian accessible names, `await expect(...)` assertions.

**Change target** — valid-submit test (lines 13-21) only. Currently passes vacuously after this phase (`toBeHidden()` on an absent node is green). Recommended strengthening (assert the actual new behavior; logout round-trip stays in Phase 4 TEST-02):

```js
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Дашборд' })).toBeVisible();
  await expect(page.getByText('Вы вошли как user@example.com')).toBeVisible();
```

Empty-submit test (lines 3-11) is untouched.

## Shared Patterns

### Component conventions
**Source:** `src/pages/LoginPage.jsx` + `.claude/rules/js-ts.md`
**Apply to:** `DashboardPage.jsx`, `App.jsx`
- ES modules, functional components, one component = one file, PascalCase filename = component name
- `const` by default, `===` only, destructured props
- Page wrapper: `<main className="<page>-page">` with a single `h1`
- Default export at bottom of file

### Testing conventions
**Source:** `src/App.test.jsx`, `e2e/login.spec.js`
**Apply to:** all test edits
- Unit tests colocated in `src/` (`*.test.jsx`), Vitest + Testing Library, Russian test names
- e2e in `e2e/`, Playwright role/label locators with Russian accessible names
- Mock callbacks with `vi.fn()` + `toHaveBeenCalled*`, never hand-rolled flags

### Verification gates (AGENTS.md)
**Apply to:** every JS/JSX edit — `npm run build` + `npm test`; after e2e edits also `npm run test:e2e`; final gate `npm run lint` (the PostToolUse `eslint --fix` hook is not the final check).

## No Analog Found

None. Every file in this phase is either an edit to an existing file or a direct structural clone of `src/pages/LoginPage.jsx` conventions. No RESEARCH.md fallback patterns are needed beyond the skeletons already embedded in Pattern Assignments above (which mirror 02-RESEARCH.md Patterns 1-4 verbatim).

## Metadata

**Analog search scope:** `src/`, `e2e/` (entire codebase — 6 files)
**Files scanned:** 6 (all git-tracked, verified via `git ls-files`)
**Pattern extraction date:** 2026-10-26
**Key conflict resolved:** `ARCHITECTURE.md` Pattern 1 example passes `onLoginSuccess={setUser}` — this conflicts with locked D-06/D-07; PATTERNS.md mandates the wrapper `(email) => setUser({ email })` (02-RESEARCH.md Pitfall 1).
