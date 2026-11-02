---
phase: 01-validatsiya-h2-h3-klikabelnyy-prototip
plan: "02"
subsystem: ui
tags: [tailwind4, css-first, okabe-ito, design-tokens, d3-format, typography, lecture-mode, react, tdd]

requires:
  - phase: 01 (plan 01-01)
    provides: walking skeleton — стор плеера (useSyncExternalStore, clamp 0..13), trace JSON v1, шрифты Inter/JetBrains Mono, vitest/build-конвейер
provides:
  - Полноформатный экран шага по layout-контракту UI-SPEC (header 56 / main 55:45 gap 32 / bottom 72, фиксированные слоты)
  - @theme дизайн-токены Okabe-Ito + AA-тексты + фазные цвета + --num-size/--ui-size; класс .lecture (только CSS-переменные, 16→32px)
  - Форматтеры чисел: formatKey (.4g / |x|<1e-3 → .3e), exactRepr, display-минус U+2212 (src/format/numbers.ts)
  - Анти-«стена цифр»: чистая модель stepRows (≤7 ключевых / ≤30 на экране, highlight changed, «+N» до drill-down)
  - План Б §5.5 реализован: ASCII-индексы в генераторе + <sub>-рендер в UI (глиф-проверка fontsource выявила отсутствие ₁₂/⊙/←/→)
affects: [01-03, 01-04, phase-2]

actuals:
  tokens: 14174   # chars/4 по реализованному diff (code+tests+tools+.gitignore)
  tasks: 2
  commits: 6      # measured: git rev-list f58d5eb..HEAD

plan_head_before: f58d5eb27320e113231487662f899c6bc36bb4cf
plan_head_after: 149a19338e1f1d29a2ec81c83b0cbeaf27404537

tech-stack:
  added: []        # новых пакетов нет — T-1-SC соблюдён
  patterns:
    - "Токены только в src/index.css (@theme); компоненты не содержат своих цветов/кеглей — кроме инлайн color-mix тинтов от переменных"
    - "Чистая модель дефолтного вида шага (stepRows.buildStepRows) отделена от рендера и покрыта юнит-тестами потолков"
    - "План Б для глифов: данные — ASCII, отображение — <sub>-рендер (SubscriptText); ∂ оставлен Unicode с системным фолбэком (D-06)"
    - "Display-минус U+2212 конвертируется в одном месте (format/numbers.ts); экспонента — ASCII, как в образце UI-SPEC «−2.451e-5»"

key-files:
  created:
    - src/format/numbers.ts
    - src/ui/StepPanel.tsx
    - src/ui/StepControls.tsx
    - src/ui/NarrativeLine.tsx
    - src/ui/stepRows.ts
    - src/ui/SubscriptText.tsx
    - tests/format.test.ts
    - tests/player.test.ts
  modified:
    - src/index.css
    - src/ui/App.tsx
    - tools/reference/gen_mock_trace.py
    - src/data/xor-trace.json
    - .gitignore

key-decisions:
  - "План Б §5.5 применён: ₁₂/⊙/←/→ отсутствуют в JetBrains Mono/Inter (fontsource 5.3.0, проверено по unicode.json) → генератор пишет ASCII-индексы (z1/W1), ⊙→*, ←→=, →→«->»; UI рендерит <sub>; 199 чисел трейса бит-идентичны, регенерация byte-stable"
  - "∂ оставлен Unicode (нотация D-06 заблокирована пользователем): глифа нет в шрифтах — рендер системным фолбэком (без tofu на macOS/Windows/Linux); литмус — скриншоты e2e 01-03 и юзабилити 01-04"
  - "Accent-тинт изменившегося числа — 10% (must_haves плана и Interaction Contract), не 20% (противоречие в Color-секции UI-SPEC); зафиксировать единое значение в 01-DESIGN-TOKENS.md (план 01-03)"
  - "Потолок «3–7 ключевых чисел»: скалярные op-шаги (4,5,6,7,8) показывают 1–2 ключевых числа по природе данных; жёсткие потолки ≤7/≤30 — enforce тестами; пол «3» — не для скалярных шагов"
  - "Чистая модель stepRows.ts и рендер SubscriptText.tsx вынесены в отдельные файлы (oxlint only-export-components / fast-refresh)"

patterns-established:
  - "Формула↔число: результат рендерится строкой «sym = значения» под формулой; changed-маппинг через normalizeSym (∂L/∂→d, ŷ→yhat) + startsWith для W2[0,0]"
  - "Лекционный режим = только CSS-переменные (--num-size/--ui-size/--diag-scale) на классе .lecture корня — литмус 16→32px проверен в preview"

