---
phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3
plan: "02"
subsystem: ui
tags: [shadcn, card, kbd, cva, migration, dead-css]

requires:
  - phase: 03 (план 01)
    provides: kit Button + токен-мост + инфраструктура CLI (components.json/алиасы)
provides:
  - kit Card (+Header/Title=h2/Action=мета-бейдж/Description/Content/Footer) и Kbd — контракты .card/.kbd DESIGN.md
  - Все пересобираемые примитивы экрана на ките (D-38 «агрессивная замена»): кнопки ×6 точек, карточки ×6 файлов, kbd ×2
  - Мёртвый CSS выведен из src/index.css (.btn/.btn-primary/.kbd/.card-семейство/.graph-zoom-оверрайд)
affects: [03-03 (пилоты tooltip/collapsible на ките), phase 4 (экраны сценариев на финальной базе — мотив D-37)]

actuals:
  tokens: 41000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns: [миграция потребителей с сохранением testid/aria/RU-строк (D-38/D-49), удаление мёртвого CSS с последним потребителем, компакт-модификатор (.link-close) поверх kit Button]

key-files:
  created: [src/ui/kit/card.tsx, src/ui/kit/kbd.tsx]
  modified: [src/ui/kit/index.ts, src/ui/kit/README.md, src/ui/app/App.tsx, src/ui/graph/ComputationGraph.tsx, src/ui/operation/OperationPanel.tsx, src/ui/numbers/NumberDrilldown.tsx, src/ui/epoch/EpochSummary.tsx, src/ui/dataset/ExamplesPanel.tsx, src/ui/dataset/ResultPanel.tsx, src/ui/chain/LinkPanel.tsx, src/index.css]

key-decisions:
  - "CardTitle рендерит h2 (все заголовки карточек проекта — h2, семантика заголовков сохранена при миграции на div-канон кита)"
  - "drill-back: card-meta-роль через ml-auto/text-on-surface-variant на Button quiet (card-meta удаляется вместе с .card-семейством)"
  - ".link-close остаётся компакт-модификатором поверх Button quiet (min-height 0, padding 4px — unlayered CSS бьёт layered-утилиты)"

patterns-established:
  - "Пары «до/после» скрин-дифа: .planning/ui-reviews/<plan>-before|after/ (рабочая capture, не коммитится); критерий — D-49"

requirements-completed: []  # ROADMAP-3.1 завершён этим планом совместно с 03-01/03-03 — shared-ID гейт держит до SUMMARY 03-03

coverage:
  - id: D1
    description: "kit Card + Kbd (контракты .card/.kbd DESIGN.md), без новых зависимостей и люциде-иконок"
    requirement: ROADMAP-3.1
    verification:
      - kind: other
        ref: "CARD-KBD-ADDED + NO-LUCIDE + git diff package.json пуст"
        status: pass
    human_judgment: false
  - id: D2
    description: "Все потребители .btn/.card/.kbd мигрированы на кит; мёртвый CSS удалён; контракты экрана (testid/aria/RU-строки) не изменились"
    requirement: ROADMAP-3.1
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts — 17 проверок без правок селекторов, двойной прогон бит-идентичен (18 скринов byte-equal)"
        status: pass
      - kind: other
        ref: "CONSUMERS-MIGRATED / DEAD-CSS-GONE / GATES-UNTOUCHED"
        status: pass
      - kind: unit
        ref: "pnpm test 144 passed, pnpm lint 0 errors, pnpm build ok"
        status: pass
    human_judgment: false
  - id: D3
    description: "Стилистика «приборной» темы сохранена при миграции (D-49) — скрин-ревью владельцем по парам до/после"
    requirement: ROADMAP-3.1
    verification: []
    human_judgment: true
    rationale: "Сохранение стилистики — визуальное суждение (D-49 явно исключает попиксельный гейт); пары до/после в .planning/ui-reviews/03-02-before|after/, владелец ответил approved"

duration: 18 min
completed: 2026-11-19
status: complete
---

# Phase 3 Plan 02: Карточки/Kbd на кит + миграция потребителей Summary

**Агрессивная замена D-38 исполнена: все пересобираемые примитивы (кнопки ×6 точек, карточки ×6 файлов, kbd ×2) мигрированы на kit Card/Kbd/Button, мёртвый CSS выведен, скрин-ревью владельцем — approved (D-49).**

## Performance

- **Duration:** ~18 min
- **Completed:** 2026-11-19T15:35Z
- **Tasks:** 3 (генерация+«до» / миграция+гейты / скрин-ревью blocking)
- **Files modified:** 13 (2 создано, 11 изменено)

## Accomplishments

- «До»-скрины зафиксированы (.planning/ui-reviews/03-02-before/, 18 файлов); kit Card и Kbd сгенерированы CLI 4.23.0 и адаптированы под контракты DESIGN.md: Card = container-low (bg-card через мост), radius 2, p-4, gap 8, shadow-card; шапка flex; CardTitle — h2 (семантика заголовков сохранена); CardAction — мета-бейдж. Kbd = моно 11px (exception UI-SPEC), container-фон, усиленный низ бордера 2px, radius 4.
- Миграция всех потребителей: toggle-lecture → Button variant toggle (aria-pressed), зум ×3 → size icon-sm (34/2×8 locked), drill-back → Button quiet (ml-auto on-surface-variant), link-close → Button quiet + .link-close-модификатор (остаётся в CSS), карточки (App ×2, OperationPanel ×2 ветки, NumberDrilldown, EpochSummary, ExamplesPanel, ResultPanel) → Card-семейство, kbd ×2 → Kbd. testid/aria/RU-строки/клавиатурные контракты не изменились.
- Мёртвый CSS удалён: .btn, .btn-primary, .kbd, .card/.card-head/.card-title/.card-meta, .graph-zoom .btn-оверрайд; .screen, глобальный :focus-visible и .link-close остались (продуктовые).
- Гейты: 144 юнит + lint 0 + tsc 0 + 17 e2e ×2 бит-идентичен; diff по src/tensor = 0; замороженные конфиги не тронуты. Скрин-ревью владельцем: **approved** (стилистика сохранена, D-49; дельта скринов +0.1–1.6 KB на файл — локальные правки примитивов, не редизайн).

## Task Commits

1. **Task 1: kit Card/Kbd + «до»-capture** - `107647c` (feat)
2. **Task 2: миграция потребителей + мёртвый CSS** - `c00ce16` (feat)
3. **Task 3: скрин-ревью (checkpoint:human-verify)** — владелец: approved

## Decisions Made

- CardTitle рендерит h2 — все заголовки карточек проекта h2; div-канон кита дал бы регресс семантики заголовков (D-44-адаптация).
- Гейт NO-LUCIDE переформулировкой README (проза упоминала литеральное имя пакета) — гейт плана обязан быть зелёным как записан.

## Deviations from Plan

None — план исполнен как записан (карта потребителей из flagged assumptions сошлась свежим rg: btn 5 вхождений в 4 файлах, card 31 в 6, kbd 2 в App).

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Фаза 4 получает финальную компонентную базу (мотив D-37); 03-03 добавляет Tooltip/Collapsible пилотами D-40.
- «После»-набор скринов (18) — в .planning/ui-reviews/03-02-after/; следующий before-базлайн берётся от этого состояния.

---
*Phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3*
*Completed: 2026-11-19*
