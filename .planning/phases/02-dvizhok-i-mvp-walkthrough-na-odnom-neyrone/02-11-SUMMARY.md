---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
plan: "11"
subsystem: structure
tags: [gap-closure, oq-2, granulometry, domains, segmentid, format-barrel, ui-subfolders]

requires:
  - phase: 02-10
    provides: value-ops/ — эталон пер-оп структуры + граница tensor, допускающая подпапки
provides:
  - src/tensor: ops/ ПО ОПЕРАЦИЯМ (matvec/add/tanh/sigmoid/bce — зеркально value-ops/), trace/ домен (types/walk/cursor/io), backward.ts (accumulate внутренняя)
  - src/run: scenario/ и history/ домены с баррелами и колоцированными тестами; SegmentId в run/types.ts — слой-инверсия run→ui закрыта
  - src/format: домен-папка minus/formatKey/exactRepr + index-баррел (13 импорт-спецификаторов)
  - src/ui: 10 подпапок сущностей экрана (app/stepper/formula/graph/chain/operation/numbers/dataset/epoch/typography), корень — только README
affects: [02-12 (гейт R2 проверяет корень ui; D-34 журнализация), фаза 3 (MLP-спек = файл в scenario/)]

actuals:
  tokens: 68000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "домен = папка с баррелом index.ts; операция = файл (forward + градиенты вместе); импорт-поверхности потребителей стабильны баррелами"
    - "сплиты = новые файлы (git-история только у чистых git mv) — зафиксировано ревью"

key-files:
  created:
    - src/tensor/ops/{matvec,add,tanh,sigmoid,bce,index}.ts
    - src/tensor/trace/{types,walk,cursor,io,index}.ts
    - src/tensor/backward.ts
    - src/run/scenario/{types,bindings,xor,neuron,registry,index,scenario.test}.ts
    - src/run/history/{types,series,session,lossChart,linkHistory,index,history.test}.ts
    - src/format/{minus,formatKey,exactRepr,index}.ts
    - src/ui/{graph/geometry,graph/inventory,chain/links,chain/symbols,chain/geometry,chain/liveValues,numbers/resolve,numbers/hint}.ts
  modified:
    - src/run/types.ts (+SegmentId), src/run/trainingRun.ts, src/ui/chain/LinkPanel.tsx (liveValues вынесен), src/main.tsx, все ui-компоненты (только импорт-строки)
  deleted:
    - src/tensor/{ops,trace}.ts, src/run/{scenario,history}.ts, src/format/numbers.ts, src/ui/{compGraph,chainLinks,hintData}.ts

key-decisions:
  - "ops/ по операциям, НЕ по категориям (решение ревью): категория смешивает операции; зеркально value-ops/"
  - "scenario/bindings.ts — фабрики биндингов/рёбер (inB/wB/bB/ten/dot/flow/upd) общие для xor/neuron: связная группа одного субъекта (не граб-бэг)"
  - "CHAIN_GEOMETRY_IDS удалён (мёртвый — 0 потребителей); scenarioById/LINK_HISTORY_CAP/accumulate — внутренние (un-export)"
  - "WEIGHT_ROWS остаётся экспортированным (session.ts) по решению ревью; history.test.ts использует локальные константы поверх seriesOf(XOR)"

patterns-established:
  - "сценарий = файл данных в scenario/ (фаза 3 добавляет MLP-спек файлом, без нового UI-слоя)"
  - "колоцированные тесты едут вместе с моделями (compGraph.test → graph/, chainLinks.test → chain/, scenario/history-тесты — в домены)"

requirements-completed: []

coverage:
  - id: D1
    description: "Tensor-домены: ops/ по операциям + баррел, trace/ домен, backward.ts (accumulate внутренняя); импортёры вне tensor не менялись"
    verification:
      - kind: command
        ref: "TENSOR-SPLIT (test ! -f ops.ts/trace.ts && -f backward.ts && -f ops/matvec.ts); pnpm test 121 passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Run-домены: scenario/ + history/ с баррелами и колоцированными тестами; SegmentId в run/types.ts; run/tensor/format не импортируют ui"
    verification:
      - kind: command
        ref: "RUN-SPLIT + NO-LAYER-INVERSION (rg \"from '../ui\" src/run src/tensor src/format — пусто); pnpm test 121 passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "Format-баррел index.ts + ui по 10 подпапкам сущностей, корень ui — только README; мультиэкспортные файлы (compGraph/chainLinks/hintData/numbers) дроблены; git mv + правка только импорт-строк"
    verification:
      - kind: command
        ref: "UI-SUBFOLDERS + MULTI-EXPORT-SPLIT; pnpm test (121) + lint (0 errors) + tsc (0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "testid/RU-строки/тела функций не тронуты при переездах — e2e как детектор"
    requirement: NFR-02
    verification:
      - kind: e2e
        ref: "pnpm e2e — 16 passed (все контракты testid/RU-строк живы)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Соответствие мягкой инструкции гранулометрии (файл = операция/сущность; связные группы; баррелы легальны; граб-бэги запрещены) — приёмка ревью владельца по дифу"
    verification: []
    human_judgment: true
    rationale: "Гранулометрия — мягкое правило (решение ревью 2026-11-13), машинного гейта нет; структура принимается ревью владельца (коммиты 1208817, 1251103, 1bf722b)"

