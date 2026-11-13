---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
plan: "09"
subsystem: engine-verification
tags: [nfr-02, etalon, gradcheck, neuron, invariants, e2e-pin]

requires:
  - phase: 02-05
    provides: NEURON_SCENARIO финален (веса/состав) — источник съёма констант
provides:
  - ETALON_NEURON_SAMPLE_1 — 8 оп neuron-сэмпла 1, shortest round-trip double (NFR-02 на новом носителе)
  - src/run/gradcheck.test.ts — независимая численная верификация аналитических градиентов (central difference, методология torch.autograd.gradcheck)
  - инварианты «пошагово = FF» бит-в-бит + детерминизм на neuron (runEpochOf параметризован спеком)
  - e2e-пины тестов 1/16 числами из констант (межраннеровый мостик vitest ↔ playwright)
affects: [02-06 (последний план фазы: D-32 + docs-sync D-27..D-33), фаза 3 (XOR-MLP подключается по той же механике)]

actuals:
  tokens: 26000
  tasks: 1
  commits: 2

tech-stack:
  added: []
  patterns:
    - "двухступенчатая честность видна в порядке коммитов: gradcheck (13636d6) раньше констант (b4a43c5)"
    - "self-capture: полный прогон сэмпла 1 через SampleCursor+buildStepRecord, JSON shortest round-trip → литералы"

key-files:
  created:
    - src/run/gradcheck.test.ts — central difference для W[0]/W[1]/b (h=1e-6, tol 1e-4·max(1,|num|)) + знаки
  modified:
    - src/run/etalon-constants.ts — +ETALON_NEURON_SAMPLE_1 (XOR-эталон нетронут, diff чисто аддитивный)
    - src/run/etalon.test.ts — expectEtalonMatch(spec, etalon): XOR + neuron одним кодом
    - src/run/invariants.test.ts — runEpochOf(spec): neuron-инварианты бит-в-бит
    - e2e/smoke.spec.ts — пины formatKey(ETALON_NEURON_SAMPLE_1[0/2/3])

key-decisions:
  - "Pitfall 6-гейт съёма пройден: bce-grad = −1.449 (далеко от ±1e2) — веса 02-05 подтверждены константами"
  - "gradcheck проверяет и знаки отдельным тестом (Math.sign совпадает) — ловит перепутанные знаки формул даже при малых |∂L/∂θ|"

patterns-established:
  - "Новый сценарий наследует NFR-02 тремя ногами: унаследованный XOR-эталон (регрессия) + свой gradcheck→эталон + бит-бит инварианты"

requirements-completed: [DOCS-01]

coverage:
  - id: D1
    description: "Central-difference gradcheck: численная ∂L/∂θ (пересборка графа с персёрбированным весом) vs аналитические градиенты движка для всех 3 параметров; зелёный ДО фиксации констант"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "src/run/gradcheck.test.ts (2 теста: допуск + знаки); pnpm vitest run src/run/gradcheck.test.ts — 2 passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "ETALON_NEURON_SAMPLE_1: 8 оп полной точности, 0 импортов, источник не называется; etalon-тест ≤1e-6 через buildStepRecord; XOR-эталон нетронут"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "pnpm vitest run src/run/etalon.test.ts — 2 passed (XOR + neuron); git diff etalon-constants чисто аддитивен"
        status: pass
    human_judgment: false
  - id: D3
    description: "Инвариант «пошагово = FF» бит-в-бит (toEqual) + детерминизм на neuron; XOR-инварианты остаются"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "pnpm vitest run src/run/invariants.test.ts — 8 passed (5 XOR + 2 neuron + счёт записей)"
        status: pass
    human_judgment: false
  - id: D4
    description: "e2e-пины числами из констант: тест 1 (z), тест 16 (ŷ, L) — interim-строки 02-05 заменены"
    requirement: DOCS-01
    verification:
      - kind: e2e
        ref: "pnpm e2e — 16 passed; тест 1 пин ETALON_NEURON_SAMPLE_1[0], тест 16 — [2]/[3] через formatKey"
        status: pass
    human_judgment: false
  - id: D5
    description: "Итоговые гейты: pnpm test && pnpm lint && pnpm e2e зелёные; порядок коммитов gradcheck → константы"
    requirement: DOCS-01
    verification:
      - kind: command
        ref: "119 unit passed / lint exit 0 / 16 e2e passed; commits 13636d6 → b4a43c5"
        status: pass
    human_judgment: false

duration: 20 min
completed: 2026-11-13
status: complete
---

# Phase 02 Plan 09: NFR-02 на носителе «один нейрон» Summary

**Двухступенчатая честность NFR-02 для сценария neuron: независимый central-difference gradcheck (зелёный первым коммитом) → self-capture ETALON_NEURON_SAMPLE_1 (8 оп, полной точности) → neuron-нога etalon/инвариантов → пины e2e числами из констант. XOR-эталон не тронут — регрессия движка.**

## Performance

- **Duration:** 20 min
- **Tasks:** 1
- **Files modified:** 5 (1 создан, 4 изменены)
- **Commits:** 13636d6 (gradcheck — ДО констант), b4a43c5 (константы + тесты + пины)

## Accomplishments
- gradcheck.test.ts: численная ∂L/∂θ = (L(θ+h) − L(θ−h))/2h через пересборку графа buildModel с персёрбированным весом; допуск 1e-4·max(1,|num|) для W[0], W[1], b; отдельный тест на совпадение знаков
- Self-capture после зелёного gradcheck: сэмпл 1 ([1,1]→1) через SampleCursor+buildStepRecord → литералы shortest round-trip; Pitfall 6-сигнал чист (bce-grad −1.449)
- etalon.test/invariants.test параметризованы спеком (expectEtalonMatch / runEpochOf) — один код для XOR и neuron
- e2e: interim-строки 02-05 заменены пинами formatKey(константа) в тестах 1 и 16

## Task Commits

1. **Task 1: gradcheck → self-capture → инварианты → пин e2e** - `13636d6`, `b4a43c5` (test/feat)

## Files Created/Modified
- Created: `src/run/gradcheck.test.ts`
- Modified: `src/run/etalon-constants.ts`, `src/run/etalon.test.ts`, `src/run/invariants.test.ts`, `e2e/smoke.spec.ts`

## Decisions Made
- Знаки — отдельным тестом gradcheck: допуск 1e-4 может пропускать перепутанные знаки при малых значениях; sign-проверка закрывает это без второго допуска
- Пины e2e через formatKey (как в XOR-проверке 6) — display-минус и .4g согласованы с UI без дублирования форматирования

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- vitest проглатывает console.log в run-режиме — self-capture снят временным тестом с writeFileSync (удалён до коммита)

## User Setup Required
None

## Next Phase Readiness
- 02-06 (последний план фазы): D-32 loss-узел с графа + docs-sync D-27..D-33; рендер-данные NEURON/XOR и e2e-селекторы известны из 02-05

---
*Phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone*
*Completed: 2026-11-13*
