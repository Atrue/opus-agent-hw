---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
plan: "04"
subsystem: infra
tags: [refactoring, architecture, declarative-spec, autodiff]

requires:
  - phase: 02-03
    provides: чистые функции градиентов Value/Tensor (BackwardPlan) — база walked-оп
  - phase: 02-07
    provides: сплит run-модуля (trainingRun/stepRecords/types) — точки обобщения
provides:
  - D-30 выполнен: ScenarioModel (net/loss/lr/samples/startWeights/ops/render) — единственный источник топологии, формул, нарративов и рендер-меток
  - buildModel(spec) → ScenarioNet (params() без входов) + buildWalk (walked-опы из топологии)
  - buildStepRecord собирается из opMeta спека (генерическая, без сценарного switch)
  - spec.render ведёт всю визуализацию: формула-строка, граф (узлы/рёбра/группы), звенья цепи, серии истории
affects: [02-05 (нейрон-носитель = добавление данных), 02-09 (e2e), фаза 3 (XOR-MLP подключается данными)]

actuals:
  tokens: 58000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "сценарий = декларативная модель → граф → рендер-метки (D-30)"
    - "NodeBinding — декларативные живые числа узлов (гейт done[step])"

key-files:
  created: []
  modified:
    - src/run/scenario.ts — ScenarioModel/ScenarioRender + XOR-спец (formula-токены, layerSymbols, nodes/edges/stepGroups/segments/series)
    - src/tensor/model.ts — LayerSpec/ModelSpec/ForwardTensors/ScenarioNet/buildModel (MLP удалён)
    - src/tensor/trace.ts — WalkOp/buildWalk; SampleCursor на walked-опах; SampleTensors zPre/zPost/h/L
    - src/run/stepRecords.ts — генерическая buildStepRecord из opMeta + walked-опы
    - src/run/trainingRun.ts — TrainingRun(spec: ScenarioModel); лосс/bce-границы по walk-киндам
    - src/ui/compGraph.ts, src/ui/chainLinks.ts, src/ui/ComputationGraph.tsx, src/ui/FormulaStrip.tsx, src/ui/LinkPanel.tsx, src/ui/hintData.ts — чтение spec.render
    - src/run/history.ts — серии из series.node/weight/defaultSymbol

key-decisions:
  - "dot-биндинг воспроизводит live-пересчёт W·x узлов W1x/W2a1 (бит-идентичность дисплея, включая пост-sgd пересчёт живых весов)"
  - "startWeights — ключи w1/b1… (1-based слой) в Record; XOR_START_WEIGHTS — узкая типизация для тестов"
  - "STEP_INDEX удалён: индекс шага = record.index (identity-мапа не нужна)"
  - "changed-маркеры выводятся из символов (ŷ→yhat, ∂L/∂X→dX) — правило = normalizeSym UI"

patterns-established:
  - "Смена носителя-сценария = добавление данных ScenarioModel, не новый UI-слой"

requirements-completed: [DOCS-01, DOCS-02]

coverage:
  - id: D1
    description: "ScenarioModel + buildModel существуют; XOR — данные в форме ScenarioModel; params() возвращает только параметры"
    requirement: DOCS-02
    verification:
      - kind: unit
        ref: "SPEC-CORE-PRESENT (interface ScenarioModel + buildModel); pnpm test 101 passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Курсор исполняет walked-опы спека; записи шагов из opMeta; etalon-тест зелёный без правки эталон-констант; XOR-числа бит-идентичны"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "src/run/etalon.test.ts (формулы/нарративы строкой, числа ≤1e-6 — константы не правились)"
        status: pass
      - kind: e2e
        ref: "pnpm e2e 11 passed (проверка 1: z1[0] = −0.9229); двойной прогон бит-идентичен"
        status: pass
    human_judgment: false
  - id: D3
    description: "UI читает spec.render: формула, узлы/рёбра графа, звенья цепи, серии истории — литеральных XOR-таблиц в src/ui нет"
    requirement: DOCS-02
    verification:
      - kind: unit
        ref: "UI-FROM-SPEC (rg NODE_SEEDS/W2·tanh → пусто); compGraph.test + chainLinks.test зелёные без ослабления"
        status: pass
    human_judgment: false
  - id: D4
    description: "Drill-down путь сохранён на специфицированном графе (DOCS-02 edge): панель первого слоя показывает входные данные/старт цепного правила"
    requirement: DOCS-02
    verification:
      - kind: unit
        ref: "src/tensor/expanders.test.ts (1e-12, 27 тестов) — не изменялись, зелёные"
        status: pass
      - kind: e2e
        ref: "e2e проверка 1 (drill-panel) и 8 (drill по биасу) зелёные"
        status: pass
    human_judgment: false

