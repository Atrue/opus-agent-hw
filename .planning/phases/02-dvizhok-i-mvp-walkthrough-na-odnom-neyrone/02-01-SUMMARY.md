---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
plan: "01"
subsystem: infra
tags: [oxlint, lint, d-27, tooling, quality-gate]

requires:
  - phase: 01.2-formula-hrebet-istoriya-zvena
    provides: зелёный репо (101 юнит / 11 e2e) и границы src/tensor в oxlint как база для ужесточения
provides:
  - Строгий oxlint-гейт (correctness/suspicious=error, pedantic/perf=warn) поверх нетронутых границ модулей
  - Замороженный блок исключений с контрактом D-27 (изменения — только по явному апруву владельца)
  - oxlint ~1.92.0 (единственное изменение зависимостей; 0 новых пакетов)
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, 02-08, 02-09]

actuals:
  tokens: 13000
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Линт-гейт = один oxlint с категориями; исключения живут в замороженном блоке .oxlintrc.json (jsonc-комментарии) с контрактом D-27"
    - "Вендорный тулинг .claude/** вне скоупа линта (ignorePatterns) — регенерируется установщиком GSD"

key-files:
  created: []
  modified:
    - .oxlintrc.json
    - package.json
    - pnpm-lock.yaml
    - src/ui/StepperBand.tsx
    - src/run/runState.ts
    - src/tensor/trace.ts
    - tests/tensor/boundaries.test.ts

key-decisions:
  - "Замороженный список исключений по факту первого прогона bring-up: react/react-in-jsx-scope, max-lines-per-function, max-lines, require-unicode-regexp (off) + no-underscore-dangle allow __run; no-await-in-loop off только override-ом для e2e/**. Кандидат плана typescript/no-non-null-assertion НЕ понадобился (правило не в включённых категориях)"
  - "ignorePatterns .claude/** — вендорный GSD-тулинг (369 файлов) регенерируется установщиком, стилевые правки там невозможны by design"
  - "StepperBand: эффект автоскролла переписан на честное использование dep (children[stepInSample-1] вместо querySelector) — открытие react/exhaustive-effect-dependencies"

patterns-established:
  - "Bring-up строгого линтера: находки чинятся стилевыми правками (комментарии на свою строку, инверсия веток), системные ложные срабатывания — в замороженный блок с однострочным обоснованием"

requirements-completed: [DOCS-01]

coverage:
  - id: D1
    description: "Строгий oxlint-конфиг: категории correctness/suspicious=error + pedantic/perf=warn, границы src/tensor нетронуты, замороженный блок исключений с контрактом D-27"
    requirement: DOCS-01
    verification:
      - kind: command
        ref: "pnpm lint (exit 0)"
        status: pass
      - kind: unit
        ref: "tests/tensor/boundaries.test.ts#граница enforce дважды: oxlint no-restricted-imports настроен (patterns + override src/tensor)"
        status: pass
      - kind: command
        ref: "rg '\"suspicious\"' .oxlintrc.json && rg 'D-27' .oxlintrc.json → LINT-STRICT-FROZEN"
        status: pass
      - kind: command
        ref: "test ! -f eslint.config.js → OXLINT-ONLY"
        status: pass
    human_judgment: false
  - id: D2
    description: "Апгрейд oxlint 1.90.0 → 1.92.0 (~1.92.0, lockfile пинит); 0 новых npm-пакетов; scripts.lint не менялся"
    requirement: DOCS-01
    verification:
      - kind: command
        ref: "pnpm list --depth 0 → oxlint@1.92.0; git diff package.json — только строка oxlint"
        status: pass
    human_judgment: false
  - id: D3
    description: "Bring-up стилевыми правками без изменения вычислений: 101 юнит (инварианты бит-в-бит) и 11 e2e зелёные, e2e двойной прогон бит-идентичен"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "pnpm test → 101 passed (101)"
        status: pass
      - kind: e2e
        ref: "pnpm e2e ×2 → 11 passed, diff e2e/screenshots бит-идентичен"
        status: pass
      - kind: command
        ref: "pnpm build (tsc -b) — типы зелёные"
        status: pass
    human_judgment: false

