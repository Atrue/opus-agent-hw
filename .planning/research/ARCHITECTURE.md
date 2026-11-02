# Architecture Research

**Domain:** Educational autodiff-trainer web app (client-only, zero-install, stepwise forward/backward MLP walkthrough)
**Researched:** 2026-11-02
**Confidence:** HIGH (domain is well-trodden: micrograd-style engines, golden-master testing, pure-player UIs; MEDIUM pockets noted inline — MNIST trace memory, analytics vendor choice)

## Executive Summary (the opinionated core)

This domain has a canonical reference architecture, proven by micrograd-derived educational tools, TF Playground, and interactive-explorable explainers. The five decisions that shape everything else:

1. **Deterministic replay over live stepping.** On scenario load, a seeded autodiff engine executes the *entire* training run once and records an immutable **RunTrace** (ordered step list with values + gradients + provenance). The UI is a *pure player* over `(trace, stepIndex)`. This one decision satisfies DOCS-05 (deterministic lecture replay, state survives reload), makes back/forward stepping O(1), and turns NFR-01 (<100ms/step) into a trivially true statement.
2. **Op-level engine, scalar drill-down.** The user steps at *operation* granularity (`z₁ = W₁·x + b₁`, `a₁ = tanh(z₁)`, `L = CE(ŷ, y)`), matching the DOCS-02 hierarchy (diagram → layer → operation → number). Individual numbers inside an op are reached by drill-down, indexed into stored op inputs/outputs. One engine serves XOR, spiral and MNIST without a scalar-op step explosion.
3. **Engine computes the trace on load; traces are never shipped as content.** Content = scenario JSON (architecture + explicit initial weights + dataset + hyperparams + narration + quiz). Determinism comes from explicit weights and a seeded, cross-replicated PRNG — never `Math.random()`. This keeps engine and content in lockstep (no drift), keeps the bundle small, and makes golden-run testing natural.
4. **Engine first, UI second.** NFR-02 (≤1e-6 vs micrograd/PyTorch reference) is the product's trust guardrail. The engine + fixture pipeline + golden tests are buildable and green *before any UI exists*, which de-risks everything downstream (UI becomes presentation over verified numbers).
5. **Everything domain-related is pure TypeScript with zero DOM deps**; UI, persistence, and analytics are thin adapters around pure core. This is what makes the testing pyramid in §Testing possible at all.

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│ UI Layer  (render-only; pure function of PlayerState + RunTrace)         │
│ ┌───────────┐ ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌───────────┐  │
│ │ Architecture│ │ Step Panel │ │ Drill-down │ │ Formula   │ │ Scenario  │  │
│ │ diagram    │ │ (step N of │ │ panel      │ │ rendering │ │ hub +    │  │
│ │ (SVG)      │ │  M, values)│ │ (number →  │ │ (KaTeX)   │ │ pre/post │  │
│ │            │ │            │ │ formula →  │ │           │ │ quiz UI  │  │
│ │            │ │            │ │ sources)   │ │           │ │          │  │
│ └─────┬─────┘ └─────┬─────┘ └─────┬──────┘ └─────┬─────┘ └────┬──────┘  │
├───────┴─────────────┴─────────────┴──────────────┴────────────┴─────────┤
│ Session Layer  (pure reducer state machine; framework-agnostic)          │
│ ┌────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│ │ Player reducer │  │ Quiz state       │  │ Analytics event bus      │  │
│ │ (step cursor,  │  │ (pre/post score, │  │ (anonymous id, queue in  │  │
│ │  phase, drill) │  │  skip flags)     │  │  localStorage, opt-out)  │  │
│ └───────┬────────┘  └────────┬─────────┘  └────────────┬─────────────┘  │
├─────────┴────────────────────┴─────────────────────────┴────────────────┤
│ Domain Layer  (PURE TypeScript — no DOM, no framework, no I/O)           │
│ ┌────────────────┐    ┌────────────────┐    ┌─────────────────────────┐ │
│ │ Autodiff engine│ →  │ Trace builder  │ →  │ RunTrace (immutable     │ │
│ │ (op nodes:     │    │ (seeded,       │    │ step list: values,      │ │
│ │ matvec/add/    │    │  deterministic)│    │ grads, provenance,      │ │
│ │ act/loss/upd;  │    │                │    │ narrative refs)         │ │
│ │ topo-sort +    │    └────────────────┘    └────────▲────────────────┘ │
│ │ .backward())   │                                   │                  │
│ └───────┬────────┘    ┌────────────────┐             │                  │
│         │             │ Scenario       │             │                  │
│ ┌───────┴──────┐      │ loader + schema│────────────►│ (engine consumes │
│ │ Scenario JSON│ ───► │ (validated,    │             │  scenario, emits │
│ │ (shipped     │      │  versioned)    │             │  trace)          │
│ │ content)     │      └────────────────┘             │                  │
│ └──────────────┘                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│ Platform Layer (adapters; the only place with side effects)              │
│ ┌────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐  │
│ │ URL / hash     │ │ localStorage    │ │ Static hosting (Pages/CF) + │  │
│ │ router (deep   │ │ (progress, quiz │ │ analytics sink — bought     │  │
│ │ links to       │ │ scores, anon id,│ │ tool, no PII, no server     │  │
│ │ scn/step)      │ │ event queue)    │ │ compute (NFR-03)            │  │
│ └────────────────┘ └─────────────────┘ └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Dependency rule (strict, one-directional):** UI → Session → Domain; Platform adapters observe/restore Session state. Domain never imports upward. This is the single most load-bearing constraint in the codebase.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Autodiff engine** | Op-level reverse-mode autodiff: op nodes (`matvec`, `add`, `tanh`/`relu`, `softmax+CE`/`BCE`, `sgd-update`), topological sort, `.backward()`, per-op forward/backward closures; float64 everywhere | micrograd-style graph but with tensor-1D ops instead of scalar ops; hand-written, ~500–800 LOC TS, zero deps |
| **Trace builder** | Runs the full scenario training loop deterministically (explicit weights, seeded sample order), records every user-visible step into RunTrace; computes `traceHash` | Pure function `(Scenario) → RunTrace`; optional Web Worker for MNIST |
| **RunTrace** | Immutable data structure: ordered steps, each with phase, values/grads (typed arrays), op params, provenance refs, narrative/formula keys | Plain data; consumed read-only by UI and tests |
| **Scenario content** | Declarative JSON per scenario: architecture, explicit init weights, dataset ref, hyperparams, narration strings (ru/en), formula templates, quiz items, recommended-next links | Static JSON files, schema-versioned, validated at load + in CI |
| **Player reducer** | Walkthrough state machine: `{scenarioId, stepIndex, phase, drill, maxStepReached}`; actions `next/prev/jumpTo/drill/complete`; derives "шаг N из M", phase transitions, completion | Pure reducer (~150 LOC), framework-agnostic |
| **UI components** | Architecture diagram (SVG), step panel, drill-down panel, KaTeX formulas, scenario hub, quiz screens, projector/large-font mode (DOCS-05) | Preact (or Svelte) + hand-rolled SVG; KaTeX for math |
| **Persistence** | Write-through of progress to localStorage; URL deep links (`#/scn/xor/step/12?drill=…`); restore-on-load; honest reset on version mismatch (DOCS-04 edge) | Thin adapters; ~100 LOC |
| **Analytics** | Anonymous event emission (`scenario_started`, `step` sampled, `walkthrough_completed`, `quiz_pre/post`), local queue, no PII, opt-out | Thin wrapper over a bought tool (Yandex Metrica / PostHog free tier); interface fixed, vendor swappable |
| **Fixture pipeline (dev-time)** | Offline generator: runs the same scenario in PyTorch/micrograd (Python), emits golden JSON fixtures; CI asserts engine trace equality at rtol ≤ 1e-6 (NFR-02) | Python script + committed `fixtures/*.json` + Vitest suite |