requirements-completed: []

coverage:
  - id: D1
    description: "@theme-токены: 10 цветовых (7 базовых + AA-тексты + phase-summary) + --num-size/--ui-size + класс .lecture"
    verification:
      - kind: other
        ref: "grep: 10 --color-* токенов, HEX-точность 9/9, grep -c lecture ≥ 1 — прогон 2026-11-02"
        status: pass
      - kind: other
        ref: "pnpm build (tsc strict + vite build) exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Форматтеры чисел: .4g ключевые, .3e для |x|<1e-3, exactRepr без округления, display-минус U+2212 (экспонента ASCII)"
    verification:
      - kind: unit
        ref: "tests/format.test.ts (7 passed: .4g/.3e, U+2212, exactRepr round-trip, ≤9 символов на всех числах трейса)"
        status: pass
    human_judgment: false
  - id: D3
    description: "План Б §5.5: генератор на ASCII-индексы (z1/W1, ⊙→*, ←→=, →→«->»), трейс регенерирован, числа не тронуты"
    verification:
      - kind: other
        ref: "двойная регенерация + cmp → BYTE-STABLE-OK; сравнение с HEAD: 199/199 чисел идентичны, изменились только строки нотации; gradCheck 2.88e-9"
        status: pass
      - kind: unit
        ref: "tests/trace-sanity.test.ts 3/3 (validateTrace принимает новый трейс)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Экран шага: layout-зоны header 56 / main 55:45 gap 32 / bottom 72, фиксированные слоты; фазные бейджи A-5; клавиатура; focus-ring"
    verification:
      - kind: automated_ui
        ref: "ad-hoc playwright preview-smoke 22/22 PASS (высоты зон 56/72 стабильны между шагами, ←/→/«К началу», бейджи, disabled на границах, нет console-ошибок); постоянный e2e — план 01-03"
        status: pass
      - kind: other
        ref: "pnpm build exit 0; pnpm lint src tests — без warning"
        status: pass
    human_judgment: false
  - id: D5
    description: "Анти-«стена цифр»: ≤7 ключевых чисел и ≤30 на экране на каждом из 14 шагов; highlight изменившихся (тинт #E69F00 @10%) на каждом шаге с changed"
    verification:
      - kind: unit
        ref: "tests/player.test.ts (3 ceiling-теста по реальному трейсу: 14/14 шагов ≤7 и ≤30, changed→подсветка)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Лекционный режим: класс .lecture меняет только CSS-переменные (числа 16→32px, UI 16→20px), без JS-пересчёта layout"
    verification:
      - kind: automated_ui
        ref: "preview-smoke: computed font-size формулы 16px → 32px после toggle, aria-pressed=true"
        status: pass
    human_judgment: false
  - id: D7
    description: "Визуальная пригодность экрана шага (типографика, плотность, ∂-фолбэк, литмус «с 4–5 м») для юзабилити-теста H3"
    verification: []
    human_judgment: true
    rationale: "Автоматизация проверила DOM/зоны/кегли, но эстетика и читаемость с задних рядов — человеческая оценка: скриншот-литмус e2e плана 01-03 + наблюдение 01-04; агент не поддерживает image-input в этой сессии"

duration: 19 min
completed: 2026-11-02
status: complete
---

# Phase 1 Plan 02: Экран шага — токены, формат чисел, полный layout Summary

**Полноформатный экран шага на токенах Okabe-Ito (@theme + лекционный режим CSS-переменными), форматтеры d3-format с display-минусом U+2212 и план-Б-переключением генератора на ASCII-индексы после глиф-проверки шрифтов (числа трейса бит-идентичны)**

## Performance

- **Duration:** 19 min
- **Started:** 2026-11-02T12:37:40Z
- **Completed:** 2026-11-02T12:57:16Z
- **Tasks:** 2 (оба tdd=true: RED→GREEN)
- **Files modified:** 13 (8 создано, 5 изменено)

## Accomplishments