duration: 20 min
completed: 2026-11-12
status: complete
---

# Phase 02 Plan 01: Строгий oxlint-линтер (D-27, ревизия oxlint-only) Summary

**Категории correctness/suspicious=error + pedantic/perf=warn поверх нетронутых границ src/tensor; bring-up 89 стилевыми правками без изменения вычислений; замороженный блок исключений с контрактом D-27; oxlint 1.90→1.92 (0 новых пакетов)**

## Performance

- **Duration:** 20 min
- **Started:** 2026-11-12T17:13:51Z
- **Completed:** 2026-11-12T17:34:00Z
- **Tasks:** 1
- **Files modified:** 27 (26 в task-коммите + SUMMARY)

## Accomplishments
- D-27 (ревизия владельца 2026-11-09) реализован: строгий линтер = только oxlint, ESLint/airbnb не вводятся, eslint.config.js отсутствует (OXLINT-ONLY)
- Категории строгости включены один раз: correctness/suspicious = error, pedantic/perf = warn; точечное eslint/no-console = warn (первый кандидат плана — срабатываний нет: консоль-логов в src 0)
- Bring-up: 89 находок закрыты стилевыми правками (57 no-inline-comments — комментарии на свою строку; 10 no-negated-condition — инверсия веток; jsx-no-useless-fragment; 2 no-array-index-key → data-dependent ключи; no-map-spread → Object.assign; 1 реальная находка react/exhaustive-effect-dependencies в StepperBand)
- Замороженный блок исключений с комментарием-контрактом «D-27: изменения — только с явным апрува владельца»; каждое исключение с обоснованием
- Полный гейт зелёный: pnpm lint (exit 0, 2 осознанных warning), pnpm test 101/101, pnpm e2e 11/11 дважды бит-идентично, tsc -b зелёный

## Task Commits

1. **Task 1: Строгий oxlint — апгрейд, категории, bring-up, заморозка исключений** — `e54f20f` (chore)

**Plan metadata:** (см. ниже)

