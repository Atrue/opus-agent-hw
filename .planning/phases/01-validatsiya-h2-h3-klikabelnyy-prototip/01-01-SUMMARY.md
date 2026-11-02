---
phase: 01-validatsiya-h2-h3-klikabelnyy-prototip
plan: "01"
subsystem: ui
tags: [vite, react, typescript, tailwind, d3-format, python-generator, mock-trace, walking-skeleton]

requires:
  - phase: 00 (planning)
    provides: утверждённые версии пакетов (Standard Stack + checkpoint 01-01 Task 1)
provides:
  - Walking skeleton прототипа: генератор мок-трейса → закоммиченный JSON → React-плеер → экран с кнопкой «Шаг» → зелёная production-сборка
  - Детерминированный генератор tools/reference/gen_mock_trace.py (stdlib-only, micrograd-семантика, санити-фильтр, gradcheck)
  - Схема мок-трейса v1 (schemaVersion=1) — прообраз формата golden-фикстур Phase 2
  - Плеер как чистая функция над (trace, stepIndex) на встроенных средствах React (без store-библиотек)
  - Зафиксированный архитектурный контракт 01-SKELETON.md (CAPABILITY-VERIFIED-BY-PREVIEW, VERSIONS-VERIFIED-BY-LOCKFILE)
affects: [01-02, 01-03, 01-04, phase-2]

actuals:
  tokens: 32964
  tasks: 2
  commits: 2

plan_head_before: ab1558c3f2f8ea406733dadd1f6b762b3ef79877
plan_head_after: 440ffcfc1e0818c5a03ec780c0fb27aa9370d394

tech-stack:
  added:
    - vite 8.3.5 + @vitejs/plugin-react 6.1.2 (create-vite react-ts scaffold)
    - react 19.3.1 / react-dom 19.3.1
    - typescript 5.9.3 (strict + exactOptionalPropertyTypes)
    - tailwindcss 4.3.3 + @tailwindcss/vite 4.3.3 (CSS-first)
    - vitest 5.0.5 (юниты), playwright 1.64.1 (библиотека — preview-проверка; e2e-тесты план 01-03)
    - d3-format 3.1.2 (ключевые числа .4g)
    - "@fontsource-variable/inter 5.3.0 + @fontsource-variable/jetbrains-mono 5.3.0 (self-host, вкл. кириллицу)"
    - oxlint (из create-vite шаблона; ESLint в шаблон больше не входит)
  patterns:
    - "Pattern 1 (ARCHITECTURE.md): UI = чистый плеер над (trace, stepIndex); числа в компонентах не вычисляются"
    - "Стор плеера на встроенных средствах React: модульный стор + useSyncExternalStore + чистая transition() с клампом 0..13"
    - "Числа — только из генератора (D-03): байт-стабильная регенерация как guard против ручных правок JSON"
    - "Gradcheck central-difference внутри генератора — прообраз NFR-02-дисциплины"

key-files:
  created:
    - package.json
    - pnpm-lock.yaml
    - vite.config.ts
    - tsconfig.app.json
    - src/player/types.ts
    - src/player/store.ts
    - src/d3-format.d.ts
    - src/data/xor-trace.json
    - src/ui/App.tsx
    - src/index.css
    - src/main.tsx
    - tools/reference/gen_mock_trace.py
    - tests/trace-sanity.test.ts
  modified:
    - .planning/phases/01-validatsiya-h2-h3-klikabelnyy-prototip/01-SKELETON.md

key-decisions:
  - "Store плеера — на встроенных средствах React (useSyncExternalStore), zustand исключён решением пользователя; постоянное правило: store-библиотеки — только после явного вопроса пользователю с обоснованием"
  - "TypeScript пиннут к 5.9.3 (актуальный create-vite ставит 7.0.2; мажор 5.x утверждён Standard Stack)"
  - "Локальная декларация типов d3-format (src/d3-format.d.ts) вместо @types/d3-format — не выходить за утверждённый на checkpoint список пакетов"
  - "Генератор пишет JSON с indent=2: план 01-01 требует grep -c '\"index\"' → 14 (однострочный вывод даёт 1)"
  - "Санити-фильтр выбрал seed 43 (seed 42 не прошёл условия: L₀ ∈ [0.4, 1.0] и/или |pre-act| < 2.5)"

