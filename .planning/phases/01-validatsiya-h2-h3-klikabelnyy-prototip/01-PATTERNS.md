# Phase 1: Валидация H2/H3 — кликабельный прототип - Pattern Map

**Mapped:** 2026-11-02
**Files analyzed:** 20 (new; all greenfield)
**Analogs found:** 0 codebase analogs / 20 convention-doc matches

## Greenfield Statement

**В репозитории НЕТ кода приложения** — verified `git ls-files`: только `.claude/`, `.planning/`, root strategy docs (PRODUCT/REQUIREMENTS/DECISIONS/STATE/EVIDENCE.md, docs/). Кодовых аналогов не существует; CONVENTIONS.md и ARCHITECTURE-map в CLAUDE.md пусты («Will populate as patterns emerge»). **Pattern sources здесь — не код, а конвенционные документы**: `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md` (Patterns 1/3/4), `01-RESEARCH.md` (структура прототипа + готовые эскизы кода), `01-UI-SPEC.md` (токены/layout/interaction контракт), `01-CONTEXT.md` code_context. Код этой фазы сам становится эталоном для Phase 2+.

## File Classification

| New File | Role | Data Flow | Pattern Source (doc, not code) | Match |
|---|---|---|---|---|
| `vite.config.ts`, `tsconfig.json`, `package.json` (scaffold) | config | — | STACK.md (TS strict, Vite 8) + RESEARCH §4.3 | doc-exact |
| `src/player/types.ts` | model | transform | RESEARCH §3.6 (JSON-схема = источник типов) | doc-exact |
| `src/player/store.ts` | store | event-driven | RESEARCH §4.4 (готовый эскиз Zustand) + ARCHITECTURE.md:269 | doc-exact |
| `src/player/urlState.ts` | utility | transform | RESEARCH Code Examples (urlState, ~30 LOC) | doc-exact |
| `src/ui/App.tsx` | component | event-driven | UI-SPEC Interaction Contract (layout zones) | doc-exact |
| `src/ui/ArchitectureDiagram.tsx` | component | event-driven | UI-SPEC «SVG-диаграмма 2-3-1» + STACK.md SVG-first | doc-exact |
| `src/ui/StepPanel.tsx` | component | event-driven | UI-SPEC StepPanel (3–7 чисел) | doc-exact |
| `src/ui/NumberDrilldown.tsx` | component | event-driven | UI-SPEC NumberDrilldown + ARCHITECTURE.md Pattern 3 | doc-exact |
| `src/ui/StepControls.tsx` | component | event-driven | UI-SPEC Copywriting + Keyboard | doc-exact |
| `src/ui/NarrativeLine.tsx` | component | — | UI-SPEC Narrative (1–2 строки RU из JSON) | doc-exact |
| `src/data/xor-trace.json` | model (data) | file-I/O | RESEARCH §3.6 (схема v1, schemaVersion обязателен) | doc-exact |
| `src/format/numbers.ts` | utility | transform | UI-SPEC Number Format (.4g/.3e, U+2212) | doc-exact |
| `src/index.css` | config (styles) | — | UI-SPEC Color/Typography + RESEARCH §5.4 @theme-блок | doc-exact |
| `tools/reference/gen_mock_trace.py` | service (dev-time) | batch | RESEARCH §3.7 + Code Examples (эскиз ядра Value/backward) | doc-exact |
| `tests/player.test.ts` | test | — | RESEARCH §6.3 | doc-exact |
| `tests/urlState.test.ts` | test | — | RESEARCH §6.3 (round-trip) | doc-exact |
| `tests/trace-sanity.test.ts` | test | — | RESEARCH Code Examples (готовый эскиз) | doc-exact |
| `e2e/smoke.spec.ts` | test (e2e) | — | RESEARCH §6.2 (5 проверок) | doc-exact |
| `01-DESIGN-TOKENS.md` (phase dir) | doc deliverable | — | UI-SPEC (контракт поверх index.css) + RESEARCH §5 | doc-exact |
| Гайд H2 / протокол H3 / шаблоны EVIDENCE.md / go-no-go записи | doc/process | — | RESEARCH §1.2, §2, «Шаблоны записей» (не код — аналоги не нужны) | doc-exact |

## Pattern Assignments

### `src/player/store.ts` + весь UI — THE pattern of the phase

**Source:** `.planning/research/ARCHITECTURE.md:11` + Pattern 1 (lines 269–280) + `01-CONTEXT.md` code_context «Established Patterns»

> «The UI is a *pure player* over `(trace, stepIndex)`» (ARCHITECTURE.md:11)

```ts
// ARCHITECTURE.md:276-279 — «there is no "engine.step()" call anywhere in UI code»
const step = trace.steps[state.stepIndex];
render(<Panel title={step.title} values={step.outputs} grads={step.grads}
             position={`${state.stepIndex + 1} / ${trace.steps.length}`} />);
```

Конкретная реализация — готовый эскиз Zustand-store в `01-RESEARCH.md` §4.4 (lines 416–452): скопировать дословно (clamped next/prev/jumpTo, drill очищается при смене шага, derived selectors не хранятся). Числа в компонентах НЕ считаются — только форматирование.

### `src/data/xor-trace.json` + `tools/reference/gen_mock_trace.py`

