---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
plan: "10"
subsystem: engine
tags: [value-ops, autodiff, gap-closure, oq-3, oq-4, d-34, backwardfn]

requires:
  - phase: 02-03
    provides: value-grads.ts (аналитика локальных градиентов) + Value с методами — исходная точка декомпозиции
provides:
  - src/tensor/value-ops/ — 8 операций свободными функциями (одна на файл) с backwardFn-замыканием чистых локальных производных внутри + баррел
  - value.ts — класс-контейнер Value БЕЗ методов + свободная backward(root) с общим chain rule (topo + partials[i]·v.grad, порядок A→B)
  - value-grads.ts удалён; OQ-3/OQ-4 закрыты в форме владельца (ревью 2026-11-13)
affects: [02-11 (value-ops/ — эталон гранулометрии для ops/ и доменов), 02-12 (D-34 журнализация)]

actuals:
  tokens: 30000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "операция = свободная функция (a: Value, b: Value): Value; внутри объявлен backwardFn — замыкание чистых локальных производных (параллельно parents, без incoming/мутаций); chain rule — общий код backward(root)"
    - "замыкания разрешены в Value-view (drill-down), запрещены в движке исполнения Tensor (D-34)"

key-files:
  created:
    - src/tensor/value-ops/{index,add,sub,mul,div,neg,tanh,sigmoid,log}.ts
  modified:
    - src/tensor/value.ts — контейнер без методов + модульная backward(root)
    - src/tensor/expanders.ts — 16 сайтов цепочек → вложенные вызовы функций
    - src/tensor/expanders.test.ts — мини-тесты микро-графа на функции + backward(root)
    - .oxlintrc.json + src/tensor/boundaries.test.ts — согласованная с владельцем правка границы (см. Deviations)
  deleted:
    - src/tensor/value-grads.ts

key-decisions:
  - "Апрув владельца (Rule 4, чат 2026-11-13): override oxlint regex '^\\.\\./' → '^(\\.\\./){2,}' — подпапки tensor легально импортируют корневые модули; границы сохраняют запрет выхода ЗА src/tensor и bare-импортов"
  - "Принятый ulp-дрейф div/log/sigmoid подтверждён empirически: инвариант 1e-12/etalon 1e-6/16 e2e зелёные без правки ожиданий (toBeCloseTo(15) поглощает)"

patterns-established:
  - "value-ops/<op>.ts — эталон пер-оп модуля для 02-11 (операция и её градиент в одном файле)"

requirements-completed: [DOCS-01]

coverage:
  - id: D1
    description: "8 операций Value — свободные функции в value-ops/<op>.ts (1 именованный экспорт на файл), backwardFn внутри возвращает чистые локальные производные без incoming/мутаций; баррел index.ts"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "src/tensor/value-ops/*.ts (9 файлов); pnpm test — expanders + мини-тесты микро-графа зелёные"
        status: pass
    human_judgment: false
  - id: D2
    description: "Value = контейнер без методов (поля + конструктор) + свободная backward(root): topo-обход, chain rule общий, порядок вкладов A→B; value-grads.ts удалён (0 ссылок)"
    requirement: DOCS-01
    verification:
      - kind: unit
        ref: "src/tensor/value.ts; rg 'value-grads' src — 0 вхождений; pnpm test 121 passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "Числа: forward-выражения буквальные переносы; инвариант «drill-down = движок» 1e-12, etalon 1e-6, e2e 16 — зелёные; движок Tensor не тронут; index.ts не изменился"
    requirement: DOCS-01
    verification:
      - kind: command
        ref: "pnpm test (121) && pnpm lint (0 errors) && npx tsc -b (0) && pnpm e2e (16 passed); git diff index.ts = 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Структурная форма владельца (операция-функция с backwardFn, Value-контейнер, общий chain rule) — приёмка ручным ревью владельца по дифу value.ts + value-ops/"
    verification: []
    human_judgment: true
    rationale: "Решение ревью 2026-11-13: машинные структурные гейты исключены; структура принимается ревью владельца (диф прилагается: коммиты 27d8f1a, 02dd875)"

duration: 12 min
completed: 2026-11-13
status: complete
---

# Phase 02 Plan 10: value-ops — операции-функции с backwardFn (gap OQ-3/OQ-4) Summary

**Все 8 операций скалярного ядра стали свободными функциями value-ops/<op>.ts с замыканием backwardFn чистых локальных производных внутри; Value — контейнер без единого метода, chain rule — общий код свободной backward(root); value-grads.ts удалён; числа держат инвариант 1e-12 / etalon 1e-6 / 16 e2e.**

## Performance

