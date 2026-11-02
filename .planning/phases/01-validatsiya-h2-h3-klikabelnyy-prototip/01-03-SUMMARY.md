---
phase: 01-validatsiya-h2-h3-klikabelnyy-prototip
plan: "03"
subsystem: ui
tags: [svg, hand-rolled-layout, drill-down, url-state, history-replacestate, playwright-e2e, wcag-aa, okabe-ito, design-tokens, react]

requires:
  - phase: 01 (plan 01-02)
    provides: экран шага (StepPanel/StepControls/NarrativeLine), форматтеры numbers.ts, @theme-токены, лекционный режим, openDrill-хук в store
  - phase: 01 (plan 01-01)
    provides: стор плеера (useSyncExternalStore, clamp 0..13), trace JSON v1, vitest/build-конвейер, playwright-пакет
provides:
  - SVG-диаграмма 2-3-1: 9 рёбер-весов (цвет neg/pos по знаку, толщина 1.5–4px ∝ |w|), подпись веса по hover/активной op, активная op #E69F00 (обводка 3px + тинт 10%), клик узла/ребра → drill
  - NumberDrilldown: exact-repr (гориз. скролл) + формат + формула + provenance из данных, цепное правило 1 уровень на backward, терминальная панель границы графа (шаг 12 ∂L/∂x), глоссарий ∂
  - URL-state: parseHash/toHash (кламп, мусор-ключи игнор) + подписка стора → history.replaceState + чтение hash до первого рендера — reload-restore (микропроверка DOCS-05)
  - 01-DESIGN-TOKENS.md — фиксация дизайна (критерий 4 ROADMAP): контрасты WCAG AA расчётом, сверка Okabe-Ito, нотация D-06, тинт 10%, мобильный тир, ∂-фолбэк с измерением
  - Playwright e2e 5/5 (§6.2) + 28 скриншотов self-check (14 шагов × default/.lecture)
affects: [01-04, phase-2]

actuals:
  tokens: 13600   # chars/4 по реализованному diff (54595 c / 4; оценка плана 40000 — перерасход заложен на e2e-итерации, фактически 1 прогон)
  tasks: 2
  commits: 3      # measured: git rev-list 76d601c..HEAD

plan_head_before: 76d601c02e868abdcc329383ab864aff8373e80d
plan_head_after: 1e35646

tech-stack:
  added: []        # новых пакетов нет — T-1-SC соблюдён (chromium — официальный установщик playwright)
  patterns:
    - "Толщина SVG-рёбер через инлайн CSS-переменную --w: stroke-width: calc(var(--w) * var(--edge-scale, 1)) — лекционный ×2 без JS-пересчёта layout"
    - "Drill-ref «Sym[flatIndex]» — единый формат для StepPanel/диаграммы; резолвер: текущий шаг (grads→outputs→inputs) → глобальные тензоры трейса, provenance только из данных (Pattern 3)"
    - "Активная op = чистая функция activeGeometry(step) по op+layer (structured data, не парсинг формул)"
    - "Активное ребро: оранжевая обводка-«кейсинг» (+3px) ПОД знаковым цветом — подсветка op без потери знакового кодирования"

key-files:
  created:
    - src/player/urlState.ts
    - src/ui/ArchitectureDiagram.tsx
    - src/ui/NumberDrilldown.tsx
    - tests/urlState.test.ts
    - playwright.config.ts
    - e2e/smoke.spec.ts
    - .planning/phases/01-validatsiya-h2-h3-klikabelnyy-prototip/01-DESIGN-TOKENS.md
  modified:
    - src/ui/App.tsx
    - src/index.css
    - vite.config.ts
    - .gitignore

key-decisions:
  - "Активные рёбра подсвечиваются «кейсингом» #E69F00 (+3px) под знаковым цветом, а не заменой цвета: UI-SPEC «обводка рёбер #E69F00» + сохранение знакового кодирования рёбер (Pitfall 6)"
  - "Терминальная панель ∂L/∂x содержит кликабельные ∂L/∂W1/∂L/∂b1 (openDrill) — панель-мост, а не тупик; текст дословно из Copywriting Contract"
  - "#E69F00 на белом 2.25:1 < 3:1 (WCAG 1.4.11) — принятое исключение с обоснованием в 01-DESIGN-TOKENS §2.4: акцент никогда не единственный носитель информации; пересмотр по итогам 01-04"
  - "e2e-скриншоты (28) — gitignored: регенерируемы pnpm e2e, не бинарный мусор в истории"
  - "∂-фолбэк подтверждён измерением ширины глифа (15.81px системный моно ≠ 19.20px advance JBM ≠ 38.41px notdef) — fonts.check даёт false-positive, не доверять"

