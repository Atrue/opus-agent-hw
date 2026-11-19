---
phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3
plan: "03"
subsystem: ui
tags: [radix, tooltip, collapsible, pilot, d40, floating-ui]

requires:
  - phase: 03 (план 01)
    provides: ядро кита + radix tooltip/collapsible в dependencies, kit-инфраструктура
provides:
  - kit Tooltip (Radix; z-50 портал, enter/exit tw-animate-css) и kit Collapsible (collapsible-down/up)
  - NumberHint на kit Tooltip — пилот D-40 пройден, вердикт исполнен: @floating-ui/react удалён (delay-200)
  - LinkHistory на kit Collapsible с нативным open-контрактом <details> (атрибут + DOM-свойство)
  - e2e тест 18: пилот-критерии (дождь/края/touch/open-зеркало) + расширение Pitfall-4-ассерта на kit
affects: [03-04/03-05 (анимации на гейтах), phase 4 (тултипы/дисклоужеры на ките)]

actuals:
  tokens: 39000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns: [нативный open-контракт <details> поверх Collapsible (атрибут+DOM-свойство зеркалом), asChild-триггер на summary, вычитка генераций: монопакет radix-ui → scoped-пакеты апрува]

key-files:
  created: [src/ui/kit/tooltip.tsx, src/ui/kit/collapsible.tsx]
  modified: [src/ui/kit/index.ts, src/ui/numbers/NumberHint.tsx, src/ui/chain/LinkHistory.tsx, e2e/smoke.spec.ts, package.json, pnpm-lock.yaml]

key-decisions:
  - "Вердикт D-40 (владелец, delay-200-remove-floating): radix покрывает контракт NumberHint — @floating-ui/react удалён; floating-ui-dom остаётся транзитивно (radix-popper)"
  - "Open-контракт LinkHistory сохранён конструкцией: Collapsible.Root + эффект-зеркало (атрибут open + expando-свойство), триггер asChild на прежнем summary — e2e :282/:283/:295 без правок"
  "delayDuration 200 + disableHoverableContent — компенсация restMs-семантики (radix не детектит остановку указателя)"

patterns-established:
  - "Пилот до массового использования (D-40): машинные критерии контракта в e2e → решение владельца → исполнение вердикта"

requirements-completed: []  # ROADMAP-3.1/3.3 — shared-ID гейт: 03-04/03-05 ещё декларируют 3.3

coverage:
  - id: D1
    description: "kit Tooltip + Collapsible на утверждённых radix-пакетах (без cn/монопакета/иконок)"
    requirement: ROADMAP-3.1
    verification:
      - kind: other
        ref: "git diff package.json после add — только удаление @floating-ui/react по вердикту; NO-LUCIDE"
        status: pass
    human_judgment: false
  - id: D2
    description: "NumberHint на kit Tooltip: контракт сохранён машинно (портал/z-50/края/дождь/touch/Esc/aria) — пилот D-40 зелёный"
    requirement: ROADMAP-3.3
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts#тест 1 (тултип-контракт без правок) + #тест 18 (дождь/края/touch/animation-name===none)"
        status: pass
    human_judgment: false
  - id: D3
    description: "LinkHistory на kit Collapsible: нативный open-контракт + интеракция disclosure сохранены"
    requirement: ROADMAP-3.3
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts#тест 12 (без правок: :282/:283/:286/:295) + #тест 18 (open-зеркало, collapsible animation-name===none)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Вердикт D-40 исполнен: @floating-ui/react удалён из dependencies при delayDuration 200"
    requirement: ROADMAP-3.1
    verification:
      - kind: other
        ref: "pnpm remove; rg-аудит src/ — импортов floating нет; 18 e2e ×2 бит-идентичен"
        status: pass
    human_judgment: false

duration: 26 min
completed: 2026-11-19
status: complete
---

# Phase 3 Plan 03: Пилоты D-40 — Tooltip/Collapsible Summary

**Radix-тултип доказанно покрыл контракт NumberHint (дождь/края/touch машинно), Collapsible воспроизвёл интеракцию <details> с нативным open-зеркалом; вердикт владельца delay-200-remove-floating исполнен — @floating-ui/react удалён.**