## Files Created/Modified
- `.oxlintrc.json` — categories + ignorePatterns .claude/** + замороженный блок исключений (контракт D-27) + e2e-override no-await-in-loop; no-restricted-imports/overrides перенесены без изменений
- `package.json` / `pnpm-lock.yaml` — oxlint ^1.89.0 → ~1.92.0 (факт: в package.json был ^1.89.0, lockfile 1.90.0 — план говорил «1.90» о запиненной версии)
- `src/ui/StepperBand.tsx` — эффект автоскролла: честное использование dep (children[stepInSample-1] вместо querySelector aria-current), deps [stepInSample, epochDone]
- `src/ui/ComputationGraph.tsx` — 9 инверсий negated-условий (ветки переставлены, семантика идентична)
- `src/ui/LossChart.tsx` — инверсия тернарника hasData + 3 комментария на свою строку
- `src/ui/SubscriptText.tsx` — убран бесполезный fragment (return parts)
- `src/ui/ExamplesPanel.tsx`, `src/ui/OperationPanel.tsx` — data-dependent React-ключи
- `src/ui/compGraph.ts` — map-spread → Object.assign
- `src/run/history.ts`, `src/run/runState.ts`, `src/tensor/tensor.ts`, `src/tensor/trace.ts`, `src/tensor/value.ts`, `src/ui/chainLinks.ts`, `src/ui/operationRows.ts` — комментарии перенесены на свою строку
- `tests/tensor/boundaries.test.ts` — jsonc-толерантный парсер конфига (построчный стрип // — полнострочные комментарии; регекс по символам съедал бы globs вида **/tensor/*)
- `tests/**` (5 файлов), `e2e/smoke.spec.ts`, `playwright.config.ts` — комментарии на свою строку

## Decisions Made
- Замороженный список исключений зафиксирован по факту первого прогона (oxlint 1.92.0): react/react-in-jsx-scope, eslint/max-lines-per-function, eslint/max-lines, eslint/require-unicode-regexp (off), eslint/no-underscore-dangle (allow __run); eslint/no-await-in-loop off — override только для e2e/**. Обоснования — в самом конфиге. Известный кандидат плана typescript/no-non-null-assertion НЕ понадобился: правило не входит во включённые категории и не сработало (topo[k]!. остаётся легальным без исключения)
- ignorePatterns [".claude/**"]: 369 JS/TS-файлов вендорного GSD-тулинга давали 283 предупреждения базлайна; правки там регенерируются установщиком GSD
- 2 остаточных warning осознанные: LinkPanel only-export-components (существующий конфиг allowConstantExport) и OperationPanel no-array-index-key (индекс элемента тензора — и есть позиционная идентичность: data-ref/drill-down тоже позиционные `${sym}[${i}]`)
- package.json: диапазон выставлен как ~1.92.0 (план: «~1.92» — минорный пин, дрейф правил контролируется lockfile)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] boundaries.test.ts не парсил jsonc-конфиг**
- **Found during:** Task 1 (bring-up, финальный гейт)
- **Issue:** План допускает jsonc-комментарии в .oxlintrc.json, но существующий CI-тест границ звал JSON.parse напрямую; строгое JSON падает на комментарии
- **Fix:** Тест-хелпер вырезает полнострочные `//`-комментарии перед парсингом (построчно: посимвольный регекс /*...*/ съедает glob-паттерны `**/tensor/*`). Ассерты теста не изменены
- **Files modified:** tests/tensor/boundaries.test.ts
- **Verification:** pnpm test 101/101
- **Committed in:** e54f20f

**2. [Rule 1 - Bug] react/exhaustive-effect-dependencies в StepperBand (реальная находка)**
- **Found during:** Task 1 (bring-up, первый прогон с категориями)
- **Issue:** Эффект автоскролла держал dep [stepInSample], не используя значение в теле (правило классифицировало его как «лишний»)
- **Fix:** Активная пилюля вычисляется как band.children[stepInSample-1] (эквивалент aria-current для !epochDone), deps [stepInSample, epochDone]
- **Files modified:** src/ui/StepperBand.tsx
- **Verification:** pnpm lint зелёный; e2e ×2 бит-идентичны (скролл-поведение не изменилось)
- **Committed in:** e54f20f

---

**Total deviations:** 2 auto-fixed (1 blocking-инфраструктура, 1 реальный bug, пойманный новыми категориями)
**Impact on plan:** Оба — в границах задачи; доказательство ценности строгих категорий (correctness нашёл живую проблему).

## Issues Encountered
- pnpm add -D oxlint@~1.92 записал в package.json ^1.92.0 (save-prefix по умолчанию) — поправлено на ~1.92.0 руками по букве плана, lockfile синхронизирован pnpm install

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Готово к 02-02 (волна 2): весь новый код фазы пишется под строгим линтером, границы модулей прежние
- DOCS-01 не закрывается этим планом (shared-ID гейт: 7 sibling-планов фазы тоже декларируют DOCS-01)

## Self-Check: PASSED

Verify-команды плана (все зелёные):
- `test ! -f eslint.config.js && echo OXLINT-ONLY` → OXLINT-ONLY
- `pnpm lint` → exit 0 (2 warning: LinkPanel only-export-components — существующий конфиг; OperationPanel no-array-index-key — позиционная идентичность)
- `rg '"suspicious"' && rg 'D-27'` → LINT-STRICT-FROZEN
- `pnpm test && pnpm e2e` → 101/101, 11/11 (+второй прогон бит-идентичен)
- `pnpm list --depth 0` → oxlint 1.92.0; других изменений зависимостей нет

---
*Phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone*
*Completed: 2026-11-12*