## Layer Analysis (mapped to the seven research questions)

### 1. Core Engine — reverse-mode autodiff + step-execution model

**The graph.** The canonical educational design is micrograd's: each node holds `data`, `grad`, a `_backward` closure, and children; `.backward()` topologically sorts and calls closures in reverse. For this product the node granularity is an *operation* (matrix–vector product, bias add, activation, loss, weight update), not a scalar:

```
x ──► matvec(W₁) ──► add(b₁) ──► tanh ──► matvec(W₂) ──► add(b₂) ──► sigmoid ──► BCE loss
```

Each op internally stores its operand tensors, so drill-down to "the number `z₁[2]`" is an index into stored arrays plus a provenance record (which row of W₁ and which input produced it). Backward ops mirror forward ops one-to-one, so the walkthrough's backward phase is the *same op list traversed in reverse* — pedagogically exactly what backprop is.

**Float64 everywhere.** JS numbers are IEEE-754 doubles; PyTorch reference runs in `torch.float64`. With identical op order and explicit weights, rtol 1e-6 is comfortably achievable (NFR-02). One real trap: `Math.tanh`/`Math.exp` are implementation-defined across JS engines and may differ from libm used in Python by ~1 ulp. **Recommendation: ship own `tanh`/`exp` implementations in the engine (formula-based), and mirror the same formulas in the fixture generator**, plus assert with `rtol=1e-9` internally against a handful of bit-exact ops — this converts NFR-02 from "hope" to "mechanism".

**Step-execution model — the central architectural fork:**