patterns-established:
  - "Player store без внешних библиотек: transition() чистая функция + useSyncExternalStore — эталон для Phase 2+"
  - "Мок-трейс генерируется только tools/reference/gen_mock_trace.py; двойная регенерация + cmp — guard целостности"

requirements-completed: []

coverage:
  - id: D1
    description: "Production-сборка прототипа зелёная на целевом стеке (pnpm build = tsc strict + vite build)"
    verification:
      - kind: other
        ref: "pnpm build (exit 0, dist/ создан) — прогон 2026-11-02, повторно после каждого изменения"
        status: pass
    human_judgment: false
  - id: D2
    description: "Детерминированный генератор мок-трейса: двойная регенерация байт-идентична, gradcheck внутри скрипта"
    verification:
      - kind: other
        ref: "python3 tools/reference/gen_mock_trace.py ×2 + cmp → BYTE-STABLE-OK; gradCheck.maxRelErr 2.88e-9 ≤ 1e-4"
        status: pass
    human_judgment: false
  - id: D3
    description: "Мок-трейс структурно валиден: schemaVersion=1, сеть 2-3-1, 14 шагов, фазы в порядке forward→loss→backward→update→summary, все числа конечны"
    verification:
      - kind: unit
        ref: "tests/trace-sanity.test.ts (3 passed: структура, finite, validateTrace)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Кнопка «Шаг» меняет stepIndex: число/нарратив/индикатор «Шаг N из 14» обновляются; next/prev клампятся 0..13 (disabled на границах); клавиатура →/Space/←"
    verification:
      - kind: automated_ui
        ref: "ad-hoc playwright script против pnpm preview (12/12 PASS, 2026-11-02); постоянный e2e-смок — план 01-03 (e2e/smoke.spec.ts)"
        status: pass
    human_judgment: false
  - id: D5
    description: "SKELETON.md верифицирован фактом: маркеры UNVERIFIED-DRAFT/VERSIONS-UNVERIFIED заменены, версии из pnpm list --depth 0 записаны"
    verification:
      - kind: other
        ref: "grep-цепочки Task 3 (exit 0): UNVERIFIED-DRAFT=0, CAPABILITY-VERIFIED-BY-PREVIEW=1, VERSIONS-UNVERIFIED=0, VERSIONS-VERIFIED-BY-LOCKFILE=1"
        status: pass
    human_judgment: false

duration: 11 min
completed: 2026-11-02
status: complete
---

# Phase 1 Plan 01: Walking skeleton кликабельного прототипа Summary

**End-to-end срез прототипа: Python-генератор мок-трейса XOR 2-3-1 (stdlib-only, seed 43, gradcheck 2.9e-9) → закоммиченный 14-шаговый JSON → React-плеер (useSyncExternalStore, clamp 0..13) → экран с кнопкой «Шаг» → зелёная production-сборка + верифицированный SKELETON.md**

## Performance

- **Duration:** 11 min (продолжение после checkpoint; Task 1 — checkpoint, решён пользователем)
- **Started:** 2026-11-02T12:22:45Z (executor resume)
- **Completed:** 2026-11-02T12:33:46Z
- **Tasks:** 2 (Tasks 2–3; Task 1 — blocking-human checkpoint, «утверждаю» с модификацией)
- **Files modified:** 20 создано + 1 актуализирован (SKELETON.md)

## Accomplishments

- Кликабельный skeleton на целевом стеке (D-01): Vite 8.3.5 + React 19.3.1 + TS 5.9.3 strict (+ exactOptionalPropertyTypes) + Tailwind 4.3.3 CSS-first; `pnpm build` зелёный
- Детерминированный генератор `tools/reference/gen_mock_trace.py` (D-03): micrograd-семантика Value/backward, санити-фильтр весов (выбран seed 43), central-difference gradcheck (maxRelErr 2.88e-9, выход с ошибкой при > 1e-4), байт-стабильный вывод — двойная регенерация `cmp`-идентична
- Мок-трейс `src/data/xor-trace.json`: схема v1, 14 шагов (6 forward + loss + 5 backward + update + сводка), формулы/нарратив RU в нотации D-06, provenance у каждого входа; trace-sanity тест зелёный
- Плеер `src/player/store.ts` + `types.ts`: чистая `transition()` с клампом 0..13, drill-сброс при смене шага, селекторы; store на встроенных средствах React — внешние store-библиотеки не ставились
- Экран `src/ui/App.tsx`: «XOR — backprop за 14 шагов», «Шаг N из 14», бейдж фазы, нарратив, ключевое число `.4g` (d3-format, tabular-nums), «Шаг»/«Назад» с disabled-границами, клавиатура →/Space/← — capability проверена автоматическим preview-прогоном (12/12 PASS)
- `01-SKELETON.md` сверен с фактом: CAPABILITY-VERIFIED-BY-PREVIEW + VERSIONS-VERIFIED-BY-LOCKFILE, отклонения от черновика зафиксированы явными строками

