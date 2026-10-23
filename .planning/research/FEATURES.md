# Feature Research

**Domain:** Minimal auth-flow demo/testbed SPA (React + Vite, no router/state-manager) — стенд для отладки агентной инфраструктуры
**Researched:** 2026-10-23
**Confidence:** HIGH (grounded in actual repo code: `src/pages/LoginPage.jsx`, `src/App.jsx`, `src/App.test.jsx`, `e2e/login.spec.js`, and `.planning/PROJECT.md`)

**Important framing:** "Users" here are (a) the AI agent that must implement/verify features and (b) the single developer observing the agent. Table stakes = "the demo breaks or becomes unverifiable without it". This is NOT a product competing on features — differentiators in the classic sense are mostly anti-goals.

**Key observation from code:** `LoginPage.jsx` already renders an inline summary error (`<p role="alert">`) — there is no `alert()` call in the current code. The milestone item "инлайн, а не alert" therefore de-facto means: **per-field inline errors** (error text next to each input, cleared on correction) — a UX upgrade from the single summary line, not a from-scratch change. Requirements definition should encode it as per-field validation.

## Feature Landscape

### Table Stakes (The Demo Breaks Without Them)

Features the flow-demo assumes exist. Missing these = the login→dashboard flow is not demonstrable or not verifiable by tests.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Login form: email + password controlled inputs, labels, submit button | Core of the demo; already exists | LOW (done) | `src/pages/LoginPage.jsx`; controlled `useState` per field, `htmlFor`/`id` labels — keep as-is |
| Empty-field validation, visible to user | The verifiable "task #1" for the agent; already exists | LOW (done) | Currently one summary error `role="alert"`; covered by 2 unit tests + 2 e2e |
| Per-field inline validation errors | Milestone target; summary error is not "inline" in the UX sense — user must guess which field | LOW | Empty email → message under email input; empty password → message under password input; both empty → both shown. Reuse existing error pattern, one error state per field (`emailError`, `passwordError` or errors object) |
| Error clearing on user input | Table stakes for inline validation UX; without it, stale errors linger after the user fixes the field — tests would be flaky/counter-intuitive | LOW | Clear field error in its `onChange`; clear both on successful submit. Add e2e/unit case for "error appears → user types → error disappears" |
| Accessible error semantics (`role="alert"`/`aria-live`, `aria-invalid`, `aria-describedby` per field) | Errors must be queryable by Testing Library/Playwright (`getByRole('alert')` is already load-bearing in all 4 tests) | LOW | Keep `role="alert"`; add `aria-invalid={!!emailError}` and `aria-describedby` linking input ↔ error `<p id>` |
| Client-side "logged in" state to switch Login → Dashboard | Without a state flag there is no transition to demonstrate; router is banned, so a `useState` in `App.jsx` (or lifted callback) is the mechanism | LOW | `const [isLoggedIn, setIsLoggedIn] = useState(false)` in `App.jsx`; `LoginPage` gets `onSuccess` prop. No router, no context needed |
| Dashboard stub page (heading + minimal content) | The milestone's deliverable; must be a distinct component/file per conventions | LOW | `src/pages/DashboardPage.jsx`, PascalCase, one component per file. Minimal: heading ("Дашборд") + a couple of static elements |
| Logout control on dashboard returning to login | A one-way transition is a dead end — the flow cannot be re-tested in the same e2e run without reload; logout closes the loop and makes state observable | LOW | Button on dashboard → `setIsLoggedIn(false)` → login reappears. Pairs naturally with new e2e "login → dashboard → logout → login" |
| Display of logged-in user (email) on dashboard | Verifies state (email) actually passed Login → Dashboard, not just a boolean flip; standard in every auth demo | LOW | Pass email to `onSuccess(email)` / props; dashboard shows `Вы вошли как {email}` |
| Deterministic fake login (any non-empty credentials succeed) | Testbed determinism: e2e must not depend on credentials/data; already implicit in the stub | LOW (done) | Keep the existing comment-stub; do NOT add credential checks |
| Unit + e2e coverage for every new behavior | Per project conventions and the milestone's own Active requirement; features exist to be verified | LOW–MEDIUM | Colocated `*.test.jsx` in `src/` (Vitest + Testing Library), specs in `e2e/` (Playwright); `npm run build` + `npm test` after changes (AGENTS.md rule) |