| Option | How it works | Verdict |
|--------|--------------|---------|
| **A. Live engine stepping** | UI calls `engine.stepForward()` / `stepBackward()` on a live, mutating graph; undo via inverse ops or snapshots | Rejected as primary model: backward-step requires un-differentiating or snapshotting; determinism across reloads becomes an invariant to *maintain* rather than a property to *verify*; test flakiness; DOCS-05 determinism is at risk |
| **B. Precomputed trace shipped as content** | Authoring pipeline emits full step JSON; app is a dumb player | Rejected: megabyte fixtures per scenario, engine/content version drift, golden tests degenerate to "fixture equals itself" |
| **C. Trace computed on load (RECOMMENDED)** | Seeded engine runs the whole scenario once at load, records immutable RunTrace; UI is a pure player over `(trace, stepIndex)` | Wins: O(1) next/prev/jump; reload → recompute → identical trace (determinism is *checkable* via `traceHash`); back-step is trivial; step render is array reads (NFR-01 <100ms trivially); golden tests compare engine trace vs PyTorch fixtures |

Compute cost of C at load: XOR/spiral — full run in <10ms; MNIST scenario (walkthrough = single-sample drill-down + per-epoch macro steps on a subset, e.g., 1–2k samples) — well under 1s; move to a Web Worker only if measurements demand it (avoid premature async complexity).

**Memory strategy for RunTrace (the one MEDIUM-confidence pocket):** naive per-step snapshotting of all weights duplicates W per step. Recommended hybrid: full weight snapshot at phase/epoch boundaries + *delta* (or "recompute-from-snapshot") frames for intermediate steps; per-op activations stored per step (small). For v1 sizes this is a few MB worst case — acceptable; the delta mechanism is the escape hatch if MNIST content grows.

**Engine ↔ content separation:** engine consumes a *validated Scenario object*; it has zero knowledge of narration, quiz, or RU/EN strings. Conversely scenario JSON contains no code. The trace builder is the only bridge. This separation is what allows content iteration without touching verified numerics.

### 2. Scenario / Curriculum Layer

**Scenario definition format (illustrative, not final):**

```jsonc
{
  "id": "xor",
  "schemaVersion": 1,
  "title": { "ru": "XOR на MLP", "en": "MLP on XOR" },
  "difficulty": 1,
  "recommendsAfter": null,              // DOCS-03: hint, never a gate
  "network": {
    "layers": [ { "kind": "linear", "fanIn": 2, "fanOut": 3 },
                { "kind": "tanh" },
                { "kind": "linear", "fanIn": 3, "fanOut": 1 },
                { "kind": "sigmoid" } ],
    "loss": "bce",
    "optimizer": { "kind": "sgd", "lr": 0.5 }
  },
  "initWeights": { "w1": [/* explicit float64 arrays */], "b1": [], "w2": [], "b2": [] },
  "dataset": { "kind": "inline", "order": [0,1,2,3,0,1,2,3] },
  "epochs": 4,
  "seed": 42,                            // for any remaining nondeterminism (sample shuffling)
  "narrative": [
    { "step": 0,  "title": {"ru": "…"}, "body": {"ru": "…"}, "formula": "z^{(1)} = W_1 x + b_1" }
  ],
  "quiz": { "pre": [/* 5 items */], "post": [/* same 5 items */] }
}
```

Two non-negotiables baked into this format:

