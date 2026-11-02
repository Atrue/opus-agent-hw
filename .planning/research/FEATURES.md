# Feature Research

**Domain:** Interactive ML-education / neural-network-visualization web tools (educational stepwise trainer; not general ML tooling)
**Researched:** 2026-11-02
**Confidence:** HIGH for landscape structure and feature taxonomy; MEDIUM for current-day feature details of third-party products (knowledge-based analysis, spot-checked against `docs/03-market-scan.md` verified 2026-11-02)

**Method note.** Two product families converge on this domain:

- **Family A — interactive explainers** (TensorFlow Playground, MLU-Explain, poloclub CNN/Transformer Explainer, distill.pub): zero-friction, visual, interactive — but operating at *epoch/result* granularity. Backward pass is never the object of interaction.
- **Family B — by-hand execution traditions** (Matt Mazur's "A Step by Step Backpropagation Example", micrograd / Karpathy's nn-zero-to-hero, numpy notebooks, PyTorch hooks + torchviz): this is where the per-number backward-pass insight lives — but behind an environment/abstraction barrier.

Table stakes for THIS product are set by Family A (users arrive with Playground-era expectations for a web widget). Differentiators come from productizing Family B at Family A's friction level. That combination is the unoccupied niche (verified in market scan O2).

---

## Feature Landscape

### Table Stakes (Users Expect These)

Users don't give credit for these, but penalize their absence. "Bar set by" names the product that made it the default expectation.

| # | Feature | Why Expected (bar set by) | Complexity | Maps to (gap?) | Notes |
|---|---------|---------------------------|------------|----------------|-------|
| TS-1 | Zero-install static web app; any scenario opens by direct link, no account, working in seconds | TF Playground / MLU-Explain / CNN Explainer — all instant, accountless | LOW | DOCS-04 | Static hosting; watch MNIST payload size (weights/data bundled — ship quantized subset or precomputed fixtures) |
| TS-2 | Step controls: Step forward, Reset scenario | TF Playground play/pause/step/reset; debugger convention (F10/Step Over) | LOW | DOCS-01 | Step-forward is trivial once engine exists; also "Run to end of pass" fast-forward for lecture pacing |
| TS-3 | **Step backward (undo last step)** | Debugger convention (VS Code step-back, undo); absent in TF Playground — a known frustration when demoing ("wait, what just happened?") | MED | DOCS-01 (implied, gap: not explicit in AC) | Nearly FREE if engine is designed as pure replay: `state = f(scenarioSeed, opIndex)`. Decide this before building UI — retrofitting step-back onto a mutable engine costs a checkpoint tape |
| TS-4 | Progress indicator «step N of M» + phase marker (forward / backward / update) | TF Playground epoch counter; walkthrough convention | LOW | DOCS-01 | Phase marker matters more than N-of-M: tells the user *which pass* they are executing — the product's core concept |
| TS-5 | Deterministic scenario reproduction (fixed initial weights, fixed data order) | TF Playground determinism per run; lecture repeatability | LOW | DOCS-05 (explicit) | Ship precomputed init weights inside scenario definition; no runtime RNG |
| TS-6 | Shareable state via URL (scenario + step position + view state); survives reload | TF Playground encodes full config in URL hash | MED | DOCS-04/05 | Core PLG loop (link = product) AND the DOCS-05 reload-restore mechanism. One serialization scheme serves both |
| TS-7 | Offline after load (no server calls post-boot; optional service worker) | Standard for static edu widgets; lecture reality: venue Wi-Fi drops | LOW | DOCS-05 (explicit edge case) | Falls out of static-hygiene if analytics is the only network call — buffer events, send on reconnect |
| TS-8 | Keyboard navigation (Space/→ step, ← back, R reset) | Debugger convention; **presenter remotes send arrow keys** — without this, lecture mode is broken | LOW | DOCS-05 (implied, gap: not explicit) | Cheapest high-leverage feature for P2; add to DOCS-05 AC |
| TS-9 | Completion summary + next-scenario suggestion | Khan Academy progression convention | LOW | DOCS-01/03 (edge cases) | Already specced; keep summary numbers-first (final loss, gradient norms) to reinforce product identity |
| TS-10 | Anonymous local progress (completion marks in localStorage, honest reset otherwise) | Zero-account products (TF Playground has none; poloclub none) — but our multi-scenario walkthrough *needs* it for "where was I" | LOW | DOCS-04 (explicit edge case) | localStorage only; never a progression gate (DOCS-03 anti-gating) |
| TS-11 | Hover/inline "what is this?" tooltips on every visual element | CNN Explainer sets the bar — every neuron/operation inspectable | MED | DOCS-02 (support mechanism) | Tooltips are the lightest drill-down tier; same metadata powers full drill-down panels |
| TS-12 | Number hygiene: fixed precision, monospace tabular figures, NaN/Inf guarded, colorblind-safe gradient scales | Established by poloclub/MLU visual standards; NFR-02 makes trust existential ("one wrong gradient kills the product") | LOW | NFR-02 (implied, gap: presentation layer not specced) | Use viridis-like perceptual palettes for weight/gradient encodings; never encode sign+magnitude in hue-only |
| TS-13 | Mobile-readable layout | Transformer Explainer / CNN Explainer are fully responsive; VP segment 1: «заходит с ноутбука или телефона» | MED | Gap: mobile not specced in DOCS | Tiered scope: phone gets numbers-first linear step list (read/review mode); full graph drill-down tablet+. Don't chase full graph parity on 360px |
| TS-14 | i18n-ready copy (RU first, EN toggle; strings as data from day one) | MLU-Explain ships multilingual versions of essays; product strategy is RU beachhead → EN (D-10) | MED | Gap: not specced | String extraction on day one = LOW; retrofit after content grows = HIGH. RU UI at launch is de-facto P1 for the RU beachhead; full EN localization can trail |
| TS-15 | Anonymous analytics events (Buy: Plausible-class) | Standard PLG instrumentation | LOW | DOCS-06 / NFR-03 | Instrument North Star (walkthrough completions) + funnel (first step <1 min) from day one |
| TS-16 | Accessibility basics: focus order, ARIA labels, contrast, keyboard-only walkthrough possible | 2026 web standard; classroom contexts include assistive tech | MED | Gap: not specced | Align with TS-8 — keyboard nav forces the same discipline; add to NFR list |