## Task Commits

Each task was committed atomically:

1. **Task 1: Package legitimacy checkpoint (blocking-human)** — решён пользователем («утверждаю» с модификацией: zustand исключён), commit не требуется
2. **Task 2: End-to-end skeleton — генератор → JSON → плеер → кнопка «Шаг» → production build** - `cb57bc5` (feat)
3. **Task 3: SKELETON.md — сверить архитектурный каркас с фактом** - `440ffcf` (docs)

**Plan metadata:** см. финальный commit (ниже).

## Files Created/Modified

- `package.json`, `pnpm-lock.yaml` — точные утверждённые версии, scripts dev/build/preview/test/e2e/lint
- `vite.config.ts` — react() + tailwindcss() плагины
- `tsconfig.app.json` — strict + exactOptionalPropertyTypes + resolveJsonModule (поверх create-vite шаблона)
- `index.html` — lang=ru, title «XOR — backprop за 14 шагов»
- `tools/reference/gen_mock_trace.py` — единственный источник чисел (D-03)
- `src/data/xor-trace.json` — 14-шаговый мок-трейс, schemaVersion 1, seed 43, gradCheck
- `src/player/types.ts` — TraceStep/MockTrace + validateTrace() (T-1-01/T-1-02)
- `src/player/store.ts` — стор плеера на useSyncExternalStore, clamp 0..13
- `src/d3-format.d.ts` — локальная декларация типов d3-format
- `src/ui/App.tsx`, `src/main.tsx`, `src/index.css` — минимальный экран, шрифты Inter/JetBrains Mono Variable
- `tests/trace-sanity.test.ts` — структурная валидность трейса (3 теста)
- `01-SKELETON.md` — верифицированный архитектурный контракт Phase 2

## Decisions Made

- **Store плеера — встроенные средства React** (модульный стор + useSyncExternalStore + чистая transition()), zustand исключён — см. Deviations
- **TypeScript 5.9.3** вместо 7.0.2 из шаблона: мажор 5.x зафиксирован Standard Stack и утверждён на checkpoint
- **Локальный `src/d3-format.d.ts`** вместо @types/d3-format: d3-format не поставляет типы, а добавление пакета вне утверждённого списка нарушило бы гейт поставок
- **JSON с indent=2**: acceptance-критерий плана `grep -c '"index"' → 14` требует построчный вывод
- **seed 43**: санити-фильтр (L₀∈[0.4,1.0], |pre-act|<2.5, |∂L/∂W₁|>1e-4) отверг seed 42 автоматическим перебором — выбран первый проходящий

## Deviations from Plan

### User-Directed Deviation (checkpoint 01-01 Task 1)

**1. zustand исключён решением пользователя (checkpoint 01-01 Task 1); store на React-хуках; правило: store-библиотеки — только после вопроса пользователю**
- **Found during:** Task 1 checkpoint (продолжение)
- **Issue:** План предписывал `pnpm add zustand` и стор из эскиза §4.4
- **Fix:** `src/player/store.ts` реализован на встроенных средствах React (модульный стор + `useSyncExternalStore` + чистая `transition()`); API-поведение (кламп 0..13, drill-сброс, «Шаг N из 14») соответствует acceptance-критериям плана без изменений
- **Files modified:** src/player/store.ts
- **Verification:** pnpm build + preview-прогон 12/12 PASS; zustand отсутствует в package.json, pnpm-lock.yaml и коде (grep-чисто)
- **Committed in:** cb57bc5
- **Standing rule:** «как только понадобится библиотека для работы со стором — спроси и опиши подробно зачем» — перед добавлением любой store-библиотеки в любом плане/фазе требуется явный вопрос пользователю с детальным обоснованием (записано в STATE.md Accumulated Context)

### Auto-fixed Issues