### Differentiators (Competitive Advantage — Mostly NOT Wanted Here)

In a normal product these would be the value-adds. For THIS testbed, the only legitimate "differentiation" is **agent-observability**: how easily an agent can implement, query, and verify each feature. Classic product differentiators are listed with a verdict.

| Feature | Value Proposition | Complexity | Notes / Verdict |
|---------|-------------------|------------|-----------------|
| Stable semantic selectors & roles everywhere (headings, labels, button names) | THE differentiator for this project: every feature becomes agent-verifiable via `getByRole`/`getByLabel` without brittle CSS selectors | LOW (mostly done) | Keep enforcing; it's why current tests are clean. New components must follow |
| Round-trip e2e (login → dashboard → logout → login) | One spec exercises the whole state machine — maximal verification per test | LOW | Best new e2e to add; validates state, dashboard, and logout together |
| Fake async login with loading state (300ms delay, spinner/disabled button) | Gives the agent a genuinely harder task (async state, `useEffect`/timeout cleanup, `waitFor` in tests) | MEDIUM | Only if a future milestone specifically needs async practice; otherwise skip — it adds e2e timing complexity for no verification value |
| Additional stub pages behind login (e.g., Settings) | More verifiable tasks later; same pattern repeated | LOW | Defer — each page should be its own milestone task, not bundled |
| Configurable "fake failure" (specific password fails) | Tests error-path rendering of login failure vs validation failure | LOW | Defer; empty-field validation is the agreed scope, failure-path is a separate milestone candidate |
| Animations/theming/design polish | Zero verification value, adds noise to screenshots and flakiness | MEDIUM | **Skip** — anti-feature territory (see below) |
| Real credential rules (email format regex, password strength) | Looks "professional" | LOW–MEDIUM | **Skip** — scope is empty-field validation only (PROJECT.md); format rules multiply test cases without new agent-infrastructure signal |

### Anti-Features (Commonly Requested — Deliberately NOT Building)

