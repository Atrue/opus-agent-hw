---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
plan: "06"
subsystem: product
tags: [d-32, loss-off-graph, docs-sync, decisions, glossary]

requires:
  - phase: 02-09
    provides: NFR-02 на neuron (эталон/gradcheck/инварианты) — страховка, что D-32 не задел расчёты
provides:
  - D-32 исполнен — лосс и y-узел вне графа (оба сценария), группы звена L/loss-шагов на ŷ, канва сужена, dangling-id гейт T-2-10
  - DECISIONS.md D-27..D-33 (раздел «Инженерные стандарты фазы 02») с супрессиями и решениями планировщика
  - AGENTS.md постоянное правило апрува линтера; PROJECT.md глоссарий фазы (+7 терминов)
  - DESIGN.md §9/§9a синхронизированы с D-32
affects: [фаза 3 (XOR-MLP по ScenarioModel-механике, граф без лосса — норма для всех сценариев), /gsd-verify-work 02]

actuals:
  tokens: 42000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "D-32 = чистая правка данных spec.render: ни один компонент графа не знает про loss-узел (UI-FROM-SPEC 02-04 окупился)"
    - "dangling-id юнит-гейт делает забытую ссылку на удалённый узел красным тестом, а не молчаливым «н/д» на экране"

key-files:
  created: []
  modified:
    - src/run/scenario.ts — render обоих сценариев без op:bce/L/y[0]; группы L→ŷ; канва уже (update col 14/8)
    - src/ui/ComputationGraph.tsx — aria-label без y/лосса; OP_LABEL_RADIUS без BCE; doc-заголовок D-32
    - src/ui/compGraph.test.ts — инвентарь 40/12; dangling-id гейт; ранги входы→ŷ→update
    - e2e/smoke.spec.ts — тест 13: 11 станций, звено L символом формулы подсвечивает ŷ
    - DECISIONS.md, AGENTS.md, .planning/PROJECT.md, DESIGN.md — docs-sync

key-decisions:
  - "symbolNodes звена L = {} — подсветка группы ['ŷ'] (geometryOf fallback), точечные подмножества y/L не нужны без узлов"
  - "DESIGN.md §9/§9a обновлены сверх files_modified плана (девиация Rule 2): контракт графа не должен противоречить D-32"

patterns-established:
  - "Удаление узла из графа = правка данных спека + dangling-id гейт; рендер следует сам"

requirements-completed: [DOCS-02]

coverage:
  - id: D1
    description: "Лосс исключён из визуализации графа для ЛЮБОГО сценария: loss-узел и y отсутствуют в spec.render обоих сценариев; LOSS-OFF-GRAPH"
    requirement: DOCS-02
    verification:
      - kind: command
        ref: "test -z \"$(rg -l 'op:bce' src e2e)\" → LOSS-OFF-GRAPH"
        status: pass
      - kind: unit
        ref: "compGraph.test: инвентарь XOR 40 / neuron 12, константы без y, computed без L; pnpm test 121 passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Лосс полноправен в расчётах (D-26 жив): панель звена L, формула-строка, график лосса, экран эпохи, forward/backward-числа лосса; эталон/инварианты не тронуты"
    requirement: DOCS-02
    verification:
      - kind: e2e
        ref: "e2e 2) экран эпохи L до/после, 3) FF-эквивалентность, 11) звено L по символу, 12) история лосса, 13) панель звена L + подсветка ŷ, 16) ŷ/L — 16 passed"
        status: pass
      - kind: unit
        ref: "etalon/invariants без правок — 121 юнит зелёные (лосс считается как раньше)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Геометрия пересчитана из данных; ссылки групп целостны — каждый id групп звеньев/шагов/symbolNodes существует (dangling-id гейт)"
    requirement: DOCS-02
    verification:
      - kind: unit
        ref: "compGraph.test dangling-id тест (XOR + neuron) — pass; ранги входы→ŷ→update"
        status: pass
    human_judgment: false
  - id: D4
    description: "e2e очищен от loss-селекторов графа; baseline регенерирован; двойной прогон бит-идентичен; pnpm test && lint && e2e зелёные"
    requirement: DOCS-02
    verification:
      - kind: e2e
        ref: "16 passed дважды; diff baseline → BIT-IDENTICAL (18 файлов)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Документы синхронизированы: D-27..D-33 в DECISIONS.md (DECISIONS-JOURNALED), правило линтера в AGENTS.md (LINT-APPROVAL-RULE), глоссарий PROJECT.md (GLOSSARY-UPDATED); NFR-02 путь актуален"
    requirement: DOCS-02
    verification:
      - kind: command
        ref: "все три гейта-строки выведены; pnpm test && pnpm lint зелёные"
        status: pass
    human_judgment: false