**Gaps found vs REQUIREMENTS.md:** TS-3 (step-back explicitness), TS-8 (keyboard), TS-13 (mobile tiering), TS-16 (a11y) are table stakes the landscape imposes but the spec doesn't name. Recommend folding into DOCS-01/05 and NFR during requirements definition.

### Differentiators (Competitive Advantage)

These realize the value-curve dominance block in docs/02 (пошаговый backward + каждое число + граф + нулевой порог). Ordered by strategic weight.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| DF-1 | **Per-operation numbers panel for BOTH passes** — every op shows inputs, outputs, activations, gradients as numbers | The product's core claim (DOCS-01). No interactive tool shows backward-pass numbers per operation; the only place this exists is Mazur's *static* blog post — which is the canonical SEO result for "backpropagation example," proving demand in static form | HIGH | Autodiff tape engine + op-detail UI. Everything else hangs off this. NFR-02 parity harness is part of the cost |
| DF-2 | **Backward pass as first-class execution mode** — user *runs* the chain rule in reverse traversal, step by step | «.backward() без магии»; TF Playground shows result, 3B1B shows animation, nobody lets you execute it | HIGH (same engine as DF-1) | Deliberate UI decision: backward steps are not "undo" of forward — they are their own annotated sequence with their own narrative |
| DF-3 | **Drill-down: architecture diagram → layer → operation → single number → formula + provenance** | DOCS-02; CNN Explainer has overview+detail for *forward only*; torchviz gives experts an autograd graph with no pedagogy | HIGH | Requires graph model of the network + op registry with formula metadata. The metadata schema (op → formula, inputs, symbol) is a durable content asset |
| DF-4 | **Gradient provenance/tracing** — click any gradient → chain-rule term breakdown → trace upstream contributors to parameter or input | Extends DOCS-02 to "источник, из которого оно получилось"; nobody has this interactively | MED–HIGH (builds on DF-3's graph) | The "aha" feature for the chain rule — 3B1B's core intuition, made touchable. Scope discipline: trace 1 level up + "open full chain" view, not arbitrary-length highlighting |
| DF-5 | **Scenario progression with pedagogical narrative** (XOR → spiral → MNIST), per-step annotations «why this step matters» | DOCS-03; the *content moat* — market scan S2/W1: code is copyable in weeks, methodical scenario library is not | MED code / HIGH content | Annotations share the i18n cost of TS-14. This is where the one-author budget should concentrate after the engine |
| DF-6 | **Lecture mode (P2)**: projector-readable density, deterministic scenario, URL state survives reload, keyboard-only flow | DOCS-05; TF Playground is *used* for lectures but nothing on the market is *designed* for it; P2 teachers are the B2B2C gatekeepers (H2) | MED | Composition of TS-3..TS-8 + a "presentation density" toggle (larger step panel, simplified graph). Cheap, unique positioning |
| DF-7 | **Built-in pre/post understanding test (skippable, 5 Q) + anonymous aggregate** | DOCS-06; validates H1 (>20% gain) *inside* the product; no free tool has measurement — Brilliant/Khan quiz for mastery, not pre/post deltas | MED | Content: 5 good questions per scenario ≈ the hard part. Anti-trap already specced: never gate on it |
| DF-8 | **Stepping granularity levels**: op-level / layer-level / pass-level macro-steps | XOR on a 2-2-1 net ≈ 20–30 ops; MNIST MLP = thousands. Fixed op-granularity would make MNIST walkthrough unusable and lectures un-paceable | MED | Scenario format must group ops into phases (forward-L1, forward-L2, … backward-L2, update). Design into the scenario schema from the start; UI grouping rides on it |
| DF-9 | **PyTorch bridge**: per-step read-only "equivalent code" snippet (`loss.backward(); w1.grad` for *this* number) | Closes VP segment-1 "What After": «осознанный переход к PyTorch»; unique — converts the trainer into an on-ramp, not a toy | MED | Dual-use: NFR-02 already requires a micrograd/PyTorch reference harness — the parity fixtures generate the snippets. Nearly free content |
| DF-10 | **Embeddable widget / LMS iframe with URL params** | Market scan imperative #3: «проектировать под встраивание с первого дня» — embeds are the switching-cost moat for P2 (repeat semesters) | LOW–MED | Static app embeds cleanly; requires URL-state (TS-6) done right and discipline about localStorage in iframe contexts |
| DF-11 | **"Predict-then-reveal" micro-checks** — student commits a value/answer for the next number, then the step reveals it | Khan Academy hint-ladder pattern transplanted to numbers; embodies «тренажёр — спортзал» (D-06) vs passive explainers | MED | v1.x. Must be optional/mode-gated — interrupts lecture flow (conflict noted in dependencies) |
| DF-12 | **Share-this-step permalink + step-as-image export** | Students paste into Discord/forum/Piazza; teachers into slides; each share is PLG distribution | LOW | Rides on TS-6 serialization + canvas snapshot. High leverage per cost |
| DF-13 | **RU-language interactive backprop trainer (first-mover)** | Geo-fragmentation + Habr/вуз distribution (O6, D-10); EN incumbents don't serve RU; RU niche for *interactive* backprop is empty | LOW–MED (on TS-14 base) | Content-localization cost is the annotations (DF-5), not the UI |

### Anti-Features (Commonly Requested, Often Problematic)

Deliberately NOT built. Each row is a scope-creep vector the landscape makes tempting — documented so it survives feature-brainstorm pressure. Aligned with PROJECT.md Out of Scope and DECISIONS.md.

| # | Feature | Why Requested | Why Problematic (for THIS product) | Alternative |
|---|---------|---------------|-----------------------------------|-------------|
| AF-1 | Network constructor (add/remove layers, tweak lr/activation/optimizer freely) | TF Playground made it the genre default; "everyone expects sliders" | Destroys scenario determinism (DOCS-05 repeatability), explodes the NFR-02 test matrix (100% op coverage per configuration), consumes the one-author budget, converts a *methodical walkthrough product* into a sandbox we'd lose to Playground's 10-year mindshare. Deferred to R2 by D-02 | Author-curated scenario *variants*: preset choices (e.g., XOR with tanh vs ReLU) selectable from the scenario card — fixed, tested, deterministic |
| AF-2 | CSV / dataset upload | "Let me train on my own data" | Data validation, determinism and testing surface explosion, privacy optics even client-side, and it serves P3 fully only in R2 (D-02). v1 value is in *curated* pedagogy | Curated scenarios only; R2 revisits with client-side-only processing |
| AF-3 | Accounts / registration (even "optional profile") | "Progress sync across devices", future monetization hook | Violates D-05/NFR-03 (100% sessions accountless), adds PII surface (152-ФЗ/GDPR, D-16), adds friction to the <1-min first-step metric. Link + localStorage covers v1 needs | URL state (TS-6) + localStorage (TS-10); server-side sync only behind a future B2B gate |
| AF-4 | Gamification: points, streaks, badges, leaderboards | Khan Academy pattern; "engagement" | Wrong persona signal for P2 (professor tool credibility), wasted on naturally one-shot audience (W4: «разовая аудитория»); North Star is completions, not engagement mechanics | Completion marks + progression display (DOCS-03) — status, not points |
| AF-5 | Embedded code editor / user-executable code in product | "Let them tweak the code" — ConvNetJS heritage | Security surface (eval), moderation, testing burden, scope; ConvNetJS shows where code-first browser DL ends (unmaintained). Conflicts with zero-install trust | DF-9 read-only PyTorch bridge: show code, don't run user code |
| AF-6 | Built-in LLM chat ("ask about this step") | 2026 reflex; T1 says LLMs explain on demand | Violates NFR-03 (per-user server cost ≠ 0), external dependency in a zero-cost architecture, and contradicts positioning D-06: «бот — учебник, тренажёр — спортзал». If the chat explains the step, the trainer failed | Curated per-step FAQ/confusion notes in annotations (DF-5); the *numbers* are the answer |
| AF-7 | Generic ML course content, video lessons, "learn ML here" hub | Growth tempting; content SEO | Explicitly out of scope («курс по ML целиком»); retention-driven scope creep away from walkthrough excellence; 3B1B/Khan own that space | Stay a widget that *courses embed* (DF-10); scenario library grows topically, not horizontally |
| AF-8 | Server-side compute / cloud training / GPU | "Bigger models, real datasets" | Violates NFR-03 zero-cost architecture and D-03/D-05; MNIST is the v1 ceiling by design — производительность важнее наглядности is someone else's product | Client JS/WASM; performance headroom spent on step <100 ms (NFR-01), not model scale |
| AF-9 | Architectures beyond MLP in v1 (CNN/RNN/attention) | Landscape envy: CNN Explainer, Transformer Explainer own those visually | D-04: depth-first on backprop mechanics; op-count explosion breaks walkthrough UX; those incumbents are excellent — no reason to fight them | R2+: new *scenario topics* (attention walkthrough) only after depth is validated |
| AF-10 | Real-time multi-user classrooms / collaborative sessions | "Teacher drives, students follow live" | Requires servers, accounts, sync — the entire cost model inverts for a feature H2 hasn't validated | Near-equivalent via shared URL state: teacher projects, students open same link and step along; embed in LMS |
| AF-11 | Certificates / completion credentials | Perceived B2C value | Implies identity + assessment integrity we don't want to own; attracts cheating-prevention scope | Completion summary only |
| AF-12 | Ads, data sale, B2C paywall | Revenue pressure on a free product | Closed doors D-16; ads destroy educational-product trust; segment expects free (T5) | Value-based tiered B2B option gated behind R2 metrics (D-08, D-13) |
| AF-13 | Full mobile parity for graph drill-down | "Responsive means everything everywhere" | Cost trap: interactive graph + 4-panel drill-down on 360px is a research project serving the *review* use case poorly and the *first-run* case not at all | TS-13 tiering: phone = numbers-first step list; tablet+ = full experience |

---

## Feature Dependencies

```
[Deterministic scenario format (fixed weights, op phases)]
    └──enables──> [Pure replayable step-engine: state = f(seed, opIndex)]
                       ├──enables──> [DF-1 Per-op numbers panel (both passes)]
                       │                ├──enables──> [DF-2 Backward as execution mode]
                       │                ├──enhances──> [DF-9 PyTorch snippet bridge]  (dual-use w/ NFR-02 harness)
                       │                └──enables──> [DF-11 Predict-then-reveal]
                       ├──enables──> [DF-3 Drill-down diagram→layer→op→number]
                       │                └──enables──> [DF-4 Gradient provenance/tracing]
                       ├──enables──> [TS-3 Step-back]  (free via opIndex decrement)
                       └──enables──> [TS-4 Progress indicator], [TS-2 Step controls]

[TS-6 URL state serialization] ──requires──> [Deterministic scenario format]
        ├──enables──> [DF-6 Lecture mode reload-restore]
        ├──enables──> [DF-10 LMS embed/iframe]
        └──enables──> [DF-12 Share permalinks]

[TS-8 Keyboard nav] ──enhances──> [TS-2 Step controls] + [DF-6 Lecture mode]  (presenter remotes = arrow keys)

[DF-5 Scenario narrative annotations] ──requires──> [TS-14 i18n strings-as-data] (translation cost lives here)
[DF-7 Pre/post test] ──requires──> [TS-15 Anonymous analytics] + [TS-9 Completion events]
[DF-8 Granularity levels] ──requires──> [Scenario format with op→phase grouping] (schema decision, day one)
[TS-7 Offline after load] ──requires──> [static app, zero post-boot server calls] ──constrains──> [TS-15 analytics buffering]
[TS-13 Mobile numbers-first tier] ──requires──> [step panel decoupled from graph canvas] (layout architecture decision)

[DF-11 Predict-then-reveal] ──conflicts──> [DF-6 Lecture mode]   (interruptions break live pacing)
[AF-1 Network constructor] ──conflicts──> [TS-5 Determinism] + [DF-6 Lecture mode] + [NFR-02 test matrix]
```

### Dependency Notes

- **Pure-replay engine is the master decision.** If `state = f(seed, opIndex)` holds, step-back (TS-3), determinism (TS-5), URL state (TS-6), and lecture repeatability (DF-6) are all cheap consequences. If the engine is mutable, each of these becomes its own checkpoint/undo subsystem. Decide before any UI.
- **DF-1/DF-2/DF-3 share one engine build** — the autodiff tape with op metadata is the single HIGH-complexity investment; DF-3/DF-4 are UI layers over its graph. Don't sequence them as separate subsystems.
- **Scenario format must encode op→phase grouping from day one** (DF-8), or MNIST walkthrough (DOCS-03) will require a breaking schema migration later.
- **TS-14 string extraction must precede DF-5 content at scale** — the annotations (not UI chrome) carry the localization cost; extracting strings after writing 3 scenarios of RU annotations doubles the work for EN.
- **NFR-02 parity harness dual-feeds DF-9**: the micrograd/PyTorch reference fixtures that verify gradients can render as the "equivalent code" snippets. Budget them together.
- **DF-11 (predict-then-reveal) conflicts with DF-6 (lecture mode)** — mode-gate it: off by default in presentation density, opt-in for self-study.
- **AF-1 (constructor) structurally conflicts with TS-5 + DF-6 + NFR-02** — this is *why* it's R2, not merely a scope cut: it invalidates three shipped guarantees.

---

## MVP Definition

### Launch With (v1)

MVP per D-18 = the first block (XOR only, to full walkthrough). Remaining items complete v1 for pilots/public launch. Staged to keep the one-author budget honest.

**MVP core (D-18 — validates DOCS-01/02, feeds H3 usability test):**
- [ ] Pure replayable step-engine + deterministic scenario format with phase grouping — foundation everything else hangs on (DF-1/DF-8 infra)
- [ ] Per-op numbers panel, forward AND backward pass, XOR scenario complete walkthrough (DF-1, DF-2; DOCS-01)
- [ ] Drill-down architecture → layer → op → number → formula + provenance, incl. graph-boundary edge case (DF-3/DF-4; DOCS-02)
- [ ] Step controls: forward / back / reset / run-to-pass + keyboard nav (TS-2/TS-3/TS-8)
- [ ] Progress indicator «step N of M» + pass-phase marker (TS-4)
- [ ] Number hygiene + colorblind-safe encodings (TS-12) — trust is existential (NFR-02)
- [ ] Zero-install static app, first step < 1 min (TS-1; DOCS-04)

**v1 full (pilots + public launch):**
- [ ] Scenario library XOR → spiral → MNIST + per-step narrative annotations (DF-5; DOCS-03) — staged: spiral, then MNIST
- [ ] URL state: shareable, reload-surviving (TS-6; DOCS-04/05)
- [ ] Lecture mode composition: presentation density + keyboard-only + determinism (DF-6; DOCS-05)
- [ ] Pre/post skippable test + anonymous analytics incl. North Star completion events (DF-7 + TS-15; DOCS-06) — required to measure H1 in pilots
- [ ] Offline after load (TS-7)
- [ ] localStorage completion marks (TS-10)
- [ ] RU UI + i18n-ready strings (TS-14, RU portion)
- [ ] Mobile numbers-first tier (TS-13)
- [ ] Completion summary + next-scenario pointer (TS-9)

### Add After Validation (v1.x)

- [ ] Stepping granularity UI presets (op/layer/pass) — *after H3 usability reveals step-count fatigue; schema already supports it*
- [ ] PyTorch snippet bridge (DF-9) — *after first pilots; nearly free off NFR-02 harness*
- [ ] LMS embed / iframe param mode (DF-10) — *after first teacher pilot agrees (H2 ≥ 2)*
- [ ] Share-this-step permalinks + image export (DF-12) — *with first SEO/distribution push*
- [ ] Predict-then-reveal micro-checks (DF-11) — *if H1 gain < target, as comprehension booster*
- [ ] EN localization full (TS-14) — *after RU pilots; before EN expansion (D-10)*
- [ ] Accessibility audit pass (TS-16 formalization) — *before scale; basics live from v1*

### Future Consideration (v2+)

- [ ] Network constructor + CSV upload (AF-1/AF-2 → R2 by D-02) — *only after walkthrough excellence validated; redesign determinism story first*
- [ ] New scenario topics (gradient-descent deep dive, attention walkthrough) — *market scan diversification; after core loop proven*
- [ ] B2B LMS pack: assignment mode, teacher dashboard (AF-10 successor) — *gated behind R2 metrics (D-08/D-13)*
- [ ] P3 self-network diagnosis tools — *R2, serves switchers fully*

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Per-op numbers panel, both passes (DF-1/2) | HIGH | HIGH | P1 — MVP |
| Drill-down + number provenance (DF-3/4) | HIGH | HIGH | P1 — MVP |
| Pure replay engine + scenario format | HIGH (enabler) | HIGH | P1 — MVP (hidden, enables all) |
| Step controls + step-back + keyboard (TS-2/3/8) | HIGH | MED | P1 — MVP |
| Progress + phase indicator (TS-4) | MED | LOW | P1 — MVP |
| Deterministic scenarios (TS-5) | HIGH | LOW | P1 — MVP |
| Zero-install <1 min first step (TS-1) | HIGH | LOW | P1 — MVP |
| Number hygiene (TS-12) | MED (trust: existential) | LOW | P1 — MVP |
| Scenario library + annotations (DF-5) | HIGH | MED code / HIGH content | P1 — v1 (XOR→MNIST staged) |
| URL state (TS-6) | HIGH | MED | P1 — v1 |
| Lecture mode (DF-6) | HIGH (P2 gatekeepers) | MED | P1 — v1 |
| Pre/post test + analytics (DF-7/TS-15) | HIGH (H1 instrument) | MED | P1 — v1 |
| Offline after load (TS-7) | MED | LOW | P1 — v1 |
| Completion summary/next scenario (TS-9) | MED | LOW | P1 — v1 |
| RU UI + i18n extraction (TS-14) | MED (RU market: HIGH) | MED | P1 — v1 (extraction day one) |
| localStorage progress (TS-10) | LOW–MED | LOW | P2 — v1 |
| Mobile numbers-first tier (TS-13) | MED | MED | P2 — v1 |
| Hover tooltips (TS-11) | MED | MED | P2 — v1.x (drill-down tier reuse) |
| Granularity presets (DF-8) | HIGH | MED | P2 — v1.x (schema P1) |
| PyTorch snippet bridge (DF-9) | MED | MED | P2 — v1.x |
| LMS embed (DF-10) | MED (moat) | LOW–MED | P2 — v1.x |
| Share permalinks + image (DF-12) | MED | LOW | P2 — v1.x |
| Accessibility pass (TS-16) | MED | MED | P2 — v1.x |
| Predict-then-reveal (DF-11) | MED | MED | P3 — post-H1 |
| EN full localization | MED | MED (content) | P3 — pre-EN-expansion |
| Constructor + CSV (AF-1/2) | HIGH for P3 | HIGH | R2 — deferred by D-02 |

---

## Competitor Feature Analysis

| Feature | TF Playground | Passive explainers (3B1B; Mazur post) | Code-first (micrograd, notebooks, PyTorch hooks + torchviz) | Interactive explainers (MLU-Explain; poloclub CNN/Transformer Explainer) | Khan Academy | **Our v1 approach** |
|---------|---------------|----------------------------------------|--------------------------------------------------------------|---------------------------------------------------------------------------|--------------|---------------------|
| Stepwise execution of training | Epoch-level step only | ❌ (video; static post) | Manual (write/execute code) | Partial (MLU widgets step concepts, not computation) | ✅ (exercises) | **Op-level + layer/pass macro-steps** |
| Backward pass visible | ❌ (result only) | ✅ explained, not executable | ✅ but via `.backward()` abstraction or hand-derivation | ❌ | n/a | **First-class executable mode** |
| Per-operation numbers | ❌ | Mazur: ✅ static; 3B1B: selected | ✅ via hooks/print — high friction | ❌ | n/a | **Every op, both passes, clickable** |
| Computation-graph drill-down | ❌ (network diagram ≠ compute graph) | ❌ | torchviz: expert-only static graph | CNN Explainer: forward-only overview+detail | n/a | **Diagram→layer→op→number→formula+provenance** |
| Pedagogical narrative | ❌ (sandbox, no story) | ✅✅ (the gold standard) | Partial (nn-zero-to-hero videos) | ✅✅ (essays with embedded widgets) | ✅ (mastery units) | Per-step annotations + scenario progression (content moat) |
| Scenario library/progression | 4 toy datasets, no progression | n/a | n/a | Fixed essays, no progression | ✅ | XOR→spiral→MNIST, suggested order, no gating |
| Shareable URL state | ✅ (config in hash) | Links only | n/a | Links only | Account-bound | **Scenario+step+view in URL; reload-surviving** |
| Offline after load | Implicit | Video streams | n/a (local envs) | Static site ✅ | App offline ✅ | Explicit requirement (lecture edge case) |
| Lecture/presentation mode | Used ad-hoc, not designed for | Passive screening | ❌ | ❌ | ❌ | Designed-for: determinism + projector density + remote-friendly keys |
| Built-in understanding measurement | ❌ | ❌ | ❌ | ❌ (CNN Explainer: feedback survey only) | ✅ mastery quizzes (not pre/post deltas) | Skippable pre/post + anonymous aggregate (H1) |
| Free construction (net/data) | ✅✅ (its core) | ❌ | ✅ (any code) | ❌ | n/a | Deliberately ❌ v1 → R2 (AF-1/2) |
| Accounts required | ❌ | ❌ | n/a | ❌ | ✅ for progress | ❌ forever for free tier |
| Mobile | Desktop-oriented | ✅ (video) | ❌ | ✅ responsive | ✅✅ | Tiered: numbers-first phone tier |
| i18n | ❌ (EN) | Partial (community subs) | n/a | Partial (MLU: some translations) | ✅ many languages | RU first, EN next (beachhead D-10) |

**Key read:** every competitor maxes 1–2 cells of the left block of our value curve (docs/02); the product wins only while the *combination* — stepwise backward + per-op numbers + graph drill-down + zero threshold — stays coherent. Any anti-feature adopted (AF-1..AF-13) trades combination-coherence for a single-cell fight against an incumbent who owns that cell.

---

## Sources

**Landscape products analyzed (knowledge-based, spot-checked 2026-11-02 against docs/03):**
- TensorFlow Playground (playground.tensorflow.org) — genre-defining sandbox; epoch-level stepping, URL state, no backward visibility
- 3Blue1Brown neural-network series + calculus of backprop — narrative gold standard; passive
- Matt Mazur, "A Step by Step Backpropagation Example" — the static per-number walkthrough; canonical SEO proof of demand for our core feature
- micrograd + Karpathy nn-zero-to-hero ("The spelled-out intro...") — the code-first version of our JTBD; Value-graph/topo-sort pattern informs engine design
- ConvNetJS — cautionary tale: browser DL as code-first sandbox, unmaintained
- distill.pub (incl. "Why Momentum Really Works") — interactive-article pattern; frozen
- MLU-Explain (Amazon) — interactive essays; SGD/batch-norm math visualizations; multilingual precedent
- poloclub: CNN Explainer, GAN Lab, Transformer Explainer — overview+detail drill-down pattern, responsive standards, feedback-survey pattern
- torchviz + PyTorch hooks (`register_backward_hook`, `retain_grad`, anomaly mode) — the expert manual workflow we productize for beginners
- Khan Academy exercise system — hint ladder, mastery progression, teacher assignment (B2B2C analog)
- Michael Nielsen, "Neural Networks and Deep Learning" — early interactive-book tradition (verify current hosting)
- mladdict.com/backpropagation — niche stepwise forward/backward MLP demo; closest known analog (LOW-MEDIUM confidence in current state; **verify before launch** — SEO gap analysis should include it)

**Internal strategy documents (authoritative for scope):**
- `.planning/PROJECT.md` — goals, Out of Scope, constraints, key decisions D-02..D-18
- `REQUIREMENTS.md` — DOCS-01..06 + NFR-01..03 (validated/challenged per feature above)
- `docs/02-value-proposition.md` — value curve defining the differentiation block
- `docs/03-market-scan.md` — competitive field verified 2026-11-02; moat thesis (content/SEO/embeds)

---
*Feature research for: interactive browser-based backpropagation trainer (educational ML visualization)*
*Researched: 2026-11-02*