patterns-established:
  - "URL-state: чистый модуль parseHash/toHash + wiring в App (init до рендера в module scope, подписка в useEffect) — Phase 2 добавляет роутер поверх без правок стора"
  - "E2E-спека импортирует formatKey из src/format — ассерты по мок-JSON в display-формате без дублирования форматирования"

requirements-completed: []

coverage:
  - id: D1
    description: "urlState: round-trip state ↔ hash, кламп #step=-1→0 / 99→13, NaN→0, mode только lecture, мусорные ключи игнорируются (T-1-04)"
    verification:
      - kind: unit
        ref: "tests/urlState.test.ts (10 passed: round-trip 14×2, кламп, мусор, mode) — прогон 2026-11-02"
        status: pass
    human_judgment: false
  - id: D2
    description: "URL пишется при каждом шаге/режиме через history.replaceState; reload восстанавливает шаг и режим; hash читается до первого рендера; невалидный #step=99 нормализуется"
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts#4) reload-restore (#step=7&mode=lecture, панели байт-в-байт) — 5/5 passed"
        status: pass
      - kind: automated_ui
        ref: "ad-hoc preview-smoke 23/23 PASS (URL на каждом шаге, лекция в hash, #step=99&mode=abc → #step=13, history не засорена)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SVG-диаграмма 2-3-1: 9 рёбер (6+3), цвет neg/pos по знаку, толщина 1.5–4px ∝ |w|, подпись по hover/активной op, активная op #E69F00 обводка+тинт, клик узла/ребра → drill; лекционный режим только CSS-переменными (--edge-scale ×2, --diag-scale 1.25)"
    verification:
      - kind: automated_ui
        ref: "preview-smoke: 9 рёбер (ария W1=6/W2=3), толщины min1.70/max4.00, neg/pos токены, шаг 1 → 6 активных рёбер W1 + 5 узлов, hover→подпись opacity 1, клик ребра → drill «W1 — −0.9229»"
        status: pass
      - kind: other
        ref: "e2e test 2: .lecture computed font-size 32px (переменные, без JS); pnpm build exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "NumberDrilldown: exact-repr полное значение с гориз. скроллом + отформатированное + формула + provenance; цепное правило 1 уровень на backward; закрытие Esc/backlink/смена шага"
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts#5) drill на шаге 10: exact 0.3905376917097937, формула, provenance «шаг…», drill-chain visible, Esc закрывает"
        status: pass
    human_judgment: false
  - id: D5
    description: "Граница графа: drill ∂L/∂x на шаге 12 — терминальная панель «входные данные / старт цепного правила» с кликабельными ∂L/∂W1/∂L/∂b1, не пустой экран (DOCS-02 edge case)"
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts#5) терминальная панель: заголовок+текст контракта+значение −0.16924; smoke: переход по ссылке → «∂L/∂W1 — 0.02814»"
        status: pass
    human_judgment: false
  - id: D6
    description: "01-DESIGN-TOKENS.md: все токены с ролями, расчёт контраста WCAG AA для всех текстовых пар (все PASS; запрет #F0E442 подтверждён 1.32:1; чистые neg/pos как текст FAIL → AA-варианты), сверка HEX Okabe-Ito, нотация D-06, тинт 10% единое значение, мобильный тир явная запись"
    verification:
      - kind: other
        ref: "grep WCAG → 3, grep мобильн → 1 (verify-команды плана); контраст-скрипт sRGB relative luminance, значения в doc из его вывода"
        status: pass
      - kind: other
        ref: "согласованность с src/index.css: токены перечислены из @theme-блока вручную сверено"
        status: pass
    human_judgment: false
  - id: D7
    description: "Playwright e2e 5/5 (первый шаг, полный проход+NaN-скан, шаг назад assert по мок-JSON, reload-restore, drill+граница) + 28 скриншотов (14 × default/.lecture)"
    verification:
      - kind: e2e
        ref: "pnpm e2e — 5 passed (4.1s); ls e2e/screenshots | wc -l = 28 → SCREENSHOTS-OK"
        status: pass
    human_judgment: false
  - id: D8
    description: "Визуальная пригодность: литмус «с 4–5 м» для .lecture, тинт изменившегося на экране, ∂-фолбэк глазами — материал скриншотов"
    verification:
      - kind: other
        ref: "∂-фолбэк подтверждён программно (ширина глифа 15.81px = системный моно, не notdef 38.41px) — см. 01-DESIGN-TOKENS §7"
        status: pass
    human_judgment: true
    rationale: "Оценка читаемости с 4–5 м и эстетики — человеческое зрение; агент без image-input в этой сессии (попытка чтения PNG отклонена рантаймом). Скриншоты e2e/screenshots/ + пост-вопрос 01-04"

duration: 14 min
completed: 2026-11-02
status: complete
---

# Phase 1 Plan 03: Drill-down + диаграмма + URL-state Summary