## Performance

- **Duration:** ~26 min
- **Completed:** 2026-11-19T16:55Z
- **Tasks:** 3 (пилоты / checkpoint-decision / исполнение вердикта)
- **Files modified:** 8 (2 создано, 6 изменено)

## Accomplishments

- kit Tooltip и Collapsible сгенерированы CLI 4.23.0; генерации нового поколения реестра импортировали монопакет `radix-ui` и пакет `cn` — оба сняты, импорты переписаны на утверждённые scoped-пакеты @radix-ui/react-tooltip и @radix-ui/react-collapsible (та же API-поверхность); Arrow убран (num-hint — прямоугольник); collapsible-down/up (tw-animate-css, --radix-collapsible-content-height) в базовом классе Content.
- NumberHint → kit Tooltip: обёртка-изоляция одним файлом сохранена (док-комментарий обновлён); Trigger asChild (SVG-якоря через клонирование), Portal+z-50 (num-hint поверх графа, D-35 фикс 2), sideOffset 6, avoidCollisions (flip/shift), delayDuration 200 + disableHoverableContent (компенсация restMs), Esc-dismiss и aria-describedby — radix-канон; контент идентичен (метка/формула/градиент/note).
- LinkHistory → kit Collapsible: нативный open-контракт <details> сохранён конструкцией — контролируемый Root + эффект-зеркало ставит атрибут `open` и DOM-свойство `open` на корне; триггер — прежний `<summary>` через asChild (e2e-локатор 'summary' жив); e2e :282/:295 работают без правок (риск-флаг PATTERNS снят конструкцией).
- e2e тест 18 (расширение, существующие не правились): (а) animation-name === 'none' на открытом kit-тултипе и Content коллапсибла (Pitfall 4 закрыт машинно); (б) дождь — 3 узла подряд → 0 открытых number-hint; (в) края — правый живой узел → boundingBox тултипа в viewport; (г) touch — тап → drill-panel, number-hint отсутствует (LOCKED R5 §2c к3); (д) open-зеркало.
- Вердикт D-40 исполнен (delay-200-remove-floating): @floating-ui/react удалён из dependencies; честная gz-дельта — бандл не изменился (dep не импортировался с пилота, tree-shaken), floating-ui-dom остаётся транзитивно через radix-popper (предсказано RESEARCH §3.4). JS за план: 115.51 → 123.69 KB gz (+8.18 — tooltip+collapsible).
- Гейты: 144 юнит + lint 0 + tsc 0 + 18 e2e ×2 бит-идентичен; diff по src/tensor = 0; PILOTS-WIRED/FINAL-GATES зелёные.

## Task Commits

1. **Task 1: Пилоты + e2e 18** - `7f4d9e6`-предыдущий (feat — см. git log: «пилоты D-40 …»)
2. **Task 2: checkpoint-decision** — владелец: delay-200-remove-floating
3. **Task 3: Исполнение вердикта + финальные гейты** (feat — «вердикт D-40 исполнен …»)

## Decisions Made

- Владелец утвердил delayDuration 200 и удаление @floating-ui/react (рекомендация ресёрча).
- Проза док-комментария NumberHint упоминает floating только как историю/инструкцию отката — импортов нет (grep-аудит чист).

## Deviations from Plan

None — план исполнен как записан; оба «дешёвых отката» (floating/details) не понадобились.

## Issues Encountered

- e2e (в) «края» первоначально выбирает самый правый якорь без живого значения (hint=null → тултипа нет) — критерий уточнён: прогон доводится до шага 5 (после bce станции несут числа) и выбирается самый правый якорь с живым значением.

## User Setup Required

None.

## Next Phase Readiness

- Кит полный: Button/Card/Kbd/Tooltip/Collapsible; 03-04 решает анимационный движок (D-50) и точку 2 (коллапс нейрона).
- Print-гейт: селекторы kit enter/exit финализируются в 03-05 (текущий print-блок не гасит animate-in/collapsible — печать ловит редкий промежуточный кадр только вне reduced-окружения; 03-05 Task 2 закрывает).

---
*Phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3*
*Completed: 2026-11-19*
