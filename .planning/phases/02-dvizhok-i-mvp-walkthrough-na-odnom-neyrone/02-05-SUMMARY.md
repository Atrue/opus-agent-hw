---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
plan: "05"
subsystem: product
tags: [scenario, neuron, mvp, e2e, keyboard, url]

requires:
  - phase: 02-04
    provides: ScenarioModel/render — носитель = данные; UI читает спеку
  - phase: 02-07
    provides: сплит run-модулей — точки выбора сценария (run.ts/trainingRun.ts)
provides:
  - NEURON_SCENARIO — дефолтный сценарий MVP R1 (D-31): AND-датасет, σ+BCE, lr 0.5, 8 оп/сэмпл, цепь x→z→ŷ→L→W
  - URL: KNOWN_SCENARIOS ['neuron','xor'], DEFAULT_SCENARIO 'neuron' (#scenario=neuron — входная дверь)
  - UX-02 верифицирован e2e на новом носителе: →/Space/PgDn вперёд (отдельные проверки), ←/Backspace/PgUp инертны
  - e2e 16 проверок на neuron-носителе (interim-числа; пин эталон-константы — 02-09), baseline 18
affects: [02-09 (съём эталон-констант + пин e2e), 02-06 (D-32 loss-узел уходит с графа), фаза 3 (XOR-MLP по той же механике)]

actuals:
  tokens: 66000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "активный сценарий фиксируется по URL до создания прогона (activateScenario в run.ts, UI-таблицы строятся один раз на сессию)"
    - "интерим e2e-числа = живые константы сценария (W=(0.8,0.8), b=−0.8, x=(1,1)); точный пин — эталон-константы 02-09"

key-files:
  created:
    - src/run/url.test.ts — клампинг/дефолт neuron (D-28а колокация)
    - src/run/scenario.test.ts — правило первого шага на живом движке (ŷ₀ ∈ [0.3,0.7], |∂L/∂ŷ| ≤ 2, сходимость, 100% ≤ 10 эпох)
  modified:
    - src/run/scenario.ts — NEURON_SCENARIO (15 узлов/16 рёбер/8 stepGroups/5 звеньев/серии W=3 веса); title/datasetLabel/netShapeOf; реестр+activateScenario
    - src/run/url.ts — KNOWN_SCENARIOS/DEFAULT_SCENARIO 'neuron'
    - src/run/run.ts — parseHash → activateScenario до new TrainingRun
    - src/run/trainingRun.ts,stepRecords.ts,history.ts — активный спец вместо XOR-констант; sampleCount из спека
    - src/ui/* — title/«Граф … 2-1»/шаг N/8/серии/звенья из спека; hintData по layerSymbols (один код XOR+neuron); ResultPanel индексы ŷ/L из ops
    - e2e/smoke.spec.ts — 16 проверок neuron-носителя + XOR-эталон-регрессия

key-decisions:
  - "стартовые веса W=(0.8,0.8), b=−0.8 подобраны руками: ŷ₀ = 0.69/0.50/0.50/0.31 ∈ [0.3,0.7], |∂L/∂ŷ| ≤ 2 — правило первого шага (Pitfall 6) зелёное ДО съёма эталона"
  - "SampleRecord.nodes по layerSymbols: a1/z1/z2 обобщены — состав полей определяет спека"
  - "reset пишет стартовую точку нового прогона в историю звена: 3 ряда × (2×4+2 стартовых) = 30 значений после сброса"

patterns-established:
  - "Смена дефолтного носителя = activateScenario в run.ts + данные спека; ни один UI-компонент не знает «XOR или neuron»"

requirements-completed: [DOCS-01, UX-02]

coverage:
  - id: D1
    description: "NEURON_SCENARIO объявлен (8 opMeta RU, AND-датасет, стартовые веса-константы); url: дефолт 'neuron', xor выбираем, невалидный hash клампится"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "src/run/url.test.ts, src/run/scenario.test.ts; pnpm test 116 passed"
        status: pass
      - kind: e2e
        ref: "e2e 5) reload → #scenario=neuron; 6) #scenario=xor загружает XOR по эталону"
        status: pass
    human_judgment: false
  - id: D2
    description: "Первый «Шаг» показывает числа движка; полная эпоха 4×8 без NaN → экран завершения (L до/после, точность); «Следующая эпоха» продолжает"
    requirement: DOCS-01
    verification:
      - kind: e2e
        ref: "e2e 1) z=1.6 interim, 2) эпоха без NaN + epoch-summary, 4) эпоха 2 — 16 passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "FF «Запустить эпоху» идентичен пошаговому (инвариант R3); история звена одинакова в обоих режимах"
    requirement: DOCS-01
    verification:
      - kind: e2e
        ref: "e2e 3) текст экрана эпохи FF === пошаговому"
        status: pass
      - kind: unit
        ref: "инвариант в trainingRun.test (в) — XOR; neuron-инвариант добавляет 02-09"
        status: pass
    human_judgment: false
  - id: D4
    description: "Правило первого шага: ŷ₀ ∈ [0.3,0.7] на всех примерах, |∂L/∂ŷ| < 5, лосс ↓ к 3-5 эпохе, точность → 100%"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "src/run/scenario.test.ts — TDD на живом движке до фиксации констант"
        status: pass
    human_judgment: false
  - id: D5
    description: "UX-02: → / Space / PgDn исполняют шаг (+1, каждая клавиша отдельно); ← / Backspace / PgUp не меняют позицию — «назад» отсутствует"
    requirement: UX-02
    verification:
      - kind: e2e
        ref: "e2e 7) 8) 9) вперёд по клавише; 10) три инертные проверки"
        status: pass
    human_judgment: false
  - id: D6
    description: "Цепь 5 звеньев x→z→ŷ→L→W: клики символов, панель звена, история звена W = 3 веса — D-26 жив на новом носителе"
    requirement: DOCS-01
    verification:
      - kind: e2e
        ref: "e2e 11) 5 звеньев + снятие выбора; 12) история 3×9/3×10 + reset"
        status: pass
    human_judgment: false

duration: 96 min
completed: 2026-11-13
status: complete
---

# Phase 02 Plan 05: Носитель «один нейрон» Summary

**MVP R1 живёт на сценарии «один нейрон» (D-31): дефолтный URL #scenario=neuron открывает первый урок — 8 оп/сэмпл на AND-датасете с числами живого движка, клавиатурой UX-02 и экранами эпох; XOR остаётся выбираемым и его эталон — регрессией. UI-слой не знает, какой сценарий активен (активный спец фиксируется по URL до создания прогона).**

## Performance

- **Duration:** 96 min (Task 1 — c55bd74, предыдущая сессия; Task 2 — эта сессия)
- **Tasks:** 2
- **Files modified:** 25
- **Commits:** c55bd74 (Task 1), fda34fb (Task 2)

## Accomplishments
- Task 1 (данные): NEURON_SCENARIO в форме ScenarioModel — стартовые веса подобраны на живом движке под правило первого шага (ŷ₀ 0.69/0.50/0.50/0.31); url-дефолт neuron; scenario.test/url.test (D-28а колокация)
- Task 2 (носитель на экране): run.ts активирует сценарий по URL до прогона; весь UI-слой (заголовок, форма графа, лента N/8, серии, звенья, hint-раскрытия, ResultPanel) читает спек; e2e переписан на neuron-носитель — 16 проверок, включая UX-02 клавиатуру (6 отдельных клавишных проверок) и XOR-эталон-регрессию; baseline 18, двойной прогон бит-идентичен

## Task Commits

1. **Task 1: NEURON_SCENARIO + правило стартовых весов + url-дефолт** - `c55bd74` (feat)
2. **Task 2: экран neuron, e2e 16 проверок + клавиатура UX-02 + baseline** - `fda34fb` (feat)

## Files Created/Modified
- `src/run/scenario.ts` (+NEURON_SCENARIO, реестр, activateScenario), `src/run/url.ts` (дефолт), `src/run/run.ts` (фиксация по URL)
- `src/run/{trainingRun,stepRecords,history}.ts` — активный спец; `src/ui/*` — 13 компонентов без XOR-хардкода
- `e2e/smoke.spec.ts` — 16 проверок; `src/run/{url,scenario}.test.ts` — новые

## Decisions Made
- Веса W=(0.8,0.8), b=−0.8: ŷ₀ ∈ [0.3,0.7] на всех 4 примерах AND, |∂L/∂ŷ| ≤ 2, лосс заметно ↓ к 4-й эпохе FF, точность 100% ≤ 10 эпох (scenario.test на живом движке)
- История звена после reset: новый прогон пишет вторую стартовую точку — 3 ряда × 10 (e2e-пин)
- Символ звена W на формуле — η или ∂L/∂W (символы update-сегмента); формула звена z = W·x + b — склейка opMeta

## Deviations from Plan
- e2e «точность 0/25/50/75/100% по ходу» (truth №2) покрыта экраном завершения («N из 4 верно») и verdict-тестом 15: пошаговая выборочная проверка промежуточной точности по ходу эпохи не заводилась — состояние «вердикт появляется после завершения сэмпла» и так наблюдаемо (sample-verdict-*)
- Прочее — по плану

## Issues Encountered
- compGraph.ts: TS widening kind:'flow'|'update' → string в buildInventory (витест не тайпчекает, поймано pnpm build) — аннотация GraphEdge[]
- e2e: клавишный тест без начального expect жмёт клавишу до монтирования React — синхронизация индикатором (шаг 1) перед нажатием

## User Setup Required
None

## Next Phase Readiness
- 02-09: состав/веса финальны → gradcheck → ETALON_NEURON_SAMPLE_1 → инварианты neuron → пин e2e-чисел (interim-строки уже размечены)
- 02-06: D-32 (loss-узел/y с графа) — render-данные NEURON/XOR + e2e-селекторы («Операция BCE», 14 станций) известны

---
*Phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone*
*Completed: 2026-11-13*
