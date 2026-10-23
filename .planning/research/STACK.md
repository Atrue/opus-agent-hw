# Stack Research

**Domain:** Multi-page navigation (login → dashboard) + inline form validation on a deliberately minimal React 19 + Vite 8 SPA (JavaScript, no TS, no router, no state manager)
**Researched:** 2026-10-23
**Confidence:** HIGH — headline finding verified directly against the npm registry; every package in `package.json` is already at its latest stable version, and the milestone requires **zero new dependencies**

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| React `useState` (view state in `App.jsx`) | 19.3.1 (installed, = latest) | Page switching login → dashboard via conditional render | Two screens with no deep-linking requirement is the textbook case for state-based switching; `App` owns `view` state (`useState('login')`), pages stay siblings. No dependency, no API surface to learn, trivially testable with Testing Library. Consistent with ARCHITECTURE.md Pattern 3 (router-less page switching) | HIGH |
| React controlled inputs + per-field error state | 19.3.1 | Inline validation | LoginPage already uses controlled inputs; extend to `const [errors, setErrors] = useState({ email: '', password: '' })` with validate-on-submit + validate-on-blur, re-validate on change once a field is touched ("touched" pattern). This is the standard 2025 approach for a 2–3 field form: the logic is ~20 lines, fully unit-testable, and gives exact control over message text and locale (Russian strings). ARCHITECTURE.md Pattern 2 | HIGH |
| Native HTML semantics + ARIA | browser-native (no version) | Accessible inline errors | `aria-invalid="true"` on failed fields, per-field error text linked via `aria-describedby` (or `aria-errormessage`), `role="alert"` for the form-level message (already used in LoginPage). `type="email"` gives mobile keyboards + semantics; combined with `noValidate` it never triggers un-stylable native bubbles. MDN-recommended pattern, verified 2026-10-23 | HIGH |
| Custom JS validation (plain functions) | none (stdlib) | Validation rules | Two rules ("email non-empty", "password non-empty"). A pure `validateLogin({ email, password }) → { email, password }` helper keeps the component thin and gives a free unit-test seam | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **None** | — | — | This milestone needs zero new libraries. That is the recommendation, not an omission: the constraint set (frozen stack, `npm install` behind user approval) makes "zero-install" itself a feature. See Variants below for the specific trigger conditions that would justify each library |

### Development Tools

All already installed; all verified at latest stable via npm registry on 2026-10-23:

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Vitest | 5.0.5 (installed, = latest) | Unit tests for per-field errors, touched-pattern, view switch | Colocated `*.test.jsx` in `src/` per project convention |
| @testing-library/react | 16.3.3 (installed, = latest) | Render/interact assertions | Peer-dep compatible with React 19 (16.1+ supports React 19) |
| @testing-library/user-event | 14.6.8 (installed, = latest) | Type-then-blur, submit flows | Prefer over `fireEvent` for realistic events |
| @testing-library/jest-dom | 7.0.1 (installed, = latest) | `toHaveErrorMessage`-style matchers | Works with `aria-invalid`/`aria-describedby` assertions |
| @playwright/test | 1.64.1 (installed, = latest) | E2E: login → dashboard navigation flow | New spec extends `e2e/`; dev-server auto-start already configured |

## Installation