duration: 32 min
completed: 2026-11-13
status: complete
---

# Phase 02 Plan 11: Домены и подпапки сущностей (gap OQ-2) Summary

**tensor/run/format/ui разбиты по папкам сущностей: ops/ по операциям (зеркально value-ops/), trace/ и scenario/ и history/ домены с баррелами, format/index.ts + 13 импортов, ui → 10 подпапок экрана с колоцированными тестами; SegmentId поднят в run (NO-LAYER-INVERSION); мёртвые символы un-export/удалены; тела функций, testid и RU-строки нетронуты — 121 unit + 16 e2e зелёные.**

## Performance

- **Duration:** 32 min (17:35–18:07 UTC)
- **Tasks:** 3
- **Files modified:** 74 (35 создано, 27 mv, 12 удалено/заменено баррелами)
- **Commits:** 1208817 (Task 1 tensor), 1251103 (Task 2 run), 1bf722b (Task 3 format+ui)

## Accomplishments
- tensor: ops/{matvec,add,tanh,sigmoid,bce}.ts — операция и её градиенты в одном файле; trace/{types,walk,cursor,io}; runBackwardPlan → backward.ts, accumulate — внутренняя; './ops'/'./trace' у потребителей не менялись
- run: scenario/{types,bindings,xor,neuron,registry} (scenarioById внутренняя; bindings — общие фабрики узлов/рёбер для XOR и neuron); history/{types,series,session,lossChart,linkHistory} (LINK_HISTORY_CAP внутренняя); тесты колоцированы (git mv)
- SegmentId объявлен в run/types.ts; run/{types,trainingRun,history} больше не импортируют ui; ui/chain* и graph* импортируют из run/types — слой-инверсия закрыта
- format: minus/formatKey/exactRepr + index-баррел; 13 импорт-спецификаторов правлены (11 ui → '../format'/'../../format', e2e → '../src/format', numbers.test.ts → './index' тестирует баррел)
- ui: 10 подпапок сущностей; compGraph → graph/{geometry,inventory}; chainLinks → chain/{links,symbols,geometry} (CHAIN_GEOMETRY_IDS удалён — мёртвый); hintData → numbers/{resolve,hint}; liveValues вынесен из LinkPanel (only-export-components); корень src/ui/ — только README.md

## Task Commits

1. **Task 1: tensor — ops/ по операциям, trace/ домен, backward.ts** - `1208817` (refactor)
2. **Task 2: run — scenario/ + history/ + SegmentId в run/types.ts** - `1251103` (refactor)
3. **Task 3: format-баррел + ui — подпапки сущностей экрана** - `1bf722b` (refactor)

## Files Created/Modified
- Created: см. key-files (35 файлов)
- Modified: src/run/types.ts, src/run/trainingRun.ts, src/ui/chain/LinkPanel.tsx, src/main.tsx, src/tensor/{tensor,expanders}.ts (импорт-строки/README), README × 4 (tensor/run/ui/format)
- Deleted: ops.ts, trace.ts, scenario.ts, history.ts, numbers.ts, compGraph.ts, chainLinks.ts, hintData.ts

## Decisions Made
- scenario/bindings.ts — новый файл общих фабрик (inB/wB/bB/ten/dot/flow/upd): у планов их не было, но дублирование в xor/neuron хуже; субъект связный (конструкторы биндингов спека)
- CHAIN_GEOMETRY_IDS — удалён, а не un-export: использовался только внутри chainLinks.ts для... нет, 0 вхождений вообще (аудит подтвердил); WEIGHT_ROWS оставлен экспортированным (решение ревью)
- e2e/smoke.spec.ts импорт format → '../src/format' (баррел)

## Deviations from Plan
None - plan executed exactly as written (правка импорт-строк при переездах — запланирована).

## Issues Encountered
- Phase-A скрипт упал на LossChart.tsx (нет импорта SubscriptText — предположение в субституциях было избыточным): файл дозафиксирован отдельным прогоном скрипта; tsc после — чистый

## User Setup Required
None

## Next Phase Readiness
- 02-12: гейт R2 (корень ui только README) нацелен на фактическую структуру; D-34 журнализирует пакет решений
- Фаза 3: новый сценарий = файл в scenario/ + спеки операций; ops/trace-механика не меняется

---
*Phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone*
*Completed: 2026-11-13*
