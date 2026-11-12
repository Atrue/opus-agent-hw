---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
plan: "07"
subsystem: infra
tags: [refactoring, module-split, react, useSyncExternalStore]

requires:
  - phase: 02-02
    provides: колокация тестов в src/** (финальные пути тестов run-модуля)
provides:
  - run-модуль из 5 файлов по границам ответственности (types/stepRecords/trainingRun/run/useRunSlice)
  - D-33 выполнен — ноль собственных window-полей состояния
  - src/run/README.md с публичной поверхностью и DevTools-сниппетом dynamic import
affects: [02-04 (ScenarioModel поверх сплита), 02-08 (README остальных модулей)]

actuals:
  tokens: 26000
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "strangler-fig сплит с pnpm test после каждого файлового хода"

key-files:
  created:
    - src/run/types.ts
    - src/run/stepRecords.ts
    - src/run/trainingRun.ts
    - src/run/run.ts
    - src/run/useRunSlice.ts
    - src/run/README.md
  modified:
    - src/ui/*.tsx (14 импортёров) + src/ui/hintData.ts
    - src/run/history.ts, src/run/history.test.ts, src/run/etalon.test.ts, src/run/invariants.test.ts
    - src/run/runState.test.ts → src/run/trainingRun.test.ts (git mv)

key-decisions:
  - "runState.test.ts → trainingRun.test.ts одним файлом: все 4 describe — субъект TrainingRun (курсор/selection/эпохи/история), распределения по другим субъектам не потребовалось"
  - "flatWeights/firstOpValue экспортированы из stepRecords.ts: trainingRun.ts использует их для записи истории и ленты шагов (A6 — единая связная ответственность)"

patterns-established:
  - "Модуль run = 5 файлов + README + колоцированные тесты; событийный корень Set-listeners + version-счётчик сохранён дословно"

requirements-completed: [DOCS-01]

coverage:
  - id: D1
    description: "runState.ts (549 строк) разделён на 5 файлов по границам ответственности; поведение прогона не изменилось"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "pnpm test (101 passed — включая trainingRun.test.ts, invariants «пошагово = FF» бит-в-бит)"
        status: pass
      - kind: e2e
        ref: "pnpm e2e (11 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-33: собственные поля window.* для состояния отсутствуют; DevTools-замена — сниппет dynamic import в src/run/README.md"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "test -z \"$(rg -l '__run' src)\" → NO-WINDOW-RUN"
        status: pass
    human_judgment: false

duration: 6 min
completed: 2026-11-12
status: complete
---

# Phase 02 Plan 07: Сплит runState.ts + D-33 Summary

**run-модуль декомпозирован в 5 файлов по границам ответственности (D-28б), DevTools-поле window.__run удалено (D-33) с заменой на документированный dynamic-import-сниппет — без изменения поведения прогона (101 юнит + 11 e2e зелёные).**

## Performance

- **Duration:** 6 min
- **Started:** 2026-11-12T21:05:30Z
- **Completed:** 2026-11-12T21:11:12Z
- **Tasks:** 1
- **Files modified:** 23

## Accomplishments
- Сплит runState.ts → types.ts / stepRecords.ts / trainingRun.ts / run.ts / useRunSlice.ts по карте PATTERNS strangler-fig: pnpm test зелёный после каждого файлового хода
- D-33 выполнен: declare global-блок и присваивание window.__run удалены при рождении run.ts; в src ноль упоминаний; src/run/README.md документирует DevTools-сниппет `await import('/src/run/run.ts')` (A1)
- runState.test.ts → trainingRun.test.ts (git mv): импорты по субъектам ./trainingRun + ./types; импортёры UI (14 файлов + hintData.ts) и run-тесты переведены на прямые модули
- Циклы зависимостей проверены: trainingRun.ts → ../ui/chainLinks (SegmentId, как раньше), chainLinks → ../run/scenario — цикла нет

## Task Commits

Each task was committed atomically:

1. **Task 1: Сплит runState.ts → 5 файлов + удаление DevTools-поля window (D-28б, D-33)** - `67f0f08` (refactor)

**Plan metadata:** (see below)

## Files Created/Modified
- `src/run/types.ts` — типы модуля run + isSampleRecord (тип-файл, A6)
- `src/run/stepRecords.ts` — buildStepRecord, currentPhase, firstOpValue, flatWeights + PROV-хелперы
- `src/run/trainingRun.ts` — класс TrainingRun с newCursor-recorder, Set-listeners + version-счётчик
- `src/run/run.ts` — синглтон без window-полей (D-33)
- `src/run/useRunSlice.ts` — селекторный хук useSyncExternalStore (R4)
- `src/run/README.md` — политика прогона + публичная поверхность + DevTools-сниппет
- `src/run/runState.ts` — удалён (git rm); `runState.test.ts` → `trainingRun.test.ts`
- `src/ui/{App,ComputationGraph,FormulaStrip,LinkPanel,StepControls,LossChart,EpochSummary,LinkHistory,ResultPanel,StepperBand,ExamplesPanel,OperationPanel,NumberDrilldown}.tsx`, `src/ui/hintData.ts` — прямые импорты ./run / ./useRunSlice / ./types
- `src/run/history.ts`, `src/run/{history,etalon,invariants}.test.ts` — импорты из ./types / ./stepRecords

## Decisions Made
- runState.test.ts → trainingRun.test.ts одним файлом: все 4 describe тестируют субъект TrainingRun — распределения по stepRecords/types не потребовалось (импорты разведены по субъектам)
- flatWeights/firstOpValue экспортированы из stepRecords.ts (trainingRun пишет историю и ленту шагов через них) — A6 «файл единой связной ответственности»

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None (промежуточный ход 1 поймал забытый runtime-импорт MLP в runState-шиме — исправлен до коммита, гейт отработал как задумано)

## User Setup Required
None

## Next Phase Readiness
- run-слой готов к ScenarioModel (02-04): stepRecords/trainingRun — точки обобщения под спек
- README прочих модулей и именованные экспорты — 02-08 (волна 4)

---
*Phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone*
*Completed: 2026-11-12*