**Полный walkthrough UI: SVG-диаграмма 2-3-1 с рёбрами-весами и активной op, NumberDrilldown до отдельного числа (включая терминальную панель границы графа ∂L/∂x), URL-state через history.replaceState, дизайн зафиксирован 01-DESIGN-TOKENS.md с расчётом контрастов WCAG AA, e2e 5/5 + 28 скриншотов**

## Performance

- **Duration:** 14 min
- **Started:** 2026-11-02T13:01:56Z
- **Completed:** 2026-11-02T13:15:15Z
- **Tasks:** 2 (Task 1 tdd=true: RED→GREEN; Task 2 с precondition-установкой chromium)
- **Files modified:** 11 (7 создано, 4 изменено)

## Accomplishments

- Drill-down с любого уровня: клик по числу StepPanel, узлу или ребру диаграммы → NumberDrilldown с exact-repr (полный repr из JSON, горизонтальный скролл), формулой, provenance из данных (Pattern 3) и раскрытием цепного правила на 1 уровень для backward-шагов; глоссарий «∂L/∂W — градиент L по W» у любого ∂ (Pitfall 13)
- Граница графа (шаг 12, ∂L/∂x) — терминальная панель по Copywriting Contract с кликабельными мостами к ∂L/∂W1/∂L/∂b1 — не пустой экран (DOCS-02 edge case)
- SVG-диаграмма 2-3-1 hand-rolled: 9 рёбер-весов (цвет neg/pos SVG-токены, толщина 1.5–4px ∝ |w|), числовая подпись только по hover/активной op, активная op — обводка #E69F00 3px + тинт 10%; лекционный режим — только CSS-переменные (--edge-scale ×2 через calc, --diag-scale 1.25)
- URL-state (микропроверка DOCS-05): hash #step=N&mode=lecture пишется history.replaceState на каждом шаге, читается до первого рендера, reload восстанавливает состояние; невалидное клампится (T-1-04)
- 01-DESIGN-TOKENS.md (критерий 4 ROADMAP): контрасты всех текстовых пар рассчитаны и PASS AA; запрет жёлтого #F0E442 подтверждён расчётом (1.32:1); чистые neg/pos как текст FAIL → AA-варианты; сверка HEX с каноническим Okabe-Ito; тинт изменившегося 10% — единое значение (противоречие 01-02 закрыто); мобильный тир — явная запись (A-6); ∂-фолбэк с измеренным подтверждением
- Playwright e2e 5/5 по §6.2 RESEARCH + 28 скриншотов (14 шагов × default/.lecture) — материал self-check потолка ≤30 чисел и лекционного литмуса
- Закрыты оба deferral-стаба 01-02 (WINDOWS #2 пустой слот диаграммы, #3 openDrill без панели) — помечены fixed

## Task Commits

Each task was committed atomically (TDD):

1. **Task 1 RED: failing tests urlState — round-trip + кламп** — `9ef8771` (test)
2. **Task 1 GREEN: urlState + ArchitectureDiagram + NumberDrilldown + App wiring** — `36c5b37` (feat)
3. **Task 2: 01-DESIGN-TOKENS.md + playwright.config + e2e 5 проверок + скриншоты** — `1e35646` (feat)

**Plan metadata:** см. финальный docs-commit (ниже).

## Files Created/Modified

- `src/player/urlState.ts` — parseHash/toHash, кламп [0, maxStep], MAX_STEP
- `src/ui/ArchitectureDiagram.tsx` — SVG 2-3-1, activeGeometry, клики узлов/рёбер
- `src/ui/NumberDrilldown.tsx` — resolveRef (шаг → глобальные тензоры), терминальная панель, цепное правило, глоссарий
- `src/ui/App.tsx` — URL-wiring (init до рендера + подписка), слот диаграммы, drill ↔ StepPanel
- `src/index.css` — .diag-edge (--w × --edge-scale через calc), подписи по hover/active, exact-row, terminal-panel, .lecture +--edge-scale
- `tests/urlState.test.ts` — 10 тестов round-trip/кламп
- `playwright.config.ts`, `e2e/smoke.spec.ts` — e2e 5 проверок + 28 скриншотов
- `vite.config.ts` — vitest exclude e2e (Rule 3)
- `01-DESIGN-TOKENS.md` — контракт дизайна (D-06)

## Decisions Made

- См. key-decisions в frontmatter (кейсинг активных рёбер; терминальная панель-мост; исключение #E69F00 2.25:1; скриншоты gitignored; недоверие fonts.check)

## TDD Gate Compliance

План `type: execute` (plan-level гейты не применяются). Task 1 (tdd=true) — RED→GREEN:

- RED `9ef8771`: модуль `player/urlState` отсутствовал → import-fail, «no tests» (тот же законный RED-паттерн, что в 01-02 Task 1)
- GREEN `36c5b37`: 10/10 urlState + вся реализация; полные сьюты 30/30

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest подхватывал playwright-спеку**
- **Found during:** Task 2 (pnpm test после появления e2e/)
- **Issue:** default include vitest (`**/*.spec.ts`) тянул e2e/smoke.spec.ts → «Playwright Test did not expect test() to be called here», pnpm test красный
- **Fix:** `test.exclude: ['e2e/**', ...]` в vite.config.ts; defineConfig из `vitest/config` (первая попытка `/// <reference types="vitest" />` не прошла tsc -b — свойство test вне типа UserConfig)
- **Files modified:** vite.config.ts (сверх files_modified плана — конфиг-файл, ближайший к задаче)
- **Verification:** pnpm test 30/30 (4 файла), pnpm build exit 0, pnpm e2e 5/5
- **Committed in:** 1e35646

**2. [Фиксация противоречия источников] Активные рёбра: замена цвета vs сохранение знака**
- **Found during:** Task 1 (чтение UI-SPEC + Pitfall 6)
- **Issue:** UI-SPEC Color «обводка узла/рёбер #E69F00» в лоб заменяет знаковый цвет ребра — теряется кодирование знака весов на активной op
- **Fix:** оранжевый «кейсинг» (+3px) ПОД знаковым цветом ребра — подсветка op без потери знака; узлы — обводка 3px + тинт 10% как в спеке
- **Verification:** preview-smoke «шаг 1: 6 рёбер W1 с обводкой #E69F00» PASS + знаковые цвета сохранены (проверка neg/pos токенов)
- **Committed in:** 36c5b37

---

**Total deviations:** 2 auto-fixed (1×Rule 3, 1 фиксация противоречия)
**Impact on plan:** Поведенческие критерии выполнены полностью; новых пакетов нет (T-1-SC), числа трейса не тронуты (D-03: xor-trace.json не изменялся), store-библиотек нет (правило пользователя соблюдено).

## Known Stubs

None — оба стаба 01-02 (слот диаграммы, openDrill без панели) закрыты этим планом (WINDOWS #2, #3 → fixed). Окно #1 (правило zustand) — постоянное правило, остаётся open by design.

## Issues Encountered

- **Image-input недоступен в этой сессии** (попытка Read PNG отклонена рантаймом — как в 01-02): визуальный литмус «с 4–5 м» и глазная оценка ∂/тинта не выполнены агентом. Частичное покрытие: ∂-фолбэк подтверждён измерением ширины глифа (15.81px системный моно ≠ advance JBM 19.20px ≠ notdef 38.41px), кегли/зоны/подписи — DOM-проверками e2e/smoke. Полная визуальная оценка — скриншоты e2e/screenshots/ (28) для человека + наблюдение 01-04. Coverage D8 — human_judgment.
- `document.fonts.check` вернул true на ∂ в JBM (false-positive) — опровергнуто измерением; вывод зафиксирован в key-decisions.

## User Setup Required

None - статик-прототип без внешних сервисов. (Публикация на хостинг — user_setup плана 01-04.)

## Next Phase Readiness

- Прототип полный для юзабилити H3 (план 01-04): walkthrough вперёд/назад, диаграмма с активной op, drill-down с любого уровня включая границу графа, URL-state, лекционный режим; 28 скриншотов — готовый материал литмуса и протокола
- Для Phase 2: urlState/резолвер drill-ref — стабильные контракты поверх trace JSON v1; диаграмма — чистая функция (trace, stepIndex) по Pattern 1
- Дизайн зафиксирован (D-06): фазы 2–3 не перекрашивают — любые изменения токенов через решение уровня D-06

## Self-Check: PASSED

- Файлы: 7/7 ключевых артефактов планa FOUND на диске (urlState.ts, ArchitectureDiagram.tsx, NumberDrilldown.tsx, tests/urlState.test.ts, playwright.config.ts, e2e/smoke.spec.ts, 01-DESIGN-TOKENS.md)
- Коммиты: 9ef8771, 36c5b37, 1e35646 — все ancestors HEAD; commits measured (ledger 76d601c..HEAD) = 3
- Верификации плана: pnpm test 30/30 (format 7 + player 10 + trace-sanity 3 + urlState 10); pnpm e2e 5/5 passed; pnpm build exit 0 (dist/ создан); SCREENSHOTS-OK (28); grep WCAG → 3; grep мобильн → 1
- Числа трейса: src/data/xor-trace.json не изменялся (git diff планa — файла нет)
- Новых пакетов нет (T-1-SC: package.json/pnpm-lock.yaml не менялись), store-библиотек нет, zustand отсутствует

---

*Phase: 01-validatsiya-h2-h3-klikabelnyy-prototip*
*Completed: 2026-11-02*