duration: 42 min
completed: 2026-11-12
status: complete
---

# Phase 02 Plan 04: ScenarioModel → граф → рендер-метки Summary

**D-30 доказан end-to-end трейсером: сценарий = декларативная модель (ScenarioModel/render) порождает граф (buildModel+walked-опы), записи шагов (buildStepRecord из opMeta) и всю визуализацию (spec.render) — XOR-носитель бит-идентичен (etalon без правки констант, e2e двойной прогон бит-идентичен).**

## Performance

- **Duration:** 42 min
- **Started:** 2026-11-12T21:17:10Z
- **Completed:** 2026-11-12T21:59:40Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Task 1 (tracer): ScenarioModel → buildModel(spec) → SampleCursor на walked-опах → buildStepRecord из opMeta → FormulaStrip из spec.render — один путь через все слои, MLP/OPS_PER_SAMPLE удалены, OPS per-scenario
- Task 2 (expansion): compGraph/chainLinks/history/ComputationGraph/LinkPanel/hintData читают spec.render; NodeBinding (input/target/weight/bias/tensor/dot) заменяет switch-таблицы живых чисел; клики узлов — данные
- Бит-идентичность: dot-биндинг воспроизводит live-пересчёт W·x (узлы W1x/W2a1), provenance-индексы выведены из топологии buildWalk и совпали со старым switch

## Task Commits

1. **Task 1 (tracer): ScenarioModel → buildModel → курсор → шаги → формула** - `1aa3af4` (refactor)
2. **Task 2: spec.render ведёт UI-таблицы** - `be3b925` (refactor)

## Files Created/Modified
- `src/run/scenario.ts` — интерфейсы + полный XOR render-инвентарь (43 узла/66 рёбер/13 stepGroups/7 звеньев/серии)
- `src/tensor/model.ts` — buildModel/ScenarioNet/LayerSpec; `src/tensor/trace.ts` — WalkOp/buildWalk/курсор
- `src/run/stepRecords.ts` — генерическая сборка; `src/run/trainingRun.ts` — spec-driven
- `src/ui/{compGraph,chainLinks}.ts` — тонкие построители над спеком; `ComputationGraph.tsx` — биндинги; `FormulaStrip.tsx` — токены; `LinkPanel.tsx`, `hintData.ts` — layerSymbols
- `src/run/history.ts` — серии из спека; тесты etalon/invariants/trainingRun/history/expanders — под ScenarioNet

## Decisions Made
- dot-биндинг сохраняет live-пересчёт W·x (бит-идентичность дисплея, включая пересчёт живых весов после sgd)
- STEP_INDEX удалён — record.index идентичен (identity-мапа); updateActive по длине stepGroups
- changed-маркеры выводятся из символов спека (правило = normalizeSym UI) — таблица маркеров не нужна

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None существенных: промежуточные ходы ловили dangling-ссылки (MLP-импорт в expanders.test, t.yhat в execOp) до коммитов — гейт pnpm test после каждого хода отработал как задумано

## User Setup Required
None

## Next Phase Readiness
- 02-05 (сценарий «один нейрон») = добавление данных NEURON_SCENARIO: спецификация уже не требует нового UI-слоя (кроме SampleRecord-полей и hint-раскрытий — носитель 02-05)
- SegmentId = string; LinkSelection следует за спеком

---
*Phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone*
*Completed: 2026-11-12*