**Source:** `01-RESEARCH.md` §3.6 (схема JSON: `schemaVersion`, `weights` как явные данные, `steps[]` с `phase/op/formula/narrative/inputs/outputs/grads/changed/provenance`), §3.3 (детерминизм: seed → явные веса → коммит; byte-stable `json.dump`), Code Examples (эскиз `Value`/`vadd`/`vtanh`/`backward` — micrograd-семантика, Python 3.9 stdlib-only). Поддерживающая конвенция ARCHITECTURE.md:140–142: «Initial weights are explicit data, not generated». Gradcheck в скрипте обязателен (§3.5).

### `src/ui/*` — layout, диаграмма, панели

**Source:** `01-UI-SPEC.md` Interaction Contract:
- Layout: «Main: 2 колонки — SVG-диаграмма 55% / StepPanel 45%, gap 32px (xl)»; header 56px / bottom bar 72px; «Слоты фиксированы: смена шага не меняет высоты зон».
- Диаграмма: слои x(2)→hidden(3)→ŷ(1); «Ребро: цвет = знак веса… толщина 1.5–4px линейно ∝ |w|»; активная op — accent-обводка 3px; клик → drill-down.
- StepPanel: «Формула шага с inline-подстановкой чисел… Жёсткие потолки: ≤7 ключевых чисел в дефолтном виде; ≤30 чисел на всём экране».
- Drilldown: «exact-repr + отформатированное значение + формула + provenance»; граница графа (шаг 12, ∂L/∂x) — терминальная панель с copy из Copywriting Contract, не пустота.
- Клавиатура: →/Space/PgDn → next; ←/PgUp → prev; Esc → close drill; focus-ring 2px #0072B2.

### `src/index.css` + `01-DESIGN-TOKENS.md`

**Source:** `01-RESEARCH.md` §5.4 — готовый `@theme`-блок (lines 497–518: `--color-neg: #D55E00` … `--num-size: 16px`, класс `.lecture` меняет только переменные) — скопировать, дополнив AA-вариантами текста из UI-SPEC A-4 (`#C24A00`/`#007A56`) и правилом «знак никогда не кодируется только цветом: явный минус U+2212 всегда + цвет». `01-DESIGN-TOKENS.md` — человекочитаемый контракт поверх index.css (роль → токен → HEX/размер → использование → контраст-расчёт WCAG AA).

### `src/format/numbers.ts`

**Source:** UI-SPEC Number Format: d3-format 3.1.2; ключевое число `.4g`; `|x| < 1e-3` → `.3e`; drill — exact repr из JSON; display-минус `−` U+2212 (в JSON остаётся ASCII `-`); `tabular-nums` везде. STACK.md: «Стандарт для научной нотации в JS» — не hand-roll (RESEARCH «Don't Hand-Roll»).

### `src/player/urlState.ts`

**Source:** `01-RESEARCH.md` Code Examples (lines 719–734) — готовые `parseHash`/`toHash` (clamp невалидных значений к дефолту), интеграция `history.replaceState` в подписке store, чтение hash при старте до первого рендера. Формат: `#step=N&mode=lecture`.

### Scaffold/config (`vite.config.ts`, `tsconfig.json`)

**Source:** `01-RESEARCH.md` §4.3 — команды `pnpm create vite@latest . --template react-ts` + deps; `vite.config.ts: plugins: [react(), tailwindcss()]` (пакет `@tailwindcss/vite`); tsconfig: `strict: true` + `exactOptionalPropertyTypes` (требование STACK.md). Версии — только из Standard Stack таблицы RESEARCH (vite 8.3.5, react 19.3.1, zustand 5.0.16, tailwind 4.3.3, @vitejs/plugin-react 6.1.2, vitest 5.0.5, playwright 1.64.1, d3-format 3.1.2).

### Тесты (`tests/*`, `e2e/smoke.spec.ts`)

**Source:** `01-RESEARCH.md` §6.2–6.3 + Code Examples — trace-sanity-тест дан дословно (schemaVersion=1, 14 шагов, фазы в порядке, нет NaN/Infinity); e2e — 5 проверок (первый шаг, полный проход, шаг назад с assert по мок-JSON, reload-restore, drill-down + граница графа). Запрет STACK.md: никаких snapshot-матчеров чисел.

## Shared Patterns

### 1. State = f(trace, stepIndex); persistence stores only an index
**Source:** ARCHITECTURE.md:11, 269–273; 01-CONTEXT.md code_context. Persistence = hash URL `#step=N&mode=lecture` (только индекс + режим, никаких вычисленных состояний); reload восстанавливает шаг; step-back = `stepIndex - 1`. **Единственный паттерн, обязательный с первого дня** — Phase 2 подменит источник trace (мок-JSON → живой RunTrace движка) без правок UI.

### 2. Provenance в данных, не в коде (ARCHITECTURE.md Pattern 3)
Каждое число в JSON несёт `provenance` («шаг 3 (tanh)», «вес, инициализация (seed 42)») — drill-down = чистый data lookup.

### 3. Number hygiene (кросс-файльно)
Полный repr в JSON (без округления — Pitfall 10), форматирование только в `format/numbers.ts`; одна нотация D-06 во всех строках (генератор + UI-хром); RU-текст, англ. термины.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| все 20 файлов | все | Кодовой базы нет (greenfield) — planner использует приведённые doc-источники и эскизы RESEARCH вместо кодовых аналогов |

## Metadata

**Analog search scope:** `git ls-files` (весь репо), `.planning/` (research + phase docs)
**Files scanned:** 6 docs (STACK/ARCHITECTURE/CONTEXT/RESEARCH/UI-SPEC + grep SUMMARY)
**Pattern extraction date:** 2026-11-02
