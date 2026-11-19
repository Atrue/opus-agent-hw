---
phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3
plan: "05"
subsystem: ui
tags: [animation, travel-halo, wave-cascade, zoom, examples, print-gate, design-sync]

requires:
  - phase: 03 (план 04)
    provides: движок D-50 (motion), MotionConfig, паттерн per-point ассертов
provides:
  - Точка 1: travel-гало ленты + симметричный конверт подсветки графа + fade+rise значений
  - Точка 3: delay-каскад волны backprop (~60 мс/ребро, детерминированные индексы)
  - Дополнения владельца (ревью Task 3): плавный зум канвы (250 мс, transform+габариты), переезды в «Примерах» (гало строки + fade+rise ŷ/вердиктов), якорное кольцо обводки активного шага (переезд, внутренние скорости — как было)
  - Финализация print-гейта (все новые анимации фазы), DESIGN.md §8 синхронизирован с D-50
affects: [phase 4 (экраны сценариев на готовом моушн-языке)]

actuals:
  tokens: 52000
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns: [travel-гало (bandRef/offsetLeft/offsetTop, useLayoutEffect, CSS-transition — функция структуры), якорное кольцо группы шага, delay-каскад через inline CSS-переменную из чистой структуры]

key-files:
  created: []
  modified: [src/ui/stepper/StepperBand.tsx, src/ui/graph/ComputationGraph.tsx, src/ui/dataset/ExamplesPanel.tsx, src/index.css, e2e/smoke.spec.ts, DESIGN.md]

key-decisions:
  - "Travel-гало: JS ставит только цель transform (offsetLeft/offsetTop — функция структуры), плавность — CSS; useLayoutEffect — без анимации на первом кадре"
  - "Каскад волны: animation-delay calc(var(--flow-i) × 60ms), индексы — декларативный Map из порядка структуры (oxlint immutability — без мутации в рендере)"
  - "Дополнения владельца в ревью Task 3: зум (transition на .graph-canvas — канал scale живёт на svg, не на обёртке), «Примеры» (гало строки: перекрёстный фейд 10%-тинта не читался), обводка шага (якорное кольцо переезжает; узловые stroke-переходы возвращены к мгновенным — «как было»)"
  "Активная пилюля прозрачна — фон/ринг несёт гало (пульс ::after не тронут)"

patterns-established:
  - "Гало-переезд как универсальный паттерн подсветки-«приезда»: лента, строка «Примеров», якорь шага на графе — одна механика (цель из структуры + CSS-transition 250 мс cubic-bezier(0,0,0.2,1))"

requirements-completed: [ROADMAP-3.3]  # финальный план декларатора; 3.1/3.2 закрыты ранее

coverage:
  - id: D1
    description: "Точка 1: travel-гало ленты (позиция = f(структуры), ретаргет), конверт графа 250 мс ease-out, значения fade+rise 200 мс"
    requirement: ROADMAP-3.3
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts#тест 20 (гало = активная пилюля x/width, переезды) + 17 проверок без правок"
        status: pass
    human_judgment: false
  - id: D2
    description: "Точка 3: волна backprop с delay-каскадом (индексы из структуры, семантика data-flow/цвет сохранена)"
    requirement: ROADMAP-3.3
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts#тест 20 (--flow-i 0..k-1; animation-name === none под reduce)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Гейты финализированы: print-список покрывает все новые анимации фазы; reduced-motion блок не менялся; NFR-01 не затронут (числа в DOM синхронно)"
    requirement: ROADMAP-3.3
    verification:
      - kind: other
        ref: "rg print-блок index.css (tooltip/collapsible/step-halo/value-changed/zoom/samples/g-step-halo); 20 e2e ×2 бит-идентичен"
        status: pass
    human_judgment: false
  - id: D4
    description: "Градус моушна D-48 по всем точкам (1–3 + зум + «Примеры» + обводка) — скрин-ревью владельцем"
    requirement: ROADMAP-3.3
    verification: []
    human_judgment: true
    rationale: "Субъективное визуальное суждение (D-48); владелец ответил approved после четырёх итераций доработок в чате"

duration: 55 min
completed: 2026-11-19
status: complete
---

# Phase 3 Plan 05: Точки 1 и 3 + финализация гейтов/канона Summary

**Моушн-язык фазы собран: travel-переезды (лента, строка «Примеров», якорное кольцо шага), волна с каскадом, плавный зум — единый ритм 250 мс; print/reduced-motion гейты финальны; владелец approved после живых итераций.**

## Performance

- **Duration:** ~55 min (включая 4 итерации ревью владельца с живой проверкой)
- **Completed:** 2026-11-19T18:4xZ
- **Tasks:** 3 (точки 1+3 / финализация / скрин-ревью blocking — расширенный цикл)
- **Files modified:** 6; commits: 7