duration: 22 min
completed: 2026-11-13
status: complete
---

# Phase 02 Plan 06: D-32 loss-off-graph + docs-sync Summary

**Граф = сеть, лосс = числа: loss-узел и y-узел ушли из spec.render обоих сценариев (правка только данных — UI-FROM-SPEC из 02-04 окупился), звено L читается через ŷ, dangling-id гейт страхует целостность групп; все решения фазы D-27..D-33 журнализированы, правило апрува линтера — постоянное в AGENTS.md.**

## Performance

- **Duration:** 22 min
- **Tasks:** 2
- **Files modified:** 8
- **Commits:** 1e710dd (Task 1), 71cb059 (Task 2)

## Accomplishments
- Task 1 (D-32): spec.render neuron/XOR без op:bce/L/y[0] и рёбер к bce; группы звена L → ['ŷ'] (symbolNodes {} — fallback группы), loss-шаговые группы → ['ŷ']; update-станция сдвинута (col 16→14 XOR, 10→8 neuron — канва сужена из данных); aria-label svg без y/BCE; dangling-id юнит-гейт T-2-10 (сегменты/шаги/symbolNodes); e2e 13 переписан (11 станций; звено L — символом формулы с проверкой подсветки ŷ); baseline 18 двойной прогон бит-идентичен
- Task 2 (docs-sync): DECISIONS.md +7 записей D-27..D-33 (формат журнала, супрессии: airbnb-формулировка D-27, D-18 в D-31; решения планировщика: A4-состав, OQ1 etalon-путь, OQ2 y-узел, OQ5 XOR-регрессия); AGENTS.md правило №6 апрува линтера (дословно, гейт-литерал); PROJECT.md — MVP R1/D-31, Correctness, Key Decisions строка, глоссарий +7 терминов и актуализация (MLP→buildModel/ScenarioNet, window.__run→DevTools-сниппет, цепи обоих сценариев); DESIGN.md §9/§9a — 40 звеньев, без BCE/y

## Task Commits

1. **Task 1: D-32 — loss-узел и y с графа; группы → ŷ; канва; e2e/baseline** - `1e710dd` (feat)
2. **Task 2: docs-sync D-27..D-33 + AGENTS + PROJECT + DESIGN** - `71cb059` (docs)

## Files Created/Modified
- `src/run/scenario.ts`, `src/ui/ComputationGraph.tsx`, `src/ui/compGraph.test.ts`, `e2e/smoke.spec.ts`
- `DECISIONS.md`, `AGENTS.md`, `.planning/PROJECT.md`, `DESIGN.md`

## Decisions Made
- symbolNodes звена L = {}: geometryOf-fallback подсвечивает группу ['ŷ'] — точечные подмножества y/L не нужны без узлов
- NodeBinding kind 'target' оставлен в типе (метка y живёт в панели звена L/результате через layerSymbols), удалена только неиспользуемая фабрика tgt

## Deviations from Plan
- **[Rule 2 — Doc consistency] DESIGN.md §9/§9a обновлены сверх files_modified плана** — Found during: Task 2 | §9a описывал 43 звена с BCE/y на графе и ранги до L=15/update=16 — прямое противоречие исполненному D-32; будущие фазы читают §9a как контракт графа | Fix: 40 звеньев, константы без y, операции без BCE, ранги ŷ=13/update=14, note о D-32 в §9 | Files: DESIGN.md | Verification: rg BCE/y-узлы в §9a чисто | Commit: 71cb059
- Правило линтера добавлено №6 (план говорил «пятое») — с момента планирования добавилось правило dangerouslySetInnerHTML; формулировка дословная, гейт-литерал «Конфиг линтера» совпадает

**Total deviations:** 1 auto-fixed (doc-consistency) + 1 нумерационная. **Impact:** нулевой на код; документы не противоречат реализации.

## Issues Encountered
None

## User Setup Required
None

## Next Phase Readiness
- Фаза 02: 9/9 планов исполнены — готова к `/gsd-verify-work 02` (критерии 1–4 ROADMAP: пошаговый walkthrough DOCS-01 ✓, drill-down DOCS-02 ✓, UX-02 клавиатура ✓, NFR-01/02 структурно ✓)
- Фаза 3 подключает XOR-MLP данными ScenarioModel (без нового UI-слоя) на граф без лосса (D-32 — норма для всех сценариев)

---
*Phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone*
*Completed: 2026-11-13*
