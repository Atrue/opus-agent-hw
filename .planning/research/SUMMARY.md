# Project Research Summary

**Project:** Backprop Trainer — интерактивный тренажёр обучения нейросетей
**Domain:** Educational ML visualization — client-only stepwise autodiff trainer (zero-install static web app)
**Researched:** 2026-11-02
**Confidence:** HIGH overall (architecture, stack core, engineering pitfalls); MEDIUM pockets noted inline and in Gaps

## Executive Summary

This is a **zero-install, client-only educational web app** in which a student stepwise executes forward and backward passes of fixed MLP scenarios (XOR → spiral → MNIST), drillable down to every single number. The competitive landscape splits into interactive explainers (TF Playground, MLU-Explain — instant but epoch/result-granularity, backward pass never interactive) and by-hand execution traditions (Mazur's static post, micrograd/Karpathy — per-number insight behind an environment barrier). **The unoccupied niche is productizing Family B at Family A's friction level.** Every competitor maxes 1–2 cells of our value curve; the product wins only while the *combination* — stepwise backward + per-op numbers + graph drill-down + zero threshold — stays coherent. Adopting any anti-feature (network constructor, accounts, LLM chat, bigger models) trades that combination for a single-cell fight against an incumbent who owns the cell.

The recommended approach rests on one master architectural decision backed by all four researchers independently: **deterministic replay**. A seeded autodiff engine executes the entire scenario once at load, records an immutable RunTrace, and the UI is a pure player over `(trace, stepIndex)`. This makes step-back O(1), makes DOCS-05 lecture determinism *checkable* (trace hash in CI) rather than hoped for, and renders NFR-01 (<100 ms/step) trivially true. The engine is **own TypeScript Float64 code** (micrograd semantics, op-level granularity with lazy scalar drill-down) — no library gives per-number provenance, which is the product. Correctness (NFR-02) is **structural from day one**: PyTorch-float64 golden fixtures committed to the repo, gradcheck finite-difference tests before any UI exists, and every future scenario automatically enters the same CI pipeline. Per D-18, H2/H3 validation (teacher interviews + usability on a clickable prototype) precedes all product code.

Key risks and mitigations: (1) **Numeric trust** — f32 reference trap and cross-browser `Math.tanh` divergence are real and addressed mechanically: float64 end-to-end, own transcendental implementations, explicit prebaked weights, `atol+rtol` metric, cross-browser trace-hash CI. (2) **"Wall of numbers"** — the domain's #1 UX failure; mitigated by progressive disclosure (3–7 key numbers per step) and caught cheaply in the Phase-1 usability test, before code. (3) **Narrative-as-fill-in-later** — the content/methodology moat procrastinated behind the engine; mitigated by making narrative a per-scenario deliverable with usability acceptance criteria, starting with the Phase-1 skeleton. (4) **Scope creep toward a constructor** — structurally conflicts with determinism, lecture mode, and the NFR-02 test matrix; held at R2 by discipline (D-02) and the documented anti-features list.

## Key Findings

### Recommended Stack

**One-liner:** TypeScript strict + React 19 + Vite 8 + Zustand 5; own Float64 autodiff engine (~300–800 LOC, micrograd semantics) with a precomputed walkthrough tape; SVG-first visualization (Canvas only for heatmaps); Vitest 5 + Python golden fixtures; Cloudflare Pages; anonymous PostHog EU behind a facade. Details: [STACK.md](STACK.md).

**Core technologies:**
- **TypeScript (strict)** — numbers are the product; types catch gradient typos at compile time (NFR-02)
- **Own TS autodiff engine, no WASM/TF.js** — per-number provenance (`data, grad, opLabel, parents, formulaTemplate, localGrad`) is the product; TF.js/Pyodide/ONNX each break a named NFR or DOCS and are explicitly rejected
- **Precomputed tape/RunTrace** — step = array index; NFR-01 satisfied with ~10× margin, no WASM needed
- **Vitest 5 + golden fixtures (PyTorch float64, committed) + gradcheck** — the NFR-02 mechanism, not aspiration
- **SVG hand-rolled diagram + Canvas heatmaps** — crisp selectable text, a11y, print; deterministic layout cached per fixed topology
- **Cloudflare Pages + PostHog free EU (anonymous, lazy, behind `analytics.ts` facade)** — NFR-03 $0 architecture with swappable vendor

### Expected Features

Details: [FEATURES.md](FEATURES.md).

**Must have (table stakes):** step controls including **step-back** (nearly free via the replay engine — decide before UI), phase indicator (forward/backward/update matters more than N-of-M), keyboard navigation (presenter remotes send arrow keys — lecture mode is broken without it), URL shareable/reload-surviving state, deterministic scenarios, number hygiene (tabular monospace, explicit minus, colorblind-safe palettes), offline after load, mobile-readable first screen. **Spec gaps to fold into DOCS-01/05 and NFRs:** step-back (TS-3), keyboard (TS-8), mobile tiering (TS-13), accessibility (TS-16).

**Should have (differentiators):** per-op numbers panel for both passes + backward as first-class executable mode (DF-1/2 — the core claim); drill-down with formula + gradient provenance (DF-3/4); scenario narrative progression (DF-5 — the content moat where the one-author budget should concentrate after the engine); lecture mode (DF-6); pre/post test (DF-7); op/layer/pass granularity baked into the scenario schema from day one (DF-8); PyTorch snippet bridge (DF-9 — nearly free off the NFR-02 fixture harness, v1.x).

**Defer:** network constructor + CSV upload (R2 by D-02 — structurally invalidates determinism, lecture repeatability, and the test matrix); accounts, gamification, embedded LLM chat, server compute (never in v1 — anti-features AF-1..13 documented with rationale).

### Architecture Approach

**One-liner:** Trace-on-load deterministic replay — engine computes the full run once into an immutable, provenance-carrying RunTrace; UI/session/persistence are pure consumers; scenario content is explicit data (prebaked weights, mirrored seeded PRNG), never baked numbers and never code. Details: [ARCHITECTURE.md](ARCHITECTURE.md).

**Major components:**
1. **Autodiff engine** (`src/engine/`, pure TS, zero DOM) — op-level reverse-mode autodiff, float64, own `tanh`/`exp` for cross-engine determinism
2. **Trace builder + RunTrace** — `(Scenario) → immutable step list` with `traceHash`; snapshot+delta frames as the MNIST memory escape hatch
3. **Scenario JSON schema** — architecture, explicit init weights, dataset order, narrative (ru/en), quiz; versioned and validated; op→phase grouping from day one
4. **Player reducer** — pure state machine (stepIndex, phase, drill, quiz); all DOCS acceptance paths are reducer tests first
5. **UI (render-only)** — SVG diagram, step panel, drill-down, KaTeX formulas (self-hosted fonts), scenario hub, quiz
6. **Platform adapters** — the only side effects: URL/hash router, versioned localStorage wrapper (honest reset), analytics facade, optional worker
7. **Fixture pipeline** (`tools/`) — PyTorch float64 reference generator; committed fixtures; CI asserts byte-stable regeneration

### Critical Pitfalls

Top 5 of 15 (details: [PITFALLS.md](PITFALLS.md)):

1. **f32/f64 reference divergence kills NFR-02** — PyTorch defaults to float32; a naive reference makes the 1e-6 guardrail flaky at exactly the noise level. Avoid: reference strictly in `torch.float64`, `atol+rtol` metric, committed fixtures, byte-stable CI check — first week of engine work.
2. **Determinism loss across browsers/sessions kills DOCS-05** — `Math.random()` weights and implementation-defined `Math.tanh/exp` diverge over 20 training steps. Avoid: prebaked weights as data, own transcendental kernels, seeded mirrored PRNG, cross-browser trace-hash CI, URL (not localStorage) as state source of truth.
3. **"Wall of numbers" kills comprehension** — showing every number literally is the domain's main UX failure. Avoid: 3–7 key numbers per step + drill-down, change-highlighting, "find the number < 10 sec" as a usability criterion — caught cheaply on the Phase-1 clickable prototype, before code.
4. **Narrative-as-fill-in-later kills the moat** — an engine without methodology is 100 identical matmul steps; students exit at step 20 and the North Star is unreachable. Avoid: narrative is a per-scenario deliverable with usability acceptance, skeleton written in Phase 1, mini-tests with 1–2 students per scenario change.
5. **SVG collapse / re-render storm on MNIST kills NFR-01** — a ~10⁵-node op graph in DOM freezes the tab. Avoid: render contract fixed in Phase 2 — DOM/SVG only for the visible level, Canvas heatmaps for matrices, layout computed once per fixed topology, memoization by step index.

Honorable mentions: NaN/Inf cascade visible to students (stable sigmoid/softmax/CE + fuzz tests + "gradient exploded" explanatory UI), decomposed-vs-fused CE mismatch against the reference (decide and lock in Phase 2), MNIST assets breaking "<1 min to first step" (scenario = 1–3 fixed samples + weight checkpoints = KBs, not MBs; asset budget in CI), localStorage schema migrations (versioned wrapper + fixtures of old schemas in CI).

## Implications for Roadmap

Coarse 4-phase structure. MVP boundary per D-18: Phase 2 completes DOCS-01 + DOCS-02 on XOR.

### Phase 1: Validation & Clickable Prototype (P0 — no product code)
**Rationale:** D-18 mandates H2/H3 validation before code; interviews and prototype usability are the cheapest checks of the riskiest assumptions. The wall-of-numbers and narrative pitfalls are catchable here at mock fidelity for a fraction of the cost.
**Delivers:** 5 problem interviews with teachers (H2 go/no-go); clickable XOR walkthrough prototype with narrative skeleton (mock numbers); usability test with 5–8 respondents (H3) including the "find the number < 10 sec" check; notation style guide (micrograd/CS231n convention, code-style decimal point, typographic minus); design tokens (colorblind-safe palette, tabular numerals) so later phases don't repaint; calibrated UX thresholds; mobile-support decision.
**Addresses:** de-risks the design of DOCS-01/02/05 before build.
**Avoids:** Pitfalls 5, 12, 13; pre-commits tokens against Pitfall 6 rework.

### Phase 2: Engine + MVP Walkthrough on XOR (DOCS-01 + DOCS-02)
**Rationale:** Engine-first — the riskiest work (correctness) is finished and green *before UI exists*; UI then becomes presentation over verified numbers. The pure-replay decision must land here because step-back, determinism, URL state, and lecture repeatability are all cheap consequences of it (or expensive retrofits without it).
**Delivers:** float64 autodiff engine with own transcendentals and stable numerics (NaN invariant + fuzz tests); gradcheck tests day one; golden fixture pipeline (PyTorch float64, committed, byte-stable CI); deterministic trace builder + `traceHash`; XOR scenario JSON with explicit weights and op→phase grouping; minimal UI: step panel («шаг N из M» + phase badge), SVG architecture diagram, drill-down diagram → layer → op → number → formula (KaTeX, self-hosted) + provenance + graph-boundary terminal state; step controls incl. back + keyboard; render contract (DOM visible-level only, Canvas heatmaps).
**Addresses:** DOCS-01, DOCS-02 (the D-18 MVP); NFR-01 (trivially, via replay); NFR-02 structurally and permanently.
**Avoids:** Pitfalls 1, 2, 3, 4, 11 (contract), 13 (style guide applied).

### Phase 3: Scenario Progression & Lecture Mode (DOCS-03/04/05)
**Rationale:** With the engine and fixture pipeline proven on XOR, each new scenario rides the same golden CI path — 100% op coverage stays structural. Lecture mode depends on deterministic trace + URL state, both mature by now. This is also where MNIST-specific risks (memory, fused ops, asset weight, render scale) are faced with the full test harness already in place.
**Delivers:** spiral + MNIST scenarios (fused ops with lazy scalar drill-down from the same stored operands, snapshot/delta trace frames, 1–3 fixed samples + weight checkpoints, asset-budget CI gate); scenario hub with progression hints and completion marks (never gates); URL state as source of truth + versioned localStorage wrapper with honest reset; lecture/projector mode (28–32px numbers, keyboard-only flow, deterministic repeat); offline after load (service worker, fully self-hosted fonts/KaTeX); mobile numbers-first tier; cross-browser trace-hash CI + E2E reload/incognito tests; bundle/first-step budget in CI.
**Addresses:** DOCS-03, DOCS-04 (full <1 min guarantee, budgeted), DOCS-05; NFR-01 verified on MNIST at scale.
**Avoids:** Pitfalls 6, 7, 9, 10, 11 (full verification), 15.

### Phase 4: Measurement, Hardening & Pilot Launch (DOCS-06)
**Rationale:** Measurement is built after the thing measured (documented anti-pattern: quiz/analytics before the walkthrough inverts dependencies and delays the D-18 prototype); the event *schema* is fixed early, the implementation lands here to instrument pilots for H1.
**Delivers:** skippable pre/post quiz (5 questions per scenario; one-click skip; never gates; "no baseline" marking); anonymous analytics behind the facade with vendor chosen against the offline/determinism/privacy checklist (PostHog EU anonymous leading); North Star + funnel events (coarse, offline-queued, non-blocking); completion summary + next-scenario pointer; RU strings with i18n-ready extraction; accessibility pass; perf smoke + offline-CI (blocked network → clean console); pilot packaging.
**Addresses:** DOCS-06, NFR-03 (Buy, anonymous, $0); residual DOCS-01/03 edge cases.
**Avoids:** Pitfall 14 (analytics vs offline/determinism/gating); makes H1 measurable in pilots.

### Phase Ordering Rationale

- **D-18 ordering is non-negotiable:** validation (Phase 1) is the cheapest retirement of the riskiest assumptions (H2/H3); code starts only on go.
- **The pure-replay engine is the master dependency** (FEATURES dependency graph): step-back, determinism, URL state, lecture repeatability, and O(1) stepping all hang off `state = f(scenario, stepIndex)`. It must be decided and built before any UI (Phase 2), or each becomes its own checkpoint/undo subsystem.
- **NFR-02 is structural from day one:** the fixture pipeline lands with the engine (Phase 2); every Phase-3 scenario automatically means new golden fixtures — "100% of operations covered" is enforced by construction, never re-argued.
- **DOCS-06 comes last among build phases** but its event schema is fixed early so events aren't retrofitted.
- **One-author budget discipline:** DF-9 (PyTorch snippets) is nearly free off the fixture harness but waits for v1.x; anti-features AF-1..13 are enforced across all phases — the constructor is R2 not merely as a scope cut but because it invalidates three shipped guarantees.
- **Architecture build order (engine → fixtures → scenario → minimal UI → full UI → persistence → content → measurement)** maps 1:1 onto Phases 2→4.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** clickable-prototype fidelity decision (hand-built HTML mock vs design tool) and usability protocol design — non-standard, no library pattern; interview script for H2.
- **Phase 2:** golden-fixture mechanics need a small spike — verify the Python-`repr` ↔ JS-`JSON.parse` bit-exact float round-trip claim on real op chains; final tolerance helper (`atol`/`rtol`); fused-vs-decomposed CE decision; scenario schema final shape (phase grouping, fused-op drill-down).
- **Phase 3:** MNIST trace memory model (snapshot+delta — the one MEDIUM-confidence architecture pocket); `vite-plugin-pwa` × Vite 8 compatibility; KaTeX at 380px; MNIST subset sourcing at authoring time (licensing/hosts); cross-browser transcendental validation on real devices.
- **Phase 4:** analytics vendor final choice (PostHog EU vs Umami vs Metrica) against the Pitfall-14 checklist incl. RU availability; quiz question methodology (content work, 5 good questions per scenario).

Phases with standard patterns (skip dedicated research):
- **Phase 2 core:** micrograd-pattern engine, golden-master testing, pure-player UI — canonical, well-documented; STACK/ARCHITECTURE already carry the specifics.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core choices (TS/Vite/React/own engine/Vitest) verified 2026-11-02; MEDIUM: hosting (low-stakes, reversible), analytics vendor, vite-plugin-pwa version |
| Features | HIGH | Landscape structure and taxonomy robust; MEDIUM on current-day details of third-party products (knowledge-based, spot-checked) |
| Architecture | HIGH | Canonical deterministic-replay pattern, independently converged by stack and architecture research; one MEDIUM pocket: MNIST trace memory |
| Pitfalls | HIGH | Engineering traps well-established (numerics, determinism, DOM perf); MEDIUM: product/content heuristic thresholds (3–7 numbers, <10 sec, 2 MB) — working values to calibrate in Phase 1 |

**Overall confidence:** HIGH

### Gaps to Address

- **Framework disagreement (React 19 vs Preact):** STACK recommends React 19 (single-author AI-codegen efficiency, ecosystem); ARCHITECTURE leans Preact (bundle size). **Recommendation: React 19 with an enforced ≤ ~200 KB gz core-path budget** (`size-limit` in CI from Phase 2) — the author-efficiency argument dominates for a one-person project, and the pure-player UI makes a later swap cheap.
- **Routing (hash vs history):** ARCHITECTURE prescribes hash routing; STACK suggests history + CF `_redirects`. **Recommendation: hash** — zero server config on any host, embed- and offline-safe.
- **Analytics vendor undecided:** PostHog EU anonymous (STACK) vs Yandex Metrica vs defer (ARCHITECTURE). Metrica conflicts with the GDPR/anonymous posture on the EN track. Decide in Phase 4 via the Pitfall-14 checklist; the facade makes it a 1-day swap either way.
- **Fixture bit-exactness claim:** the `repr`/`JSON.parse` round-trip equality needs a Phase-2 spike before the pipeline hardens.
- **MNIST trace memory model:** snapshot+delta design is MEDIUM confidence; validate with measurements during Phase-3 planning, worker seam exists as escape hatch.
- **mladdict.com (closest known analog):** LOW confidence in its current state — verify before launch; include in SEO gap analysis.
- **Usability thresholds (3–7 numbers/step, ≤30 on screen, <10 sec find):** working heuristics — calibrate in the Phase-1 H3 test, then bake into acceptance criteria.
- **Spec gaps to fold into requirements at roadmap time:** step-back (TS-3), keyboard nav (TS-8), mobile tier (TS-13), accessibility (TS-16), number-hygiene presentation (TS-12) — table stakes the landscape imposes that REQUIREMENTS.md doesn't yet name.

## Sources

### Primary (HIGH confidence)
- vite.dev, vitest.dev — versions verified 2026-11-02 (Vite 8.3.4, Vitest 5.0.5)
- posthog.com/pricing, umami.is/pricing — free tiers verified 2026-11-02 (1M / 100K events per month)
- github.com/karpathy/micrograd — canonical scalar autodiff semantics; pinned-commit reference
- pytorch.org autograd docs (`gradcheck`) — numerical gradient verification methodology
- REQUIREMENTS.md, PROJECT.md, docs/01–05 — authoritative scope and constraints

### Secondary (MEDIUM confidence)
- TensorFlow Playground, MLU-Explain, poloclub CNN/Transformer Explainer, distill.pub — landscape standards (knowledge-based, spot-checked against docs/03)
- Matt Mazur's step-by-step backprop post — static proof of demand for per-number walkthrough
- KaTeX docs — sync rendering, self-hostable fonts, size vs MathJax
- ECMAScript spec notes — `+−×÷` correctly rounded; `Math.tanh/exp` implementation-defined across engines

### Tertiary (LOW confidence)
- mladdict.com/backpropagation — closest known analog; current state unverified — check before launch
- plausible.io pricing — page unavailable (404) at research time

---
*Research completed: 2026-11-02*
*Ready for roadmap: yes*