## Accomplishments

- Точка 1: travel-гало ленты — единственный оверлей .step-halo в .step-band (ring+тинт активной пилюли, translateX 250 мс cubic-bezier(0,0,0.2,1), позиция = offsetLeft пилюли через bandRef + useLayoutEffect — функция структуры, без анимации на первом кадре; активная пилюля прозрачна, пульс не тронут; автоскролл на querySelectorAll — гало не ломает индексацию). Конверт подсветки графа 250 мс ease-out (симметричный приезд/гашение). Значения fade+rise 200 мс (.value-changed + step-value-rise).
- Точка 3: delay-каскад волны — animation-delay: calc(var(--flow-i) × 60ms); индексы — декларативный Map из порядка GRAPH_EDGES (правка по oxlint immutability: без мутации счётчика в рендере). Направление/цвет — прежняя семантика (data-flow, reverse).
- Финализация print-гейта: покрывает ВСЕ новые анимации фазы (enter/exit кита, travel-гало ленты, fade+rise значений, зум, гало строки «Примеров», якорное кольцо, каскад) — печать ловит конечные состояния; глобальный reduced-motion блок не менялся.
- DESIGN.md §8 синхронизирован: строки travel-гало/коллапса/каскада/зума с фактическими параметрами, ссылка D-50, формула MotionConfig.
- e2e тест 20: гало = активная пилюля (x/width по шагам), --flow-i 0..k-1, кольцо обводки центрировано на якоре; все прежние 19 проверок без правок.
- Итерации ревью владельца (живая проверка браузером, каждая закрыта фиксом + гейтами):
  1. «добавить анимацию на зум» → переход transform+габариты на .graph-zoom-layer/.graph-canvas;
  2. «зума на графе нет» → два бага: transition был не на том узле (scale живёт на svg, а не обёртке — канвас прыгал при анимированных габаритах) + кнопки усохли до 20px (в icon-sm не было min-height, паритет .btn 40px утрачен в 03-02) — исправлено, проверено живьём (scale 1.15→1.23→1.25);
  3. «в блоке Примеры — такой же плавный переход» → перекрёстный фейд td-тинта (не читался) → заменён настоящим travel-гало строки (translateY 44→67 проверено живьём) + ŷ/вердикты fade+rise;
  4. «обводка на следующем шаге не переезжает (скорости внутри — как было)» → узловые stroke-переходы сняты (мгновенно, как до фазы), добавлено якорное кольцо .g-step-halo (переезд к оп-узлу группы, 190→268 проверено живьём; якорь = оп-узел, иначе первый узел).
- Итог ревью: **approved** (градус D-48 по всем точкам).
- Гейты финальные: 144 юнит + lint 0 + tsc 0 + 20 e2e ×2 бит-идентичен; diff по src/tensor = 0; HALO-WIRED/WAVE-AND-CANON/FINAL-GATES зелёные.

## Task Commits

1. **Task 1–2: точки 1/3 + финализация** (feat ×1)
2. **Task 3: скрин-ревью (blocking)** — 4 итерации доработок владельца (feat/fix ×6) → approved

## Decisions Made

- Гало-переезд — универсальный паттерн подсветки-«приезда» (лента/строка/якорь): одна механика, один ритм.
- Живая браузерная верификация (browse + dev-сервер) для каждой итерации ревью: сэмплы computed-стилей во времени доказывали интерполяцию до предъявления владельцу.

## Deviations from Plan

### Owner-directed additions (Task 3 review loop)

- **Зум, «Примеры», якорное кольцо обводки** — не входили в план (точки 1–3 only); добавлены прямыми указаниями владельца в чате, каждое — с живой верификацией и полными гейтами. Запрет «зум-обёртку не трогать» пересмотрен самим владельцем (анимация канала зума не конфликтует с коллапсом — Pitfall 6 соблюдён: разные узлы).

---

**Total deviations:** 1 категория (owner-directed scope additions в ревью)
**Impact on plan:** расширение точек применения D-47 тем же движком/ритмом; контракты экрана не тронуты.

## Issues Encountered

- oxlint react/immutability на мутации счётчика в рендере — переработано на декларативный Map.
- e2e-ассерт «края»/«data-collapsed» — конвенции учтены (см. 03-03/03-04 SUMMARY).

## User Setup Required

None.

## Next Phase Readiness

- Фаза 3 завершена по трём критериям ROADMAP: shadcn подключён (3.1 — 03-01..03-03), решение журнализировано D-50 (3.2 — 03-04), точки применены (3.3 — 03-04/03-05 + дополнения владельца).
- Далее: /gsd-verify-work 03 (регрессионный гейт + верификатор), затем планирование фазы 4 (сценарии, роутинг, лекционный режим).

---
*Phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3*
*Completed: 2026-11-19*
