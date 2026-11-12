---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
plan: "03"
subsystem: testing
tags: [autodiff, refactoring, pure-functions, backward-plan, bit-identity]

requires:
  - phase: 02-02
    provides: колоцированные тесты в src/** (etalon 1e-6, invariants бит-в-бит, expanders 1e-12), строгий oxlint (D-27)
provides:
  - src/tensor/value-grads.ts — 8 чистых функций локального градиента Value-оп (add/sub/mul/div/neg/tanh/sigmoid/log), JSDoc-формулы
  - Value без замыканий: op-методы пишут только данные; метод runBackward умножает чистые локальные градиенты на входящий grad и аккумулирует (порядок эффектов родитель A → B сохранён)
  - Tensor без замыканий: op-дескриптор BackwardPlan (tagged union) + чистый диспетчер runBackwardPlan; F.bce строит план через конструктор (TensorInit.plan)
  - Механизм замыканий градиента удалён полностью: setBackward/defineBackward/backwardFn — 0 вхождений в src/tensor
affects: [02-04 (ScenarioModel переиспользует чистые ядра), 02-06 (журнализация D-29)]

actuals:
  tokens: 4900
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Обратный шаг = данные, а не замыкание: tagged-union дескриптор + чистая функция-диспетчер (BackwardPlan/runBackwardPlan — по образцу ExpandRequest)"
    - "Чистые функции градиента от чисел (value-grads.ts): класс только аккумулирует parent.grad += incoming · local в каноническом порядке эффектов"

key-files:
  created:
    - src/tensor/value-grads.ts
  modified:
    - src/tensor/value.ts
    - src/tensor/tensor.ts
    - src/tensor/functional.ts

key-decisions:
  - "План передаётся через конструктор (TensorInit.plan), а не сеттером: F.bce строит план наравне с методами класса — post-hoc-мутации (setBackward/defineBackward) не нужны вовсе"
  - "Value.runBackward назван симметрично Tensor.runBackward (пошаговый обратный ход одной op); план предлагал «например backprop(incoming)» — имя свободное, сигнатура/семантика topo-шага сохранены"
  - "Числовые выражения диспетчеров один-в-один с прежними замыканиями (включая форму (−incoming·a)/(b·b) для div и incoming·out·(1−out) для sigmoid) — бит-идентичность подтверждена инвариантами, а не «на глаз»"

patterns-established:
  - "Декомпозиция D-29: движок = классы-контейнеры данных + чистые функции математики; новые ops фазы 02+ пишутся только так (план в конструкторе, кейс в диспетчере, ядро в ops.ts)"

requirements-completed: [DOCS-01]

coverage:
  - id: D1
    description: "Value декомпозирован: value-grads.ts (≥8 чистых localGrad*-функций с JSDoc-формулами) + value.ts без замыканий-исполнителей, op-метки рендера сохранены"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "command: rg -c localGrad src/tensor/value-grads.ts → VALUE-GRADS-PURE (≥8)"
        status: pass
      - kind: unit
        ref: "src/tensor/expanders.test.ts#инвариант «drill-down = движок» (1e-12) — зелёный после хода"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tensor декомпозирован: BackwardPlan (tagged union) + чистый диспетчер runBackwardPlan; F.bce через план; механизм замыканий удалён из библиотеки"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "command: rg -c BackwardPlan src/tensor/tensor.ts → PLAN-DISPATCHER; rg setBackward|defineBackward src/tensor → пусто (NO-CLOSURE-BACKWARD)"
        status: pass
      - kind: unit
        ref: "src/run/etalon.test.ts (13 оп XOR, 1e-6) + src/run/invariants.test.ts (пошагово = fast-forward, бит-в-бит toEqual) — зелёные"
        status: pass
    human_judgment: false
  - id: D3
    description: "Бит-идентичность всего прогона после декомпозиции: pnpm test (101) + pnpm lint (чисто в src/tensor) + pnpm e2e (11) — ядра ops.ts и trace.ts не изменены"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "command: pnpm test → Test Files 9 passed, Tests 101 passed"
        status: pass
      - kind: e2e
        ref: "command: pnpm e2e → 11 passed (13.2s)"
        status: pass
      - kind: other
        ref: "command: git diff f237985..6a35dfe -- src/tensor/ops.ts src/tensor/trace.ts → пусто (незыблемые точки не тронуты)"
        status: pass
    human_judgment: false

duration: 3 min
completed: 2026-11-12
status: complete
---

# Phase 02 Plan 03: Декомпозиция движка на чистые функции градиентов (D-29) Summary

**Value и Tensor лишены мутирующих backwardFn-замыканий: обратный шаг стал данными (op-дескриптор BackwardPlan) + чистыми функциями (value-grads.ts, runBackwardPlan) при бит-идентичных числах — 101 юнит + 11 e2e зелёные, ядра ops.ts и topo-порядок SampleCursor не тронуты.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-12T17:54:35Z
- **Completed:** 2026-11-12T17:57:45Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- D-29 для Value: src/tensor/value-grads.ts — 8 чистых функций локального градиента (add/sub/mul/div/neg/tanh/sigmoid/log) с JSDoc-формулами; value.ts — op-методы пишут только данные, метод runBackward аккумулирует в порядке родитель A → родитель B
- D-29 для Tensor: type BackwardPlan (tagged union по образцу ExpandRequest: matmul/add/tanh/sigmoid/bce) + чистый диспетчер runBackwardPlan с теми же ядрами ops.ts и тем же порядком accumulate (матмул: w → x); F.bce строит план через конструктор
- Механизм замыканий удалён полностью (setBackward/defineBackward/backwardFn — 0 вхождений в src/tensor); публичный контракт index.ts не изменён
- Бит-идентичность доказана после КАЖДОГО файлового хода (strangler-fig): etalon 1e-6, инварианты «пошагово = FF» toEqual, expanders 1e-12; финал — test+lint+e2e все зелёные

## Task Commits

Each task was committed atomically:

1. **Task 1: value.ts — чистые локальные градиенты (value-grads.ts) при бит-идентичной семантике** - `c3aefdf` (refactor)
2. **Task 2: tensor.ts — op-дескриптор BackwardPlan + диспетчер; F.bce на plan-механизме** - `6a35dfe` (refactor)

**Plan metadata:** (see below)

## Files Created/Modified
- `src/tensor/value-grads.ts` — NEW: 8 чистых функций локального градиента Value-оп от чисел, без мутации узлов
- `src/tensor/value.ts` — класс Value без backwardFn; диспетчер runBackward() (switch по op-метке, аккумуляция в родителей); topo-обход backward() вызывает runBackward
- `src/tensor/tensor.ts` — type BackwardPlan + runBackwardPlan(plan, out); TensorInit.plan; runBackward() сохраняет сигнатуру/семантику; setBackward/defineBackward удалены
- `src/tensor/functional.ts` — F.bce передаёт план {op:'bce', p, t} в конструктор; импорты accumulate/bceGradP ушли в диспетчер
- `src/tensor/index.ts` — БЕЗ ИЗМЕНЕНИЙ (см. Deviations): defineBackward никогда не экспортировался из index.ts, сужать нечего

## Decisions Made
- План в конструкторе (TensorInit.plan) вместо статического сеттера: F.bce и методы класса проходят один путь, post-hoc-мутации исключены (см. key-decisions)
- Имя Value.runBackward — симметрия с Tensor.runBackward (пошаговый обратный ход одной op); план допускал свободное имя
- guard `out.grad === null → return` поднят в начало диспетчера (был в каждом замыкании) — поведение идентично, порядок accumulate сохранён

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] lint: no-useless-return в хвостовых кейсах switch**
- **Found during:** Task 2 (pnpm lint после финального гейта)
- **Issue:** oxlint pedantic помечал `return` в последних кейсах switch диспетчеров (value.ts, tensor.ts) как избыточный
- **Fix:** убраны return в последних кейсах (log/bce) + пустой case '' заменён комментарием; семантика не изменилась (конец switch = конец функции)
- **Files modified:** src/tensor/value.ts, src/tensor/tensor.ts
- **Verification:** pnpm lint — 0 предупреждений в src/tensor/**; pnpm test 101 зелёные
- **Committed in:** 6a35dfe

**2. [Rule 2 - Documentation] index.ts заявлен в files_modified, но правка не потребовалась**
- **Found during:** Task 2 (шаг 5)
- **Issue:** план ожидал «удалить экспорт механизма замыканий из index.ts», но defineBackward никогда не экспортировался из index.ts (был static-методом Tensor)
- **Fix:** index.ts не тронут — публичная поверхность сохранена ровно (что и требовал flagged assumption «экспорт-поверхность сохраняется»)
- **Files modified:** (none)
- **Verification:** git diff по index.ts пуст; все потребители библиотеки — через index.ts без правок
- **Committed in:** n/a

---

**Total deviations:** 2 auto-fixed (1 blocking lint, 1 documentation no-op)
**Impact on plan:** Нулевое влияние на вычисления и API; оба пункта — следствия буквального чтения плана.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Чистые ядра ops.ts + диспетчер runBackwardPlan — готовые строительные блоки для ScenarioModel-курсора (02-04): обобщение с XOR-MLP на один нейрон не требует трогать замыкания (их больше нет)
- Следующий план: 02-07 (волна 3, сплит runState) — параллелен 02-04/02-08 по файлам

---
*Phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone*
*Completed: 2026-11-12*