These are the classic auth-demo scope-creep traps. Each would make the codebase bigger without making the testbed better, and several violate explicit constraints in PROJECT.md (Out of Scope / Constraints).

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real backend authentication (API, JWT, sessions) | "It's an auth demo" | Explicitly out of scope; server breaks e2e determinism, needs a running backend, and the value of the testbed is agent workflows, not auth correctness | Keep the documented stub; deterministic `onSuccess` callback |
| OAuth / social login | Ubiquitous in real apps | Requires external providers, secrets, network — worst case for a hermetic testbed; also drags in `.env` (a protected file agents can't read) | N/A — never |
| Persistence (localStorage/sessionStorage of session) | "Refresh keeps you logged in" | Destroys test repeatability: e2e runs would leak state between tests; adds cleanup boilerplate | Keep auth state in React state only — reload = reset, which is a feature for the testbed |
| Router (react-router / TanStack Router) | "Multi-page needs URLs" | Stack is fixed: no router (PROJECT.md, AGENTS.md); adds dep (`npm install` requires user confirmation) and complexity the flag-toggle doesn't need | Conditional rendering in `App.jsx` on `isLoggedIn` |
| State manager (Redux/Zustand/Context library) | "Auth state is global" | One boolean + one string; a manager is dead weight and violates the fixed stack | Lift state to `App.jsx`, pass via props |
| Form library (react-hook-form, zod,formik) | "Validation is a solved problem" | Native `useState` validation IS the agent's exercise; a library hides the thing being practiced and adds deps | Hand-rolled validation in the component |
| TypeScript | "Type safety" | Explicitly out of scope; stack frozen at JS | `npm run build` is the project's type/syntax check |
| i18n / multiple languages | Demo text in Russian already | More strings, zero verification value; project audience is one person | Keep single-language Russian UI |
| Email-format / password-strength rules | "Real forms validate format" | Multiplies cases; milestone says empty-field validation; scope creep the agent will happily over-build | Per-field empty checks only |
| Forgot-password / remember-me / sign-up flows | "Complete auth UX" | Each is a whole new page/flow — 3x the milestone for no new infra signal | Out of scope; revisit only as separate future milestones |
| Mobile responsiveness | "Everyone tests mobile" | Explicitly out of scope (desktop testbed); responsive CSS complicates e2e viewports | Fixed desktop layout |
| Styling frameworks (Tailwind, MUI, component kit) | "Make it look real" | Dependency + build complexity; visual polish has no verification value here; PostToolUse `eslint --fix` hook and build must stay fast | Plain CSS / existing classes |
| Error analytics / logging service | "Production-readiness" | External calls in a hermetic testbed; `console.log` already serves as the stub trace | Keep `console.log` stub |

## Feature Dependencies

```
[Per-field inline errors]
    └──requires──> [Login form w/ per-field state]  (exists)
    └──enhances──> [Error clearing on input] (clearing only makes sense per-field)

[Error clearing on input]
    └──requires──> [Per-field inline errors]

[Client-side isLoggedIn state in App]
    └──requires──> [Successful-submit path in LoginPage] (exists — handleSubmit success branch)

[Dashboard stub]
    └──requires──> [isLoggedIn state]  (conditional render)
    └──requires──> [onSuccess callback prop on LoginPage]

[Show logged-in email on dashboard]
    └──requires──> [Dashboard stub]
    └──requires──> [onSuccess(email) passes email upward]

[Logout button]
    └──requires──> [Dashboard stub]
    └──requires──> [isLoggedIn state] (setter reachable from dashboard)

[Round-trip e2e spec]
    └──requires──> [Login per-field errors] + [Dashboard] + [Logout]  (all of the above)

[Fake async login + loading state]
    └──conflicts──> [Deterministic e2e]  (timing flakiness; needs waitFor/controlled delay)
```

### Dependency Notes

- **Dashboard requires isLoggedIn state first:** the state flag and the `onSuccess` prop are the enabling refactor; dashboard rendering is trivial after it. Implementation order: (1) lift state + callback in `App.jsx`, (2) dashboard page, (3) logout, (4) per-field errors, (5) tests — though per-field errors are independent and can go first.
- **Per-field errors and dashboard are independent:** they touch different parts (form internals vs App-level state) and can be implemented/verified in either order or in parallel.
- **Error clearing requires per-field errors:** clearing a single summary error on any keystroke is worse UX than the current behavior; clearing is only coherent once each field owns its error.
- **Logout enhances testability of everything:** the round-trip e2e only becomes possible once logout exists.
- **Async loading conflicts with e2e determinism:** if ever added, it needs a controlled/fake delay and `expect(...).toBeVisible()` waits — a deliberate friction increase; that's exactly why it's deferred, not banned.

## MVP Definition

### Launch With (v1 — this milestone)

Minimum to validate the milestone: complete login → dashboard → logout loop with per-field validation, fully test-covered.

- [ ] Per-field inline errors for email/password (both-empty shows both) — the milestone's explicit validation requirement, interpreted correctly (current code already has an inline summary error)
- [ ] Errors clear when the user edits the field — without it the inline UX is broken and the new tests misleading
- [ ] `isLoggedIn` state + `onSuccess` prop in `App.jsx`/`LoginPage` — the enabling mechanism, router-free per constraints
- [ ] `DashboardPage.jsx` stub with heading and logged-in email — milestone deliverable; email display proves state transfer
- [ ] Logout button returning to login — closes the loop; enables the round-trip test
- [ ] Unit tests (Vitest + Testing Library) for all new behavior — project convention + Active requirement
- [ ] E2E (Playwright) including a round-trip spec — project convention + Active requirement
- [ ] `npm run build` + `npm test` + `npm run test:e2e` green — AGENTS.md gate

### Add After Validation (v1.x)

- [ ] Additional stub page (e.g., Settings) — when the next milestone needs a repeated-task exercise
- [ ] `aria-invalid` / `aria-describedby` wiring — if v1 ships with only `role="alert"` per field (still queryable); add when accessibility itself becomes an agent task
- [ ] Fake async login with loading state — when a milestone explicitly targets async state/timers

### Future Consideration (v2+)

- [ ] Fake failure path (wrong credentials → error) — separate milestone candidate; do not bundle
- [ ] Anything from the anti-features table — only if the project's purpose fundamentally changes (i.e., it stops being a testbed)

## Feature Prioritization Matrix

| Feature | User Value* | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Per-field inline errors | HIGH | LOW | P1 |
| Error clearing on input | HIGH | LOW | P1 |
| isLoggedIn state + onSuccess | HIGH | LOW | P1 |
| Dashboard stub + email display | HIGH | LOW | P1 |
| Logout button | HIGH | LOW | P1 |
| Unit + e2e coverage (incl. round-trip) | HIGH | LOW–MEDIUM | P1 |
| aria-invalid / aria-describedby | MEDIUM | LOW | P2 |
| Fake async login + loading | MEDIUM | MEDIUM | P3 |
| Additional stub pages | MEDIUM | LOW | P3 |
| Fake failure path | LOW | LOW | P3 |

*"User value" = value to the agent-verifiability mission of the testbed, not end-users.

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, add when convenient
- P3: Nice to have / future milestone material

## Competitor Feature Analysis

"Competitors" = what typical minimal React auth demos and starter templates ship. Useful as calibration for what's normal — and what this project should deliberately NOT copy.

| Feature | Typical React auth demo / starter | Enterprise auth sample (NextAuth/Clerk demos) | Our Approach |
|---------|-----------------------------------|----------------------------------------------|--------------|
| Validation UX | Per-field inline errors, format checks, sometimes react-hook-form + zod | Server-side errors mapped to fields, async validation | Per-field empty checks only, hand-rolled `useState` — the constraint IS the design |
| Auth backend | Mock service (MSW) or real API | Full OAuth/JWT/session infra | None; `onSuccess` callback stub with explanatory comment |
| Navigation | Router with protected routes, redirect back | Middleware + route guards | Boolean conditional render in `App.jsx`; no router by constraint |
| Session persistence | localStorage/cookies | httpOnly cookies, refresh tokens | None — reload resets to login (testbed feature) |
| Dashboard | Rich dashboard template (charts, layout) | Full app shell | Heading + email line; a stub by definition |
| Tests | Often none, or one smoke test | E2E on critical path only | Every behavior covered: colocated Vitest units + Playwright e2e — the strictest item in this comparison, and the point |
| Design | Styled, often a UI kit | Polished marketing-grade UI | Plain semantic HTML + existing CSS; zero new deps |

## Sources

- Repository code (authoritative): `/Users/anton.trusov/extGit/opus-hw/src/pages/LoginPage.jsx`, `/Users/anton.trusov/extGit/opus-hw/src/App.jsx`, `/Users/anton.trusov/extGit/opus-hw/src/App.test.jsx`, `/Users/anton.trusov/extGit/opus-hw/e2e/login.spec.js`
- Project context: `/Users/anton.trusov/extGit/opus-hw/.planning/PROJECT.md` (Requirements Active/Out of Scope, Constraints)
- Project conventions: `/Users/anton.trusov/extGit/opus-hw/AGENTS.md`, `/Users/anton.trusov/extGit/opus-hw/.claude/rules/js-ts.md` (React rules: functional components, hooks, colocated tests)
- Domain calibration: common patterns in minimal React auth demos (Vite starter, TodoMVC-style flows) and auth-provider sample apps (NextAuth/Clerk demos) — analyzed from general knowledge of these templates, not fetched

---
*Feature research for: minimal auth-flow testbed (React + Vite)*
*Researched: 2026-10-23*