- Дизайн-токены зафиксированы в `src/index.css`: Okabe-Ito (neg #D55E00 / pos #009E73 / attention #E69F00 + AA-тексты #C24A00/#007A56 + 5 фазных), `--num-size`/`--ui-size`, `.lecture` меняет только переменные; типографика 2 весов, tabular-nums, focus-ring 2px #0072B2
- `src/format/numbers.ts` — единственное место форматирования: `.4g`/`.3e`/exactRepr + display-минус U+2212 (знак числа никогда не кодируется только цветом)
- Глиф-проверка fontsource (unicode.json обоих шрифтов) выявила отсутствие ₁₂/∂/⊙/←/→ → **план Б §5.5**: генератор на ASCII-индексы + `<sub>`-рендер (`SubscriptText`); трейс регенерирован byte-stable, 199 чисел идентичны; ∂ оставлен Unicode (D-06) с системным фолбэком
- Экран шага по Interaction Contract: header 56 / main 55:45 gap 32 / bottom 72 — слоты фиксированы; StepPanel (формула + входы/выходы/градиенты, highlight changed, «+N» до drill-down), StepControls (клавиатура →/Space/PgDn/←/PgUp/Esc, disabled-границы, CTA «Шаг» рамка 2px #E69F00), NarrativeLine
- Анти-«стена цифр» enforce тестами: чистая модель `stepRows.buildStepRows` — ≤7 ключевых / ≤30 на экране на всех 14 шагах реального трейса
- Верификации: vitest 20/20 (format 7 + player 10 + trace-sanity 3), `pnpm build` зелёный, preview-smoke 22/22 PASS

## Task Commits

Each task was committed atomically (TDD):

1. **Task 1 RED: failing tests для форматирования чисел** — `da80902` (test)
2. **Task 1 GREEN: @theme-токены + format/numbers.ts + план Б генератора** — `132057a` (feat)
3. **Task 2 RED: failing tests — границы плеера + потолки StepPanel** — `5531da9` (test)
4. **Task 2 GREEN: экран шага — layout + StepPanel/StepControls/NarrativeLine + stepRows** — `894b6e0` (feat)
5. **Test cleanup: литералы точности → repr-строки JSON (oxlint)** — `3d4a5db` (test)
6. **chore: gitignore .planning/state.json** — `149a193` (chore)

**Plan metadata:** см. финальный docs-commit (ниже).

## Files Created/Modified

- `src/index.css` — @theme-токены, .lecture, .num/.ui-text/.ui-label/.app-heading, phase-badge/btn/value-тинты
- `src/format/numbers.ts` — formatKey/exactRepr/toDisplayMinus/MINUS
- `src/ui/stepRows.ts` — чистая модель дефолтного вида (потолки, highlight-маппинг)
- `src/ui/StepPanel.tsx` — панель шага; клик по числу → openDrill
- `src/ui/StepControls.tsx` — контролы + клавиатура
- `src/ui/NarrativeLine.tsx` — нарратив RU с sub-рендером
- `src/ui/SubscriptText.tsx` — план-Б рендер индексов
- `src/ui/App.tsx` — полная layout-композиция, бейдж фазы, toggle лекционного режима
- `tools/reference/gen_mock_trace.py`, `src/data/xor-trace.json` — ASCII-нотация (числа нетронуты)
- `tests/format.test.ts`, `tests/player.test.ts` — новые юниты

## Decisions Made

- См. key-decisions в frontmatter (план Б глифов; ∂-фолбэк; тинт 10% vs 20%; потолки для скалярных шагов; вынос stepRows/SubscriptText)

## TDD Gate Compliance

План `type: execute` (гейты plan-level не применяются), обе задачи шли RED→GREEN:

- Task 1: RED `da80902` — модуль `format/numbers` отсутствовал (import-fail, тестов 0) → целевой тестов-файл существовал и упал по отсутствию фичи; GREEN `132057a` — 7/7
- Task 2: RED `5531da9` — `buildStepRows` отсутствовал (новые ceiling-тесты невалидны); часть behavior-блока (границы store) **уже существовала с плана 01-01** (commit cb57bc5) — зафиксирована как регрессионный cover, RED по ней был законно «зелёным» (fail-fast rule 1: фича pre-exists, исследовано); GREEN `894b6e0` — 10/10

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Глифы ₁₂/⊙/←/→ отсутствуют в подключённых шрифтах → план Б §5.5**
- **Found during:** Task 1 (обязательная глиф-проверка read_first)
- **Issue:** fontsource JetBrains Mono/Inter 5.3.0 (unicode.json): U+2081/U+2082, U+2299, U+2190/U+2192 не покрыты ни одним сабсетом — fallback/разнобой в формулах на каждом шаге
- **Fix (предусмотрен планом):** генератор → ASCII-индексы (z1/W1/b1/a1/z2/W2/b2), `⊙`→`*`, `←`→`=`, `→`→`->`; UI — `<sub>`-рендер (`SubscriptText`, формула/sym/нарратив); `∂` оставлен Unicode (D-06) с системным фолбэком (на macOS/Windows/Linux десктопах не tofu)
- **Files modified:** tools/reference/gen_mock_trace.py, src/data/xor-trace.json (+ SubscriptText в Task 2)
- **Verification:** двойная регенерация `cmp` — BYTE-STABLE-OK; 199/199 чисел идентичны HEAD; trace-sanity 3/3; preview-smoke «формула z1 = W1·x» PASS
- **Committed in:** 132057a, 894b6e0

**2. [Rule 3 - Blocking] oxlint only-export-components: смешение экспортов в StepPanel.tsx**
- **Found during:** Task 2 (pnpm lint)
- **Issue:** buildStepRows/SubscriptText в файле компонента ломают fast-refresh (warning)
- **Fix:** чистая модель → `src/ui/stepRows.ts`; рендер → `src/ui/SubscriptText.tsx` (два файла сверх files_modified плана — архитектурно чище: модель тестируется без React)
- **Verification:** pnpm lint src tests — 0 warning; тесты импортируют модель напрямую
- **Committed in:** 894b6e0

**3. [Фиксация противоречия спеков] Тинт изменившегося числа: 10% против 20%**
- **Found during:** Task 1 (чтение UI-SPEC)
- **Issue:** Color-секция UI-SPEC говорит «@ 20% alpha», Interaction Contract + must_haves плана — «@ 10%»
- **Fix:** реализовано 10% (план приоритетен); сверка контраста и фиксация единого значения — в 01-DESIGN-TOKENS.md (план 01-03)
- **Verification:** `color-mix(in srgb, var(--color-attention) 10%, transparent)` в index.css
- **Committed in:** 132057a

---

**Total deviations:** 3 auto-fixed (1×Rule 1 план-Б, 1×Rule 3, 1 фиксация противоречия спеков)
**Impact on plan:** Поведенческие критерии плана выполнены полностью; D-03 (числа только из генератора) и D-06 (нотация) сохранены — изменилось только строковое представление индексов, предвиденное планом Б.

## Known Stubs

| Файл | Что отложено | Кто резолвит |
|------|--------------|--------------|
| src/ui/App.tsx (`diagram-slot`) | Слот диаграммы 55% пуст — SVG 2-3-1, рёбра-веса, активная op | план 01-03 (явно отложено objective плана 01-02) |
| src/ui/StepPanel.tsx (клик по числу) | `openDrill(ref)` вызывается, панель NumberDrilldown не рендерится | план 01-03 (явно отложено objective плана 01-02) |

Оба стаба — запланированные deferrals из objective («Drill-down, диаграмма и URL-state — план 01-03»), цель плана ими не блокируется. Записаны в WINDOWS.md.

## Issues Encountered

- d3-format `.3e` даёт ASCII-минус и в экспоненте — `toDisplayMinus` сначала заменял оба; исправлено: знак после e/E остаётся ASCII, как в образце UI-SPEC «−2.451e-5» (тест поймал).
- Скриншот-литмус визуально не оценён агентом (модель без image-input в этой сессии) — файлы `/tmp/opus-default-step13.png`, `/tmp/opus-lecture-step1.png`, `/tmp/opus-summary-step14.png`; DOM-проверки (22/22) покрывают зоны/кегли/доступность, визуальный литмус — план 01-03 e2e.

## User Setup Required

None - статик-прототип без внешних сервисов.

## Next Phase Readiness

- Готово для 01-03: SVG-диаграмма встраивается в зарезервированный слот 55%; NumberDrilldown — по кликабельным числам (`data-ref`, player.openDrill уже работает); URL-state (#step=N&mode=lecture) поверх store
- Готово для 01-04 (юзабилити H3): экран шага проходит все 14 шагов вперёд/назад с формулами, числами, нарративом, бейджами фаз и лекционным режимом
- Окно для 01-03: зафиксировать 01-DESIGN-TOKENS.md (вкл. решение тинта 10/20% и ∂-фолбэк), сверить глиф-фолбэк на скриншотах

## Self-Check: PASSED

- Файлы: 10/10 ключевых артефактов FOUND на диске
- Коммиты: da80902, 132057a, 5531da9, 894b6e0, 3d4a5db, 149a193 — все ancestors HEAD; commits measured (ledger f58d5eb..HEAD) = 6
- Верификации плана: vitest 20/20 (format 7 + player 10 + trace-sanity 3); pnpm build exit 0 (dist/ создан); pnpm lint src tests — 0 warning; preview-smoke 22/22 PASS; BYTE-STABLE-OK регенерация, 199/199 чисел идентичны
- Потолки чисел: ≤7 ключевых / ≤30 на экране — тестами на всех 14 шагах реального трейса
- Новых пакетов нет (T-1-SC), store-библиотек нет (правило пользователя соблюдено), dangerouslySetInnerHTML нет (T-1-06)

---

*Phase: 01-validatsiya-h2-h3-klikabelnyy-prototip*
*Completed: 2026-11-02*
