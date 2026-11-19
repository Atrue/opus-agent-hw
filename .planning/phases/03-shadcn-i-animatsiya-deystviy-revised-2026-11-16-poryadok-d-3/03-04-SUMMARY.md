---
phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3
plan: "04"
subsystem: ui
tags: [motion, animation, collapse, d50, svg, interrupt-restart]

requires:
  - phase: 03 (планы 01–03)
    provides: кит (Button/Card/Kbd/Tooltip/Collapsible), гейты enter/exit, токен-мост
provides:
  - Журнализированное решение D-50: motion 14.14.0 — движок анимаций фазы (выбор владельца; GSAP/Spline отклонены; частичная супрессия D-23)
  - MotionConfig reducedMotion="user" на корне App (гейт JS-слоя анимаций)
  - Точка 2 D-47: плавный прерываемый коллапс рамки-нейрона (250 мс ease-in-out, интерполяция translate к центру блока + opacity между детерминированными кадрами)
  - Print-гейт расширен (блок-нейрон пиннится в конечном состоянии)
affects: [03-05 (точки 1 и 3 на движке D-50, финализация print-списка, DESIGN §8), phase 4 (экраны сценариев с motion)]

actuals:
  tokens: 34000
  tasks: 2
  commits: 1

tech-stack:
  added: [motion@14.14.0]
  patterns: [MotionConfig reducedMotion=user как гейт JS-анимаций, origin-агностичная SVG-интерполяция (translate к известному кадру без scale/FLIP), per-point ассерты конечных состояний в e2e (Pitfall 5)]

key-files:
  created: []
  modified: [DECISIONS.md, package.json, pnpm-lock.yaml, src/ui/app/App.tsx, src/ui/graph/ComputationGraph.tsx, src/index.css, e2e/smoke.spec.ts]

key-decisions:
  - "D-50: motion 14.14.0 — выбор владельца (рекомендация ресёрча css-only отклонена); GSAP отклонён лицензионно, Spline — по D-45"
  - "Коллапс интерполирует translate к центру блока (dx/dy из frames.ts) + opacity — origin-агностично (transform-атрибут SVG не даёт надёжного scale-origin), без DOM-измерений"
  "Print-гейт: JS-анимации конечны (250 мс, детерминированные кадры) + блок пиннится opacity:1; CSS-слой гасится как раньше"

patterns-established:
  - "Per-point e2e-ассерты конечных состояний для JS-анимаций (после interact — ждём unmount/появление, потом скриншоты)"

requirements-completed: []  # ROADMAP-3.2 закрыт этим планом; 3.3 — 03-05 (shared-ID)

coverage:
  - id: D1
    description: "Решение по анимационному движку журнализировано (D-50, частичная супрессия D-23; GSAP/Spline — с обоснованиями)"
    requirement: ROADMAP-3.2
    verification:
      - kind: other
        ref: "rg 'D-50' DECISIONS.md (D50-JOURNALED gate)"
        status: pass
    human_judgment: false
  - id: D2
    description: "motion@14.14.0 установлен по отдельному пакетному апруву владельца"
    requirement: ROADMAP-3.2
    verification:
      - kind: other
        ref: "git diff package.json = +motion 14.14.0 (точная версия); легитимность сверена на реестре (MIT, popmotion/motiondivision, без postinstall)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Точка 2 D-47: коллапс/раскрытие плавные (250 мс ease-in-out), прерываемые; конечные кадры бит-идентичны (e2e 17 без правок); NFR-01 не затронут (числа в DOM синхронно)"
    requirement: ROADMAP-3.3
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts#тест 17 (без правок) + #тест 19 (interrupt, конечные состояния, живые station-value)"
        status: pass
      - kind: other
        ref: "GEOMETRY-UNTOUCHED + ZOOM-LAYER-UNTOUCHED; 19 e2e ×2 бит-идентичен"
        status: pass
    human_judgment: false

duration: 22 min
completed: 2026-11-19
status: complete
---