- **Duration:** 12 min (17:16–17:28 UTC)
- **Tasks:** 2
- **Files modified:** 15 (9 создано, 5 изменено, 1 удалён)
- **Commits:** 94e7799 (граница tensor, апрув владельца), 27d8f1a (Task 1), 02dd875 (Task 2)

## Accomplishments
- value-ops/ — 8 per-op модулей (add/sub/mul/div/neg/tanh/sigmoid/log): единственный экспорт — функция операции; forward-выражения — буквальные переносы value.ts; внутри — `const backwardFn` с чистыми производными (mul→[b,a], div→[1/b, −a/b²], tanh→[1−out²], sigmoid→[out·(1−out)], log→[1/a]); JSDoc — формула forward + формула производной, ulp-комментарии на div/log/sigmoid
- value.ts: из класса ушли ВСЕ методы; backward(root) — модульная функция (topo-канон сохранён, посев ∂L/∂L=1, аккумулиация parents[i].grad += partials[i]·v.grad в порядке родителей); backwardFn-поле с exactOptionalPropertyTypes-условным присваиванием
- expanders.ts: 16 сайтов цепочек → вложенные вызовы функций (x.mul(y).add(z) → add(mul(x,y),z)); порядок операндов и формула-рендер не менялись
- Граница tensor расширена апрувом владельца (см. Deviations): '../…' из подпапок к корню легален, выход за src/tensor — нет; boundaries-тест зеркалит резолвом пути

## Task Commits

1. **Task 1: value-ops/ — 8 функций + баррел; поле backwardFn** - `27d8f1a` (feat; + `94e7799` fix границы — предусловие)
2. **Task 2: контейнер + backward(root); expanders на функции; value-grads удалён** - `02dd875` (feat)

## Files Created/Modified
- Created: `src/tensor/value-ops/{index,add,sub,mul,div,neg,tanh,sigmoid,log}.ts`
- Modified: `src/tensor/value.ts`, `src/tensor/expanders.ts`, `src/tensor/expanders.test.ts`, `src/tensor/README.md`, `.oxlintrc.json`, `src/tensor/boundaries.test.ts`
- Deleted: `src/tensor/value-grads.ts`
- Не изменились: `src/tensor/index.ts` (публичный API), движок Tensor (ops.ts/tensor.ts/BackwardPlan), эталон-константы

## Decisions Made
- exactOptionalPropertyTypes: backwardFn-поле присваивается условно (init.backwardFn !== undefined) — `?`-поле не принимает явный undefined
- tanh/sigmoid: backwardFn замыкает локальную переменную forward-значения (тот же double, что out.data — без post-hoc присваивания readonly-поля)

## Deviations from Plan

### Rule 4 (STOP → апрув владельца): конфликт границы tensor со структурой value-ops/
- **Found during:** Task 1 (гейт pnpm test && pnpm lint)
- **Issue:** value-ops/<op>.ts требует `import { Value } from '../value'`, но замороженный override oxlint (regex `^\.\./`) и boundaries-тест (правило 1, префикс './') запрещают любые '../…'-импорты в не-тестовых файлах src/tensor — оба гейта красные; план 02-11 (trace/, ops/) столкнулся бы с тем же (SampleCursor импортирует F/SGD/Tensor/model)
- **Fix (выбор владельца — «Апрув правки override»):** `.oxlintrc.json` tensor-override regex `^\.\./` → `^(\.\./){2,}` (запрет выхода ЗА библиотеку вместо запрета любого родителя; bare-импорты по-прежнему запрещены regex `^[^.]`); boundaries.test.ts правило (1) переписано на резолв пути (escapesTensor: relative + isAbsolute); D-27-процедура соблюдена — явный апрув в чате 2026-11-13, журнализация — D-34 (план 02-12)
- **Files modified:** `.oxlintrc.json`, `src/tensor/boundaries.test.ts`
- **Verification:** 121 unit + lint 0 errors + 16 e2e зелёные; правило (2) boundaries (deep-импорты мимо index.ts) не ослаблено
- **Committed in:** 94e7799

---

**Total deviations:** 1 (Rule 4 — архитектурный конфликт замороженных контрактов, разрешён владельцем)
**Impact on plan:** Граница изоляции библиотеки сохранена по смыслу (ноль импортов из приложения/react, ноль выхода за src/tensor); изменена только форма запрета родительских импортов. Остальное — точно по плану.

## Issues Encountered
None

## User Setup Required
None

## Next Phase Readiness
- 02-11: value-ops/ — эталон структуры для ops/ (по операциям) и доменов run/ui; граница tensor уже допускает подпапки
- Для SUMMARY прилагается диф структуры: value.ts (класс без методов + backward) и value-ops/ (9 файлов) — коммиты 27d8f1a, 02dd875

---
*Phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone*
*Completed: 2026-11-13*
