---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
plan: "02"
subsystem: testing
tags: [colocation, vitest, oxlint, tsc, module-boundaries]

requires:
  - phase: 01.1-arhitekturnyy-refaktoring-r1-r5
    provides: тензорная библиотека src/tensor/, прогон src/run/, границы R2 (boundaries-тест + oxlint)
  - phase: 02-01
    provides: строгий oxlint-only линтер (D-27), замороженный блок исключений
provides:
  - Колоцированные тесты (D-28а): 9 тест-файлов в src/{format,run,tensor,ui}/**, папки tests/ больше нет
  - src/run/etalon-constants.ts — plain-TS эталон-константы NFR-02 (0 импортов, мостик vitest/playwright)
  - Carve-out границ для *.test.ts: boundaries-тест exempt в правиле (1) (deep-imports продолжают сканировать тесты) + oxlint-override bare-импорт только vitest/node:
  - Тесты под полным строгим тайпчеком tsc -b (Pitfall 4 закрыт)
affects: [02-07 (сплит runState), 02-04 (ScenarioModel), 02-06 (журнализация D-28), 02-08]

actuals:
  tokens: 16500
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Колокация тестов: *.test.ts рядом с тестируемым модулем (src/format/numbers.test.ts и др.)"
    - "Двойной enforcement границ с тест-carve-out: fs-скан exempt'ит *.test.ts только из правила внутренних импортов; oxlint-override разрешает bare-импорт только vitest (+node: для скана), относительные — свободно"

key-files:
  created: []
  modified:
    - src/format/numbers.test.ts
    - src/run/runState.test.ts
    - src/run/history.test.ts
    - src/run/etalon-constants.ts
    - src/run/etalon.test.ts
    - src/run/invariants.test.ts
    - src/tensor/expanders.test.ts
    - src/tensor/boundaries.test.ts
    - src/ui/chainLinks.test.ts
    - src/ui/compGraph.test.ts
    - .oxlintrc.json
    - e2e/smoke.spec.ts
    - AGENTS.md
    - tsconfig.app.json
    - src/tensor/expanders.ts

key-decisions:
  - "oxlint carve-out расширен против планового «только vitest»: negations !node:* (boundaries-скану нужны node:fs/url/path как bare) и !./**/!../** (эмпирика: в oxlint glob * матчит и относительные спецификаторы — без них падали легитимные ./index и ../run/scenario); запрет внешних пакетов подтверждён негативным тестом (react в тензор-тесте → error)"
  - "Pitfall 4 закрыт одной правкой: tsconfig.app.json types [vite/client, node] — @types/node@24.19.2 уже прямой devDep (0 новых пакетов); других strict-ошибок в тестах не было"
  - "boundaries правило (3) усилен assert'ом carve-out-override (группа '*', '!vitest') — ослабление границы не может протечь молча (T-2-03)"

patterns-established:
  - "Модуль = папка с кодом + тесты рядом (D-28а): новые тесты фазы 02 пишутся только в src/**"
  - "Гейт колокации: git ls-files tests пуст; Test Files = 9 в pnpm test"

requirements-completed: [DOCS-01]

coverage:
  - id: D1
    description: "Колокация: 9 тест-файлов + etalon-константы перенесены git mv из tests/** в src/** рядом с кодом, папка tests/ удалена (D-28а)"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "command: test -z \"$(git ls-files tests)\" → TESTS-COLOCATED"
        status: pass
      - kind: unit
        ref: "pnpm test → Test Files 9 passed (9), Tests 101 passed (101)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Carve-out границ для *.test.ts: boundaries-тест exempt'ит тесты только из правила внутренних импортов (deep-imports сканируют всё), oxlint-override для src/tensor/**/*.test.ts разрешает bare-импорт только vitest/node:"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "src/tensor/boundaries.test.ts#граница src/tensor/ (R2) — сканирование исходников (3 теста, вкл. assert carve-out)"
        status: pass
      - kind: automated_ui
        ref: "command: pnpm lint → exit 0 (негативный тест: временный react-импорт в src/tensor/*.test.ts → no-restricted-imports error, удалён)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Тесты впервые под полным строгим тайпчеком (Pitfall 4): tsc -b зелёный на колоцированных тестах"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "command: pnpm build (tsc -b && vite build) → exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Межраннеровый мостик etalon сохранён (e2e импортирует src/run/etalon-constants.ts), AGENTS.md указывает актуальный путь NFR-02"
    requirement: DOCS-01
    verification:
      - kind: e2e
        ref: "pnpm e2e → 11 passed (13.6s), эталон-сверка чисел движка в тесте 1"
        status: pass
    human_judgment: false

duration: 7 min
completed: 2026-11-12
status: complete
---

# Phase 02 Plan 02: Колокация тестов (D-28а) Summary