# Phase 3 Plan 04: Анимационный движок D-50 + плавный коллапс Summary

**Владелец выбрал motion 14.14.0 как движок фазы (D-50, частичная супрессия D-23); точка 2 D-47 реализована: коллапс рамки-нейрона — прерываемая интерполяция translate+opacity между детерминированными кадрами, 250 мс ease-in-out, при бит-идентичном e2e.**

## Performance

- **Duration:** ~22 min
- **Completed:** 2026-11-19T17:2xZ
- **Tasks:** 2 (checkpoint-decision движка + пакетный апрув / реализация)
- **Files modified:** 7
- **gz:** JS 123.69 → 172.02 KB (+48.33 — motion; прогноз ресёрча +45.0, честная дельта зафиксирована)

## Accomplishments

- Два блокирующих решения владельца: движок = **motion** (рекомендация css-only отклонена) и пакетный апрув motion@14.14.0 (MIT, popmotion/motiondivision, без postinstall, точная версия). D-50 журнализирован в DECISIONS.md: обоснование, гибрид (CSS-слой графа остаётся под глобальным гейтом), инфраструктурная стоимость (поверхность e2e-детерминизма — per-point ассерты), GSAP/Spline — с обоснованиями.
- MotionConfig reducedMotion="user" на корне App — гейт JS-слоя по формуле D-48 (transform мгновенно, opacity-фейд конечен).
- Коллапс (точка 2): AnimatePresence + motion.g — члены рамки exit/enter интерполируют translate к центру блока-нейрона (dx/dy вычислены из детерминированной геометрии frames.ts — origin-агностично, без scale и без DOM-измерений) + opacity; блок — fade-in/out; 250 мс ease-in-out (конверт D-48); interrupt-restart by design (ретаргет с текущего кадра, проверен тройным dblclick). Зум-обёртка, геометрия, обработчики dblclick/Enter, station-value — не тронуты; комментарий «мгновенно, без transition» заменён описанием переходного состояния.
- Print-гейт: .g-frame-block пиннится opacity:1 (терминальное состояние); док-комментарий гейтов фиксирует JS-слой (конечность 250 мс + per-point ассерты).
- e2e тест 19: per-point ассерты конечных состояний (Pitfall 5 — смягчение новой поверхности детерминизма motion), interrupt-restart, живые station-value после цикла коллапсов, ввод не блокируется. Тест 17 — без правок.
- Гейты: 144 юнит + lint 0 + tsc 0 + 19 e2e ×2 бит-идентичен; D50-JOURNALED / GEOMETRY-UNTOUCHED / ZOOM-LAYER-UNTOUCHED зелёные.

## Task Commits

1. **Task 1: checkpoint-decision (движок + пакетный апрув)** — владелец: motion + approve-motion
2. **Task 2: D-50 + коллапс + гейты** (feat — «D-50 + плавный коллапс…»)

## Decisions Made

- Интерполяция translate-к-центру вместо scale: transform-атрибут SVG не даёт надёжного origin для scale (проверено по исходникам motion: renderSVG пишет attrs); translate origin-агностичен и вычисляется из чистой геометрии — «два известных кадра» без FLIP.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Technical] e2e-ассерт начального состояния рамки**
- **Found during:** Task 2 (тест 19)
- **Issue:** `toHaveAttribute('data-collapsed', 'false')` — атрибут отсутствует в раскрытом состоянии (undefined), конвенция теста 17 — `not.toHaveAttribute`
- **Fix:** ассерт приведён к конвенции (`not.toHaveAttribute('data-collapsed')`)
- **Committed in:** task commit

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** нет — тест-конвенция, не контракт.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- 03-05: точки 1 и 3 (travel-гало ленты, delay-каскад волны) на движке D-50, финализация print-списка, DESIGN §8, скрин-ревью градуса моушна (blocking).
- Готовый паттерн: per-point ассерты конечных состояний + origin-агностичные интерполяции из известной геометрии.

---
*Phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3*
*Completed: 2026-11-19*