- **Initial weights are explicit data, not generated.** This is the single strongest determinism guarantee: JS engine and Python fixture generator read the *same numbers*, no PRNG replication problem at the weights level. (Any remaining randomness — e.g., sample shuffling — uses a seeded mulberry32/xorshift *implemented identically in TS and the Python generator*, or better: ship the explicit order.)
- **Datasets:** XOR inline (4 samples); spiral generated deterministically from seed (formula + seeded noise, replicated in Python); MNIST — bundled **subset** (1–2k samples, uint8, ~1–2MB, lazy-loaded chunk + CacheAPI so DOCS-05's "network drops after load" holds; full 60k×784 ≈ 47MB is out — and out of scope anyway since v1 walkthrough drills curated samples, not the whole set).

**Precomputed run vs on-the-fly:** on-the-fly at load (Option C above). Authoring-time precomputation is an anti-pattern (drift + weight); live-per-click computation is an anti-pattern (determinism, undo). The scenario author writes *parameters and narrative*, never numbers — numbers come only from the verified engine.

### 3. Visualization Layer

- **Architecture diagram:** hand-rolled reactive SVG (nodes = neurons, edges = weights with color/width encoding value and gradient). Libraries like Cytoscape.js solve graph *layout* problems we don't have — MLP layers have a trivial layout (columns). d3-scale alone is acceptable if even that. The diagram is the drill-down *entry point* (DOCS-02): click layer → op list → number.
- **Step panel:** inputs / outputs / gradients of the current op as formatted numbers (fixed precision + hover for full float), phase badge (forward/backward/update), "шаг N из M" (DOCS-01).
- **Number drill-down panel:** for any scalar: formula with its actual numbers substituted (KaTeX), provenance links ("computed from W₁ row 2 and x"), chain-rule expansion during backward ("∂L/∂a₁ × ∂a₁/∂z₁ = …"). Graph-boundary edge case (DOCS-02): at layer 1 / input data, panel shows "input data — start of the chain rule", a terminal state, never empty (this is content in the narrative schema, rendered by a boundary component).
- **Formula rendering: KaTeX, not MathJax.** KaTeX is ~300KB min+fonts, synchronous, fast; MathJax v3 is heavier and async-first. Both are self-hostable — required, because DOCS-05's offline-after-load edge case forbids CDN fonts (bundle KaTeX fonts with the app; same for UI webfonts or use system font stack).
- **Loss curve / progress:** small SVG sparkline from trace (loss recorded per step/epoch).
- **Projector mode (DOCS-05):** a scale-up (large type, high contrast) that is just a CSS class toggled by URL param — cheap, and it exists because the acceptance criteria literally say "readable from the back rows".
- **Framework:** any mainstream reactive framework works because UI is a pure function of `(trace, stepIndex, drillPath)`. Recommendation: **Preact + Vite + TypeScript** (or Svelte 5) — smallest bundle for DOCS-04's "first step < 1 min" on mid hardware; plain React is acceptable but watch the core-JS budget (target ≤ ~200KB gz core path; MNIST data chunk lazy).

### 4. Walkthrough / Session State Machine

Pure reducer, no framework coupling:

```ts
type Phase = 'intro' | 'pre-quiz' | 'walkthrough' | 'post-quiz' | 'summary';
type PlayerState = {
  scenarioId: string;
  stepIndex: number;          // 0..M-1 over RunTrace.steps
  phase: Phase;
  maxStepReached: number;
  drill: { layer: number; op: string; number?: string } | null;
  quiz: { preShown: boolean; preScore?: number; postScore?: number; skippedPre: boolean };
};
// actions: NEXT, PREV, JUMP(i), DRILL_OPEN(path), DRILL_CLOSE,
//          QUIZ_SUBMIT(which, score), SKIP_QUIZ, SCENARIO_COMPLETE
```

Derived (never stored): "шаг N из M" = `stepIndex+1` of `steps.length`; forward/backward/update phase = `steps[stepIndex].phase`; completion = `stepIndex === M-1 && NEXT` → summary + next-scenario suggestion (DOCS-01 edge case, DOCS-03). Quiz is always skippable and never gates (DOCS-06 edge case); skipped pre-test sets `skippedPre` so post-test data is marked "no baseline" downstream.

The reducer is where analytics events are *declared* (as effects of actions), keeping the state machine itself pure and unit-testable.

### 5. Persistence — localStorage + URL deep links + deterministic replay

- **URL is the source of truth for location:** hash routing `#/scn/xor/step/12?drill=l1.z1.out2&mode=projector`. Hash (not path) keeps static hosting trivial (no server rewrites). The link *is* the product (DOCS-04) and is shareable to a specific step — valuable for lecturers pointing students at "the step where the gradient flips sign".
- **DOCS-05 reload guarantee decomposes into two mechanisms:** (a) trace determinism — same scenario JSON + engine version → identical trace (verified by `traceHash`); (b) restore — on load, read `stepIndex`/`phase` from URL first, fall back to localStorage `maxStepReached`. Network loss after load is covered by bundling everything (app + fonts + KaTeX + dataset cache).
- **localStorage schema (namespaced + versioned):** `bp:v1:progress` = `{scenarioId → {maxStepReached, completed, quiz}}`, `bp:v1:anonId` (random UUID, generated once — this is *not* the determinism seed), `bp:v1:events` (analytics queue), `bp:v1:optout`. On schema/engine version mismatch: honest reset with a one-line notice (DOCS-04 edge case explicitly allows reset over fake restore).
- **Never stored:** derived step data, weights, activations — all recomputed deterministically. Storage stays tiny (KBs).

### 6. Testing Architecture (the NFR-02 pyramid)

**Golden-run pipeline (the heart of NFR-02):**

```
tools/fixtures/generate.py        Vitest (CI + dev)
  reads Scenario JSON       Fixture JSON        engine (TS) trace
  rebuilds net in torch       ◄──────────────    │
  (float64, same weights,            compare     ▼
   same sample order)      rtol ≤ 1e-6 ──────► fail/red
```

- Generator mirrors scenario in **PyTorch float64** (and/or micrograd for the scalar path) using the *same explicit weights and sample order from scenario JSON*. Fixtures contain per-step op inputs/outputs and post-backward gradients. Fixtures are **committed** to the repo (~hundreds of KB) with a CI check that regeneration is byte-stable (`make fixtures && git diff --exit-code`) — this catches accidental scenario drift too.
- Assertion: `Math.abs(a-b) <= rtol*max(|a|,|b|) + atol` with rtol=1e-6, small atol for near-zero gradients; plus a stricter internal rtol=1e-9 target so production margin is visible, not consumed.
- **"100% of operations covered" (NFR-02)** is structural, not aspirational: the fixture *is* the full trace of the full run, so coverage = every op of every step of every shipped scenario, asserted by comparing trace length + op kinds first, values second.

**Supporting test layers:**
1. **Engine unit tests:** each op's forward/backward vs hand-computed values on 2–3 element tensors.
2. **Gradient property tests (gradcheck):** finite-difference check per op — independent of fixtures; catches backward-closure bugs even before fixtures exist. This is what makes the engine testable *from day one*, before MNIST/PyTorch plumbing lands.
3. **Determinism tests:** same scenario → identical `traceHash` across repeated runs; across reload (Playwright reload test = the DOCS-05 acceptance criterion, executable).
4. **Player reducer tests:** pure-function tests for the DOCS-01/03/06 happy + edge paths (last step completes walkthrough; spiral accessible without XOR; quiz skip never gates).
5. **Perf smoke (NFR-01):** assert step *render* (player + panel + drill-down) < 100ms on CI hardware with generous margin; trace-build time budgeted per scenario (< 1s XOR/spiral, < 3s MNIST subset).
6. **E2E smoke (Playwright):** open deep link → step through XOR → completion screen; reload mid-walkthrough → same state.

### 7. Analytics (anonymous)

- **Buy, don't build (NFR-03):** thin `track()` interface; concrete sink is a config swap. Candidates for RU beachhead + zero cost: Yandex Metrica (free, RU-familiar) or PostHog cloud free tier; Umami/Plausible self-host contradicts "no servers" unless free-tier hosted. Decision deferred to implementation; the *interface and event schema* are fixed here because DOCS-06 depends on them.
- **Events:** `scenario_started`, `step_completed` (sampled 1-in-10 to keep volume/noise down, plus always step 1 and final), `walkthrough_completed` (North Star input), `quiz_pre_score` / `quiz_post_score` / `quiz_pre_skipped` (H1 A/B material, "no baseline" flag), `deep_link_opened`, `session_started` (first paint timing for DOCS-04 <1min monitoring).
- **Privacy mechanics:** anonymous UUID in localStorage (no fingerprints, no PII, no session recording), queue offline, opt-out flag checked before any send — compatible with 152-ФЗ/GDPR posture (D-16). No analytics call blocks or delays the first user step (DOCS-04).

## Recommended Project Structure

```
src/
├── engine/                  # PURE domain: autodiff (no DOM, no framework)
│   ├── ops.ts               #   op nodes: matvec, add, tanh, sigmoid, losses, sgd-update
│   ├── graph.ts             #   topo sort, .backward()
│   ├── numeric.ts           #   float64 kernels + own tanh/exp (cross-engine determinism)
│   └── rng.ts               #   mulberry32 seeded PRNG (mirrored in Python)
├── trace/                   # PURE domain: run trace model + builder
│   ├── builder.ts           #   (Scenario) → RunTrace  [deterministic]
│   ├── run-trace.ts         #   types + step/frame accessors + traceHash
│   └── provenance.ts        #   number → (formula, source refs) resolution
├── scenarios/               # PURE content + schema
│   ├── schema.ts            #   zod/JSON-schema types + validation
│   ├── xor.json
│   ├── spiral.json
│   └── mnist.json           #   + data/mnist-subset.bin (lazy chunk)
├── player/                  # PURE session state machine
│   ├── reducer.ts           #   PlayerState + actions
│   └── selectors.ts         #   step N of M, phase, completion, drill path
├── ui/                      # render-only Preact components
│   ├── diagram/             #   SVG architecture diagram (drill-down entry)
│   ├── step-panel/
│   ├── drilldown/
│   ├── formula/             #   KaTeX wrapper (self-hosted fonts)
│   ├── hub/                 #   scenario list + progression (DOCS-03)
│   ├── quiz/                #   pre/post test (DOCS-06)
│   └── app.tsx              #   composition root
├── platform/                # side-effect adapters ONLY
│   ├── router.ts            #   hash URL ↔ PlayerState projection
│   ├── storage.ts           #   localStorage repository (versioned, honest reset)
│   ├── analytics.ts         #   track() → bought-tool sink (opt-out, queued)
│   └── worker.ts            #   optional: trace build off main thread (MNIST)
tools/
├── fixtures/
│   ├── generate.py          #   PyTorch float64 reference → fixture JSON (NFR-02)
│   └── golden/*.json        #   committed fixtures per scenario
tests/
├── engine/                  #   unit + gradcheck (day-one tests)
├── golden/                  #   trace vs fixtures (NFR-02)
├── player/                  #   reducer acceptance paths
└── e2e/                     #   Playwright: deep link, reload, full walkthrough
```

### Structure Rationale

- **`engine/` + `trace/` purity is the architecture.** Everything NFR-02-critical compiles and tests without a browser; the same code could run under Node in CI (and does, in Vitest).
- **`scenarios/` is data, not code** — content review and translation (RU→EN, D-10) never touch verified numerics.
- **`platform/` is the only directory allowed side effects**, so "reload restores state" and "analytics is anonymous" are each testable in one obvious place.
- **`tools/fixtures/` lives in-repo** so scenario JSON edits that change numbers immediately fail CI until fixtures regenerate — an intentional friction that protects the trust guardrail.

## Architectural Patterns

### Pattern 1: Pure-player over precomputed trace (event-sourcing-lite)

**What:** compute the whole run once → immutable step log → UI = `(trace, index)` renderer.
**When to use:** any "scrub through a deterministic computation" UX (walkthroughs, debuggers, time-travel).
**Trade-offs:** + O(1) next/prev/jump, + determinism checkable by hash, + trivial persistence (just an index) — − load-time compute (fine at our scale), − memory for big traces (mitigated by snapshot+delta frames).
**Example:**
```ts
// ui/step-panel — there is no "engine.step()" call anywhere in UI code
const step = trace.steps[state.stepIndex];
render(<Panel title={step.title} values={step.outputs} grads={step.grads}
             position={`${state.stepIndex + 1} / ${trace.steps.length}`} />);
```

### Pattern 2: Determinism by construction (explicit data + mirrored RNG + own transcendentals)

**What:** no ambient nondeterminism ever enters the trace: weights are explicit JSON; sampling order is explicit or from a PRNG implemented identically in TS and Python; `tanh`/`exp` are own implementations (IEEE +,-,*,/ are exact; `Math.tanh` is not guaranteed cross-engine).
**When to use:** whenever a product promises "same link → same numbers" (DOCS-05) and 1e-6 cross-implementation equality (NFR-02).
**Trade-offs:** + golden tests at 1e-6 become routine — − small cost: own numeric kernels and mirrored PRNG to maintain (~50 LOC each).

### Pattern 3: Provenance-carrying operations (numbers know where they came from)

**What:** every recorded op stores operand refs (which weight row, which activation) so any scalar can be rendered as formula-with-numbers and linked to its sources — the data substrate of DOCS-02 drill-down.
**When to use:** explainable-math UIs; this replaces runtime "symbolic differentiation for display" (fragile) with precomputed provenance (boring, testable).
**Trade-offs:** + drill-down is pure data lookup — − trace is slightly heavier (refs, not formulas-in-code).

### Pattern 4: Golden-master fixtures as the contract between two implementations

**What:** reference implementation (PyTorch float64) and product implementation (TS engine) are locked by committed JSON fixtures; CI enforces byte-stable regeneration.
**When to use:** whenever "correct numbers" is the product (NFR-02: a single wrong gradient kills trust).
**Trade-offs:** + drift impossible to miss — − fixture regeneration is a required dev ritual (automate in `make fixtures`).

## Data Flow

### Load flow (deep link or hub click)

```
URL #/scn/xor/step/12
  → router parses (scenarioId, stepIndex, drill, mode)
  → scenario loader validates JSON (schema)
  → trace builder: engine runs full scenario (seeded) → RunTrace + traceHash   [worker?]
  → player reducer initialized: URL index ▸ localStorage maxStepReached
  → UI renders step 12 (values/grads/formula) + diagram state + "12 / M"
  → analytics: deep_link_opened (queued, non-blocking)
```

### Step flow (user clicks «Шаг»)

```
User → NEXT action → reducer (pure): stepIndex+1, maxStepReached = max(...)
  → selectors derive phase/position → UI re-renders from trace[stepIndex]
  → effects (platform): storage.write(progress), track(step_completed*)
  → at last step: reducer transitions to summary + next-scenario suggestion
```

### Reload flow (DOCS-05 guarantee)

```
reload(same URL) → recompute trace (deterministic) → traceHash equal to previous by construction
  → restore stepIndex from URL → identical screen state. No server. Works offline after first load.
```

### Drill-down flow (DOCS-02)

```
click layer (diagram) → DRILL_OPEN(layer) → op list for current step
click op → op detail (inputs/outputs/grads)
click number z₁[2] → provenance.resolve(number) → formula with substituted numbers
                   → source links (W₁ row 2, x[2]) → at graph boundary: terminal panel (input data / chain-rule start)
```

### Key invariant

Information moves **one way**: `scenario (data) → engine → trace → player → UI`; persistence/analytics *observe* player state and *restore initial state only*. No UI component ever feeds values back into the engine or trace. This is what makes every layer independently testable and the whole walkthrough reproducible.

## Suggested Build Order (dependency-driven; NFR-02 testable from day one)

```
P1 engine + numeric kernels + gradcheck tests      ← no UI, pure TS, day-one NFR-02 foundation
P2 fixture pipeline (PyTorch ref) + golden tests    ← NFR-02 GREEN before any pixels
P3 scenario schema + xor.json + trace builder + determinism test (traceHash)
P4 player reducer + minimal step UI (values, "N of M", prev/next)     ← DOCS-01 happy path (MVP R1 core)
P5 diagram + drill-down + KaTeX                                     ← DOCS-02 (completes MVP R1 = DOCS-01+02 on XOR)
P6 persistence: localStorage + URL deep links + reload e2e           ← DOCS-04/05
P7 spiral + mnist scenarios (subset data, snapshot/delta trace) + hub ← DOCS-03
P8 quiz (pre/post) + analytics events                                ← DOCS-06
throughout: perf smoke after P4 (NFR-01), e2e after P6
```

**Why engine-first and not UI-first:** (a) NFR-02 is the trust guardrail — the engine + fixtures can be *finished and green* while UI doesn't exist, removing the riskiest work from the critical path; (b) UI-first would bake number-formatting and step-model assumptions into components before the step model (op-level, trace-based) is proven; (c) the clickable walkthrough prototype needed for H2/H3 usability testing (D-18) can be P4's minimal UI — it needs real stepping, not polish. The MVP R1 boundary (D-18: XOR walkthrough complete) lands exactly at end of P5.

**Keeping NFR-02 testable from day one:** P1 ships gradcheck (finite-difference) tests that need no Python; P2 adds the PyTorch fixture lock before any content beyond XOR exists; every later scenario (P7) enters CI through the *same* pipeline — "new scenario" automatically means "new golden fixtures", so 100% op coverage stays structural.

## Scaling Considerations

Realistic scale dimensions for a static client-side app (users scale is a *hosting* non-issue — Cloudflare Pages/GitHub Pages absorb traffic at $0, preserving NFR-03):

| Dimension | Trigger | Architecture adjustment |
|-----------|---------|------------------------|
| Content: 3 → 15+ scenarios | R2 growth | Scenario JSON stays lazy-loaded per id; hub reads manifest only. No code change. |
| Trace memory (MNIST-typed content) | Scenario designers add bigger nets | Snapshot+delta frames already in trace model; move build to worker (`platform/worker.ts`) — seam exists from day one |
| Bundle / first-step time (DOCS-04) | MNIST data + KaTeX fonts | Code-split scenario chunks + CacheAPI dataset cache; core path budget ≤ ~200KB gz enforced by `size-limit` in CI |
| Device range | Projectors, old laptops, mid phones | NFR-01 perf smoke + projector mode; float64 scalar JS is comfortably fast at our op counts (≈10⁵ flops/step worst case) |
| Users 0→100k+ | viral lecture links | None (static). Only analytics free-tier limits matter → vendor-swap is a config change |

### Scaling priorities

1. **First "breakage" is perceptual, not computational:** step-render jank on slow devices → keep UI a pure renderer; never compute in render path (trace already does).
2. **Second:** bundle growth eroding DOCS-04's <1min first step → CI budget gate from P4 onward.

## Anti-Patterns

### Anti-Pattern 1: Live mutating engine driven by UI clicks
**What people do:** wire «Шаг» directly to `engine.forwardOp()` / `engine.backwardOp()` on live objects.
**Why it's wrong:** back-step needs un-differentiation or snapshots; reload determinism becomes an emergent hope, not a checked property; UI tests require an engine fixture hell.
**Do this instead:** trace-on-load + pure player (Pattern 1). Determinism gets a hash and a test; back-step is `index-1`.

### Anti-Pattern 2: `Math.random()` or framework-default PRNG anywhere near the run
**Why it's wrong:** silently breaks DOCS-05 (same link → same route through steps) and NFR-02 fixtures can never match.
**Do this instead:** explicit weights in scenario JSON + mirrored seeded PRNG for residual randomness.

### Anti-Pattern 3: Shipping precomputed traces / baked numbers as content
**Why it's wrong:** multi-MB content, engine↔content version drift, and the golden tests degenerate into self-comparison.
**Do this instead:** ship parameters + narrative; compute numbers at load.

### Anti-Pattern 4: Scalar-op step granularity ("click through every multiply")
**Why it's wrong:** XOR already ≈ 30+ scalar ops per pass; MNIST ≈ 10⁵ — a step counter nobody finishes (kills the North Star) and NFR-01 risk in UI.
**Do this instead:** op-level steps (`z₁ = W₁·x + b₁`) with number-level drill-down — exactly the DOCS-02 hierarchy.

### Anti-Pattern 5: CDN-loaded fonts/MathJax/anything on the critical path
**Why it's wrong:** DOCS-05 edge case explicitly requires the demo to survive network loss after load; CDN math fonts break offline determinism of *rendering*.
**Do this instead:** self-host KaTeX + fonts; lazy-load only big scenario data chunks and cache them.

### Anti-Pattern 6: MathML/Canvas/SVG-foreignObject for formulas
**Why it's wrong:** MathML rendering varies wildly across browsers; Canvas text is unselectable/untranslatable; both undermine "formula ↔ number" trust.
**Do this instead:** KaTeX (HTML+CSS), numbers rendered as real DOM text (selectable, accessible, RU/EN localizable).

### Anti-Pattern 7: Quiz/analytics built before the walkthrough
**Why it's wrong:** DOCS-06 exists to measure H1 *on pilots*; building measurement before the thing measured inverts dependencies and delays the D-18 usability prototype.
**Do this instead:** build order P1→P8; the analytics event schema is fixed early (so events aren't retrofitted), implementation last.

### Anti-Pattern 8: Persistence storing derived state (weights, activations, rendered strings)
**Why it's wrong:** storage bloat, version skew, "restore" showing numbers the current engine wouldn't produce — a quiet NFR-02 violation.
**Do this instead:** store only `{scenarioId, maxStepReached, quiz}`; everything else recomputed deterministically.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Static host (GitHub Pages / Cloudflare Pages / Netlify) | Plain build output; hash routing (no rewrite rules needed) | $0 variable cost (NFR-03); any of the three works — decide by RU availability |
| Analytics (Yandex Metrica / PostHog free tier — Buy) | `platform/analytics.ts` adapter; queue + opt-out; interface fixed, vendor swappable | No PII, anonymous UUID only (D-16, 152-ФЗ/GDPR); choose vendor at P8 |
| KaTeX | npm dependency, self-hosted fonts bundled | Sync render; no CDN |
| MNIST data | Bundled quantized subset (~1–2MB) as lazy chunk + CacheAPI | HuggingFace/torch download at *authoring* time, not runtime; subset choice is scenario content |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| scenarios ↔ engine | `Scenario` JSON (validated) consumed by trace builder only | Engine never imports scenario files; content never imports engine internals |
| engine ↔ trace | builder calls engine, records ops → immutable RunTrace | One-way; trace is the only engine output the rest of the app sees |
| trace ↔ player | player holds `stepIndex` + selectors read trace | Player has no engine import at all |
| player ↔ UI | state + actions (framework dispatch) | UI is render-only; all DOCS acceptance paths are reducer tests first |
| player ↔ platform | side-effect adapters subscribe to action stream; restore injects initial state | The only impure seam — keep it thin and obvious |

## Requirements → Architecture Traceability

| Req | Satisfied by (primary → secondary) |
|-----|-------------------------------------|
| DOCS-01 stepwise execution with numbers | player reducer + step panel ← RunTrace op-level steps |
| DOCS-02 drill-down to a number | SVG diagram + provenance-carrying ops (Pattern 3) + KaTeX panel |
| DOCS-03 scenario progression, no gating | scenario manifest + `recommendsAfter` hint + localStorage completion marks |
| DOCS-04 zero threshold, link = product | static hosting + hash deep links + bundle budget CI gate |
| DOCS-05 lecture mode, reload-safe | deterministic trace (`traceHash`) + URL restore + projector mode + full self-hosting |
| DOCS-06 pre/post measurement | quiz state in reducer (never gates) + analytics event schema (`quiz_pre/post`, skip flag) |
| NFR-01 step < 100ms | pure-player render (O(1) array reads) + perf smoke test |
| NFR-02 ≤ 1e-6 vs reference | golden fixture pipeline + float64 + own transcendentals + gradcheck (day one) |
| NFR-03 zero-cost architecture | client-only domain layer, static host, bought anonymous analytics |

## Sources

- Karpathy, *micrograd* (github.com/karpathy/micrograd) — canonical scalar autodiff engine: Value node, topo sort, `_backward` closures; the op-level generalization used here
- Karpathy, *"The spelled-out intro to neural networks and backpropagation"* (video, 2022) — pedagogy of stepwise forward/backward on micrograd; evidence for op-granularity walkthrough UX
- PyTorch autograd docs (pytorch.org/docs/stable/autograd.html) — reference semantics for `.backward()`, float64 reference runs in fixture generator
- TensorFlow Playground (playground.tensorflow.org) — architecture-diagram UX conventions; contrast: shows results, hides per-step process (our differentiator)
- 3Blue1Brown, *Neural networks* series (Chapter 3–4, backprop) — narrative structure for forward/backward phases; passive counterpart
- KaTeX docs (katex.org) — sync rendering, self-hosted fonts; size vs MathJax comparison
- Golden-master / approval testing literature (e.g., *"Golden Master Testing"*, Kudryashov) — committed-fixture CI discipline
- IEEE 754 determinism notes: `+ - * /` correctly rounded (portable); `Math.tanh/exp` implementation-defined across JS engines — rationale for own numeric kernels
- mulberry32 / xorshift seeded PRNGs — small, trivially mirrored across TS and Python
- Explorable-explanables pattern literature (Victor, *"Explorable Explanations"*) — pure-player/reactive document architecture lineage

---
*Architecture research for: educational autodiff-trainer web app (backprop trainer)*
*Researched: 2026-11-02*