**9 тест-файлов и etalon-константы переехали git mv из tests/** в src/** рядом с кодом; оба механизма границ получили точечный carve-out для *.test.ts (bare-импорт только vitest/node:), тесты впервые под строгим tsc — без единого изменения вычислений (101 юнит + 11 e2e зелёные, переносы 94-100% similarity).**

## Performance

- **Duration:** 7 min
- **Started:** 2026-11-12T17:39:40Z
- **Completed:** 2026-11-12T17:47:07Z
- **Tasks:** 1
- **Files modified:** 15

## Accomplishments
- D-28а выполнен: `git ls-files tests` пуст; модуль = папка с кодом + тесты (src/{format,run,tensor,ui}); etalon-константы → src/run/etalon-constants.ts (plain-TS, 0 импортов — header сохранён дословно)
- Границы пережили колокацию без ослабления: boundaries правило (1) exempt'ит только *.test.ts (правило (2) deep-imports сканирует тесты); oxlint-override `src/tensor/**/*.test.ts` — group `["*", "!vitest", "!node:*", "!./**", "!../**"]`; rule (3) дополнительно assert'ит carve-out в конфиге
- Pitfall 4 закрыт: pnpm build зелёный; единственный типофикс — `"types": ["vite/client", "node"]` в tsconfig.app.json (@types/node уже devDep)
- e2e-мостик жив: smoke.spec.ts импортирует `../src/run/etalon-constants`; AGENTS.md NFR-02 указывает src/run/etalon-constants.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Колокация tests/** → src/** + carve-out границ + AGENTS.md путь** - `5a88527` (refactor)

**Plan metadata:** (see below)

## Files Created/Modified
- `src/format/numbers.test.ts` ← tests/format.test.ts — импорты `./numbers`, `../run/etalon-constants`
- `src/run/runState.test.ts`, `src/run/history.test.ts` — импорты `./runState`, `./scenario`, `../tensor`
- `src/run/etalon-constants.ts` ← tests/tensor/ — без изменений контента (100% rename)
- `src/run/etalon.test.ts`, `src/run/invariants.test.ts` — `./runState`, `./scenario`, `../tensor`, `./etalon-constants`
- `src/tensor/expanders.test.ts` — `../run/scenario`, `./index`
- `src/tensor/boundaries.test.ts` — SRC_DIR `'..'`, OXLINTRC `'../../.oxlintrc.json'`, exempt *.test.ts в правиле (1), assert carve-out в правиле (3)
- `src/ui/chainLinks.test.ts`, `src/ui/compGraph.test.ts` — `./chainLinks`, `./compGraph`, `../run/scenario`
- `.oxlintrc.json` — override `src/tensor/**/*.test.ts` (миграционный carve-out D-28а, вне замороженного блока), etalon-путь в group `!**/run/etalon-constants` + message
- `e2e/smoke.spec.ts` — импорт `../src/run/etalon-constants` (+ док-путь в комментарии)
- `AGENTS.md` — NFR-02 путь src/run/etalon-constants.ts
- `tsconfig.app.json` — types +node (Pitfall 4)
- `src/tensor/expanders.ts` — док-путь теста в комментарии

## Decisions Made
- Carve-out `!node:*` + `!./**`/`!../**` сверх планового «только vitest» — см. key-decisions (эмпирика oxlint-глобов + потребности boundaries-скана)
- boundaries правило (3) усилен assert'ом (T-2-03 — ослабление не протечёт молча)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] oxlint carve-out потребовал negations сверх «только vitest»**
- **Found during:** Task 1 (шаг 4, pnpm lint)
- **Issue:** план предполагал послабление «ТОЛЬКО на vitest»; эмпирика: (а) boundaries-скан импортирует node:fs/url/path как bare; (б) в oxlint glob `*` матчит и относительные спецификаторы — `./index` и `../run/scenario` падали
- **Fix:** group `["*", "!vitest", "!node:*", "!./**", "!../**"]` — запрет внешних пакетов сохранён (негативный тест: временный react-импорт в тензор-тесте → error)
- **Files modified:** .oxlintrc.json
- **Verification:** pnpm lint exit 0; негативный тест react → error; boundaries-тест (с assert carve-out) зелёный
- **Committed in:** 5a88527

**2. [Rule 2 - Missing Critical] tsconfig.app.json types +node (файл вне files_modified плана)**
- **Found during:** Task 1 (шаг 7, pnpm build)
- **Issue:** tsc -b не находил типы node:fs/url/path для boundaries-теста (`types: ["vite/client"]` ограничивал автоподключение)
- **Fix:** `"types": ["vite/client", "node"]` — @types/node@24.19.2 уже прямой devDep (0 новых пакетов, T-2-SC не нарушен)
- **Files modified:** tsconfig.app.json
- **Verification:** pnpm build exit 0
- **Committed in:** 5a88527

**3. [Rule 3 - Blocking] Устаревшие док-пути tests/tensor/… в живых комментариях**
- **Found during:** Task 1 (grep после переноса)
- **Issue:** src/tensor/expanders.ts:6 и e2e/smoke.spec.ts:37 упоминали tests/tensor/… — «контракт не врёт» (тот же принцип, что AGENTS.md-строка плана)
- **Fix:** пути обновлены на src/**-локации
- **Files modified:** src/tensor/expanders.ts, e2e/smoke.spec.ts
- **Verification:** grep по src/e2e — 0 ссылок на tests/
- **Committed in:** 5a88527

---

**Total deviations:** 3 auto-fixed (1 missing critical, 1 missing critical, 1 blocking)
**Impact on plan:** Все — необходимые следствия колокации; вычисления не тронуты, границы не ослаблены (негативный тест), 0 новых пакетов.

## Issues Encountered
- Семантика oxlint group-глобов отличается от minimatch: `*` матчит относительные спецификаторы, `!../*` не покрывает вложенные пути (работает `!../**`) — зафиксировано в конфиг-комментарии и key-decisions; дальшейшие правки .oxlintrc.json — только апрув владельца (D-27).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Runway к 02-07 (сплит runState → trainingRun.ts и др.; тесты уже рядом, импорт './runState' → './trainingRun' одной правкой) и 02-04 (ScenarioModel) готова
- Следующий план: 02-03 (волна 2)

---
*Phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone*
*Completed: 2026-11-12*