```bash
# Ничего не устанавливать. Ноль новых зависимостей.
# (npm install в проекте требует подтверждения пользователя — этот этап полностью пропускается)
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `useState` conditional render in `App.jsx` | react-router 8.5.0 (library mode) | Real URLs needed (shareable links, back/forward, 404s), or 3+ routes, nested layouts, loaders. Not this milestone — and PROJECT.md explicitly lists a router as Out of Scope |
| `useState` conditional render | hash routing via own ~15-line `hashchange` hook | If the dashboard URL should be bookmarkable *while staying dependency-free* — a `useHashRoute()` hook is the standard minimal middle ground before a router |
| Controlled inputs + custom rules | react-hook-form 7.90.0 | Forms with ~5+ fields, cross-field rules, or perf-sensitive re-render concerns; uncontrolled model reduces re-renders and works fine in plain JS |
| Controlled inputs + custom rules | React 19 `useActionState` + `<form action={formAction}>` | Async submit with pending state (`isPending`) — e.g. when a real (stubbed-async) auth call appears. Verified in React 19 docs; still zero-dependency, so this is the *first* escalation step, not a library. For a synchronous stub login it adds plumbing without benefit |
| Custom rule functions | Zod 4.6.7 | When a backend schema exists and validation is shared client/server. Two empty-string checks don't justify a schema library |
| `useState` at App level | Context API (also built-in) | Only if prop drilling of auth state grows past 2 levels; still no library |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-router 8.5.0 / TanStack Router | Out of Scope in PROJECT.md; 2 screens with no URL requirements; adds install approval friction + bundle weight to a stack that is deliberately frozen | `useState` view switching in `App.jsx` |
| Redux Toolkit / Zustand / Jotai | The entire "global" state is one boolean (logged in) held by `App`. A state library is pure overhead here and violates the frozen-stack constraint | `useState` in `App`, passed down as props/callbacks |
| react-hook-form / TanStack Form (now) | 2 fields, 2 rules; controlled state is already written and idiomatic; TanStack Form is TS-first (poor fit for a JS project) | Controlled inputs + `errors` state object |
| Removing `noValidate` to rely on native constraint validation | jsdom does not implement native constraint-validation UI, so unit tests can't assert the bubbles; messages aren't stylable or consistently localized; per-field inline UX can't be controlled | Keep `noValidate` + custom per-field messages; keep semantic attrs (`type="email"`, `autoComplete`) for input aids |
| `alert()` / `console.log` for errors | The explicit thing this milestone replaces (PROJECT.md Active requirement); blocks the thread, invisible to Testing Library | Inline `<p role="alert">` + `aria-invalid` per field |
| Per-field error state lifted to App / global validation store | Couples pages, defeats "local validation-error state" pattern (ARCHITECTURE.md anti-pattern 2) | Errors live inside `LoginPage` |

## Stack Patterns by Variant

**If the dashboard URL must be bookmarkable/back-button works (currently NOT a requirement):**
- Use a `useHashRoute()` hook: `hashchange` listener in `useEffect` + `location.hash` read, map `#/login` / `#/dashboard` to views
- Because it stays dependency-free and keeps `App.jsx` dumb; it's the standard last stop before a real router

**If the login submit becomes async (pending spinner, simulated network delay):**
- Use React 19 `useActionState` + `<form action={formAction}>` with `isPending`
- Because it's built into the installed React 19.3.1 — still zero dependencies, and it's the idiomatic 19-era replacement for manual `isSubmitting` state

**If the form grows past ~5 fields or gains cross-field rules:**
- Add react-hook-form 7.90.0 (with user approval for `npm install`)
- Because uncontrolled fields stop re-rendering the whole form and rules become declarative; RHF is the JS-friendly option (TanStack Form targets TS)

**If a real backend with shared validation appears:**
- Add Zod 4.6.7 for the schema, still drive the UI from per-field error state
- Because one schema then serves both client and (future) server stubs

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| react@19.3.1 / react-dom@19.3.1 | @testing-library/react@16.3.3 | TL 16.1+ declares React 19 peer support; installed combo verified working (existing green tests) |
| vite@8.3.5 | vitest@5.0.5 | Vitest 5 pairs with Vite 8; already green in this repo |
| vite@8.3.5 | @vitejs/plugin-react@6.1.2 | Installed combo is current and green |
| react@19.3.1 | `useActionState` / `useOptimistic` | Available since React 19.0; usable today if the async variant is chosen |
| @playwright/test@1.64.1 | Vite dev server | Already wired via `test:e2e` config; no change needed |

No upgrades required: `npm view` on 2026-10-23 confirmed every package in `package.json` (react, react-dom, vite, vitest, jsdom 30.1.3, all Testing Library packages, @playwright/test, @vitejs/plugin-react, eslint-config-airbnb 19.0.4, airbnb plugins) matches the latest stable npm version.

## Sources

- npm registry via `npm view <pkg> version` (run 2026-10-23) — versions of react, react-dom, vite, vitest, jsdom, all @testing-library/*, @playwright/test, @vitejs/plugin-react, eslint-config-airbnb, react-router, react-hook-form, @tanstack/react-form, zod — authoritative for versions, HIGH
- react.dev — `useActionState` reference (fetched 2026-10-23): React 19 hook, form-actions pattern, `isPending`, when *not* to use it — HIGH
- MDN — `aria-invalid` reference (fetched 2026-10-23): set only after a validation attempt, pair with `[aria-invalid="true"]` styling and error messaging via `aria-errormessage`/describedby + `role="alert"` — HIGH
- reactrouter.com + npm — react-router current major (8.5.0) exists but is irrelevant to a 2-screen no-URL app — MEDIUM relevance (context only)
- Sibling research: `.planning/research/ARCHITECTURE.md` (Patterns 1–3, anti-patterns) and `FEATURES.md` — consistency check, HIGH

---
*Stack research for: minimal React 19 + Vite 8 SPA — router-less navigation + inline validation*
*Researched: 2026-10-23*