**2. [Rule 1 - Bug] gradcheck не возмущал веса**
- **Found during:** Task 2 (до первого прогона, самопроверка кода)
- **Issue:** Плоская копия параметров не пробрасывала ±h во вложенные списки весов (float неизменяем) — gradcheck сравнивал бы одинаковые числа
- **Fix:** Параметры адресуются парами (список-строка, индекс); возмущение пишется прямо в w1/b1/w2/b2
- **Files modified:** tools/reference/gen_mock_trace.py
- **Verification:** gradcheck реально считает (maxRelErr 2.88e-9 ≠ 0)
- **Committed in:** cb57bc5

**3. [Rule 1 - Bug] TS-ошибка в validateTrace (unknown?.ru)**
- **Found during:** Task 2 (pnpm build)
- **Issue:** `s.narrative?.ru` на unknown — TS2339
- **Fix:** Явная проверка typeof объекта с приведением Record<string, unknown>
- **Files modified:** src/player/types.ts
- **Verification:** pnpm build exit 0
- **Committed in:** cb57bc5

**4. [Rule 3 - Blocking] Однострочный JSON не проходил acceptance-grep**
- **Found during:** Task 2 (acceptance-критерий `grep -c '"index"' → 14` давал 1)
- **Issue:** json.dump без indent пишет весь документ одной строкой
- **Fix:** indent=2 (детерминизм сохранён, двойная регенерация байт-идентична)
- **Files modified:** tools/reference/gen_mock_trace.py
- **Verification:** grep -c '"index"' → 14; BYTE-STABLE-OK
- **Committed in:** cb57bc5

**5. [Rule 3 - Blocking] Типы для d3-format без нового пакета**
- **Found during:** Task 2 (tsc strict: нет объявлений типов у d3-format 3.1.2)
- **Issue:** d3-format не поставляет types; @types/d3-format не входит в утверждённый на checkpoint список
- **Fix:** Минимальная локальная декларация `src/d3-format.d.ts` (только используемый API `format(specifier)`)
- **Files modified:** src/d3-format.d.ts
- **Verification:** pnpm build exit 0; в зависимостях только утверждённые пакеты
- **Committed in:** cb57bc5

**6. [Фиксация факта] create-vite v9.3.3 кладёт oxlint (не ESLint 9) и TypeScript 7.0.2**
- **Found during:** Task 2 (scaffold)
- **Issue:** Research-стек ожидал ESLint 9 и TS 5.x из шаблона
- **Fix:** TS пиннут к 5.9.3 (предусмотрено планом: «при расхождении мажоров — доустановить точные версии»); oxlint оставлен как факт шаблона (ESLint не входил в утверждённый список пакетов); отклонение зафиксировано явными строками в SKELETON.md
- **Verification:** pnpm lint / pnpm build работают
- **Committed in:** cb57bc5, 440ffcf

---

**Total deviations:** 1 user-directed (zustand исключён) + 5 auto-fixed (2×Rule 1, 2×Rule 3, 1 фиксация факта шаблона)
**Impact on plan:** Поведенческие acceptance-критерии плана выполнены без изменений; архитектура Pattern 1 (чистый плеер) сохранена — Phase 2 подменит источник trace без правок UI.

## Issues Encountered

None - помимо перечисленных отклонений, выполнение шло по плану.

## User Setup Required

None - no external service configuration required. (Публикация на статик-хостинг — user_setup плана 01-04, не этого плана.)

## Next Phase Readiness

- Skeleton работает end-to-end: генератор → JSON → стор → экран; production-сборка и тесты зелёные
- Готово для планов 01-02 (полный экран шага, лекционный режим, urlState.ts, дизайн-токены) и 01-03 (SVG-диаграмма, drill-down, e2e-смок): плеер и схема трейса — стабильный контракт
- SKELETON.md — верифицированный архитектурный контракт (никаких переписываний UI в Phase 2 не потребуется)

## Self-Check: PASSED

- Файлы: 14/14 ключевых артефактов FOUND на диске
- Коммиты: cb57bc5, 440ffcf — оба ancestors HEAD; commits measured (ledger ab1558c..HEAD) = 2 = фактические
- Верификации плана: BYTE-STABLE-OK; trace-sanity 3/3 PASS; pnpm build exit 0 + dist/; preview-прогон 12/12 PASS; SKELETON-маркеры заменены (grep-цепочки exit 0)
- Success criteria чекпойнта: zustand отсутствует в package.json/lockfile/коде (grep-чисто)

---
*Phase: 01-validatsiya-h2-h3-klikabelnyy-prototip*
*Completed: 2026-11-02*
