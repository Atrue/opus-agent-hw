---
phase: 02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone
verified: 2026-11-16T10:35:00Z
status: passed
score: реверификация цикл 2 — все 4 OQ disposition A закрыты gap-планами; must-haves 12/12 планов подтверждены; 124 unit + 16 e2e + lint 0 + tsc 0
reverification: cycle 2 (2026-11-16: gap-планы 02-10/02-11/02-12 исполнены, disposition OQ-1..4 закрыты; авто-прогон верификатора зелёный)
covered_files:
  - .oxlintrc.json
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-01-PLAN.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-01-SUMMARY.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-02-PLAN.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-02-SUMMARY.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-03-PLAN.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-03-SUMMARY.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-04-PLAN.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-04-SUMMARY.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-05-PLAN.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-05-SUMMARY.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-06-PLAN.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-06-SUMMARY.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-07-PLAN.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-07-SUMMARY.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-08-PLAN.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-08-SUMMARY.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-09-PLAN.md
  - .planning/phases/02-dvizhok-i-mvp-walkthrough-na-odnom-neyrone/02-09-SUMMARY.md
  - DECISIONS.md
  - e2e/smoke.spec.ts
  - src/run/etalon-constants.ts
  - src/run/gradcheck.test.ts
  - src/run/history.ts
  - src/run/invariants.test.ts
  - src/run/run.ts
  - src/run/scenario.ts
  - src/run/stepRecords.ts
  - src/run/trainingRun.ts
  - src/run/types.ts
  - src/run/url.ts
  - src/run/useRunSlice.ts
  - src/tensor/boundaries.test.ts
  - src/tensor/index.ts
  - src/tensor/model.ts
  - src/tensor/ops.ts
  - src/tensor/tensor.ts
  - src/tensor/trace.ts
  - src/tensor/value-grads.ts
  - src/tensor/value.ts
  - src/ui/App.tsx
  - src/ui/README.md
  - src/ui/chainLinks.ts
  - src/ui/compGraph.ts
covered_digest: v4:sha256:485f2413ce2215f9776026711a79e92c096ed85220ca5346af3747973d2cc9c4
---

# Phase 02: Движок и MVP-walkthrough на одном нейроне — Verification Report (цикл 1)

**Phase Goal:** Пользователь сам проходит полный walkthrough первого урока на сети из одного нейрона — исполняет каждый шаг forward/backward-pass, видит каждое число и Drill-down до формулы — на движке, чья корректность доказана тестами (MVP R1). Инженерные стандарты владельца: строгий oxlint-линтер с зафиксированными исключениями (D-27), модульная структура папок (D-28), декомпозиция Value на чистые функции градиентов (D-29), общий интерфейс модели (D-30), лосс без визуализации на графе (D-32), никаких собственных полей window (D-33).

**Verified:** 2026-11-13 — inline-верификация по запросу владельца (фаза исполнена 9/9 планов 2026-11-13; `/gsd-verify-work 02` не запускался — отчёт закрывает пустоту верификации).
**Status:** **gaps_found** — must-haves всех 9 планов подтверждены автоматикой, но 4 из инженерных стандартов владельца реализованы в суженной интерпретации планировщика; требуется решение владельца (см. «Открытые вопросы»).

## Goal Achievement

- **MVP R1 «один нейрон» — достигнут:** walkthrough 8 оп (AND, σ+BCE, lr 0.5), drill-down, эпохи/FF, клавиатура UX-02 — e2e 1–16 зелёные; NFR-02 на neuron тремя ногами (gradcheck → self-capture эталон → бит-бит инварианты).
- **Инженерные стандарты — частично:** D-27 (oxlint-only, замороженный блок) и D-30 (ScenarioModel/render), D-31/D-32/D-33 — исполнены как сформулировано в планах; D-28 (структура папок/экспортов) и D-29 (декомпозиция Value) — исполнены в суженной интерпретации, зафиксированной как «решение планировщика» (A6, журнализация 02-06) без явного апрува владельца; lint-enforcement структуры и интерфейсы движка — не планировались вовсе. Детали — OQ-1…OQ-4.

## Must-Haves по планам (сводно)

| План | Стандарт | Evidence (проверено верификатором) |
|---|---|---|
| 02-01 | D-27 oxlint-only bring-up | `.oxlintrc.json`: категории correctness/suspicious=error + pedantic/perf=warn, замороженный блок исключений (строки 33–42), oxlint 1.92.0; `pnpm lint` exit 0 (6 warnings pedantic/perf — не блокируют по контракту) |
| 02-02 | D-28а колокация тестов | 12 тест-файлов в `src/**` (9 git mv + 3 новых), папки `tests/` нет; carve-out `src/tensor/**/*.test.ts` в `.oxlintrc.json:78-100`; boundaries-тест сканирует deep-imports вместе с тестами |
| 02-03 | D-29 декомпозиция движка | `value-grads.ts` (8 чистых localGrad*), `tensor.ts` BackwardPlan (tagged union, строки 35–40) + диспетчер `runBackwardPlan` (63–83); grep `defineBackward\|setBackward\|backwardFn` по src = **0**; ядра ops.ts не изменены |
| 02-04 | D-30 ScenarioModel/render | `scenario.ts` ScenarioModel/ScenarioRender + XOR render-инвентарь; `buildModel(spec)` в model.ts; buildStepRecord из opMeta; MLP/OPS_PER_SAMPLE как идентификаторы удалены (3 остаточных вхождения — prose-упоминания в доках); XOR бит-идентичен (e2e 6 по эталону) |
| 02-05 | D-31 носитель «один нейрон» | NEURON_SCENARIO дефолт; `#scenario=xor` выбираем (e2e 5/6); e2e 1–16 на neuron-носителе |
| 02-06 | D-32 лосс вне графа | op:bce/L-узлы удалены из spec.render обоих сценариев (opMeta bce остаётся — панель операции, не граф); e2e 13/14; dangling-id юнит-гейт |
| 02-07 | D-28б сплит run + D-33 | `src/run/`: types/stepRecords/trainingRun/run/useRunSlice (+history/scenario/url); grep `window.__run\|declare global` = **0** |
| 02-08 | D-28б/в экспорты + README | `export default` по src = **0**; README в src/{tensor,run,ui,format} |
| 02-09 | NFR-02 neuron | gradcheck.test.ts (central-difference) + ETALON_NEURON_SAMPLE_1 + инварианты параметризованы спеком; e2e-пины 1/16 числами из констант |

## Automated Checks (прогон верификатора 2026-11-13)

- `pnpm test` → **121 passed** (12 файлов)
- `pnpm lint` → **exit 0** (6 warnings — pedantic/perf, не блокируют по контракту D-27)
- `npx tsc --noEmit` → **exit 0**
- `pnpm e2e` → **16 passed** (одинарный прогон верификатора; двойная бит-идентичность — в планах 02-05/02-06/02-09)

## Открытые вопросы (gaps): стандарты владельца vs реализация

Формулировки стандарта — `02-CONTEXT.md §decisions` (2026-11-09, переданы владельцем в планирование). Все четыре вопроса объединяет одна системная причина: **сужение произошло на этапе планирования** (интерпретации A6/OQ5 планировщика, «принятые по умолчанию» при пакетном апруве 9 планов), **must-haves планов писались уже после сужения** (поэтому автоматика их не ловит), а **сверка результата с исходными словами владельца не проводилась** — `/gsd-verify-work 02` не запускался до сих пор.

### OQ-1. Структура кода не ограничена линтером — нарушения не детектируются и не фиксируются

- **Ожидание владельца:** п.2 стандарта (модульная структура) должен быть enforcement-правилом — линтер ловит нарушения, а не конвенция на честном слове.
- **Факт:** в `.oxlintrc.json` нет правил гранулометрии экспортов/папок: ближайшие кандидаты `max-lines`/`max-lines-per-function` **выключены** замороженным блоком (строки 38–39, обоснование bring-up: «рефакторинг ради длины рискует бит-точность NFR-02»); правил типа max-exports в oxlint 1.92 нет вообще (unicorn/max-module-exports не реализован), type-aware правила отложены до TS7 (D-27). Structural enforcement остался только у границ `src/tensor` (no-restricted-imports + boundaries-тест).
- **Причина:** задача «кодифицировать D-28 в линтере» не ставилась ни в одном плане; после активации D-27 добавление правил = апрув владельца (AGENTS.md №5), но этот механизм никто не активировал.
- **Закрытие:** выбрать (A) gap-план «линтер-гейт структуры» — с явным апрувом конфига по D-27 (пользовательский tsgolint/кастомный check-скрипт гранулометрии); (B) принять конвенцию + ручная сверка на ревью фазы 3.

### OQ-2. Файлы не разбиты по папкам; много экспортов в одном файле

- **Стандарт (D-28, исходно):** «Код делится на модули… и по этому делению организуются **папки**; в файле преимущественно **только один именованный экспорт**».
- **Факт:** мультиэкспорт против буквы стандарта: `scenario.ts` — 21 экспорт, `compGraph.ts` — 18, `trace.ts` — 12, `history.ts` — 12, `chainLinks.ts` — 11, `ops.ts` — 10, `value-grads.ts` — 8. `src/ui/` — плоская папка из 23 файлов (16 компонентов + 4 утилит-модуля + 2 теста + README) без подпапок по сущностям (каркас приложения / текущий сценарий / граф / панели / модели вида).
- **Причина:** допущение **A6** планировщика (`02-07-PLAN.md:105`): «1 именованный экспорт на файл» перечитано как «1 модуль (+типы) на файл… файлы единой связной ответственности (ops.ts) не дробятся дальше». A6 **принят по умолчанию** (STATE.md:122), журнализирован в 02-06 как гранулометрия D-28 — явного апрува владельца не было. «Модулем» объявлен верхний уровень (tensor/run/ui/format): сплит по планам прошёл только по `runState.ts` (02-07); ui тронут не был (02-08 — «правки механические»: именованные экспорты + README).
- **Закрытие:** (A) gap-план «структура папок» — подпапки ui по сущностям + дробление мультиэкспортных файлов + OQ-1 как гейт; (B) перенести в фазу 3 (там всё равно рост сценариев); (C) принять гранулометрию A6 задним числом.

### OQ-3. Value всё ещё содержит логику каждой операции (декомпозиция наполовину)

- **Стандарт (D-29, исходно):** «разбить Value на независимый класс + **независимые простые функции для каждой операции**».
- **Факт:** вынесены только локальные градиенты (`value-grads.ts`, 8 функций); forward-математика всех 8 операций осталась методами класса (`value.ts:50-80`: add/sub/mul/div/neg/tanh/sigmoid/log считают `this.data ± o.data` inline), `runBackward` — switch по op-строке на классе (`value.ts:86-135`). Асимметрия с Tensor: у Tensor forward-математика в чистых ядрах `ops.ts` (matvecForward/sigmoidForward/…), у Value — нет.
- **Причина:** must_haves 02-03 сформулированы в суженной форме («файл чистых функций **локального градиента**… замыканий больше нет») — исполнена вторая половина фразы D-29 (замена backwardFn), первая («функции для каждой операции») в план не попала. Мотивация сужения — консерватизм NFR-02 («рефакторинг без изменения чисел», «ядра ops.ts не редактируются»).
- **Закрытие:** (A) gap-план: value-forward-ядра (`ops`-стиль: addForward(a,b)… / по функции на операцию forward+backward парой) + опционально op-таблица вместо switch — бит-идентичность инвариантами «drill-down = движок» 1e-12 как страховка; (B) принять как есть (Value — view-слой drill-down, не путь исполнения).

### OQ-4. Нет интерфейсов на уровне движка; Value — класс с четырьмя ролями

- **Ожидание владельца:** интерфейсы как контракты слоёв/операций; Value в текущем виде — «нагромождённый класс».
- **Факт:** D-30 (интерфейс модели) реализован — но только для сценарного слоя (`ScenarioModel`/`ScenarioRender`). Движок: у Tensor есть контракты (BackwardPlan tagged union, TensorInit), у Value — только `ValueInit`/`ScalarOp`; интерфейса операции (общий контракт «op = данные + forward + local-grad») нет ни там, ни там. `Value` совмещает 4 роли: данные узла, forward-конструкторы всех операций, диспетчер backward, topo-обход.
- **Причина:** требование «интерфейсы движка» не формулировалось в D-29 (там «класс + функции»), D-30 scoped к сценарному слою; ни один план не содержал must-have на контракты движка. Дополнительный фактор — половинная декомпозиция OQ-3: пока forward живёт в методах, интерфейс операции естественным образом не возникает.
- **Закрытие:** связан с OQ-3: (A) gap-план OQ-3+OQ-4 вместе (op-контракт как тип + чистые функции); (B) контракты только для сценного слоя (принять текущее).

## Disposition — требуется решение владельца

| OQ | A: gap-план сейчас | B: фаза 3 / позже | C: принять интерпретацию |
|---|---|---|---|
| 1. Линтер-гейт структуры | апрув конфига D-27 + правило/скрипт гранулометрии | конвенция + ревью | конвенция, журнализировать |
| 2. Папки/экспорты | сплит ui + дробление мультиэкспортов | вместе с ростом сценариев фазы 3 | гранулометрия A6 задним числом |
| 3. Value-декомпозиция | forward-ядра + op-функции, бит-идентичность | — | «Value = view-слой» как оправдание |
| 4. Интерфейсы движка | вместе с OQ-3 (op-контракт) | — | контракты только сценарного слоя |

Статус фазы остаётся **gaps_found** до решения владельца по OQ-1…4 (любая комбинация A/B/C; выбранные A-пункты → gap-планы через `/gsd-plan-phase --gaps`, C-пункты → журнализация в DECISIONS.md как ревизии D-28/D-29).

**Disposition владельца (2026-11-13): OQ-1 = A, OQ-2 = A, OQ-3 = A, OQ-4 = A** — все четыре вопроса закрываются gap-планами сейчас: 02-10-PLAN (OQ-3/OQ-4: value-ops/ per-op модули + контракт ValueOpContract), 02-11-PLAN (OQ-2: подпапки ui по сущностям + дробление мультиэкспортов), 02-12-PLAN (OQ-1: гейт structure.test.ts + docs-sync D-34; disposition 1-a включает апрув расширения freeze-контракта на гейт). Порядок: 02-10 → 02-11 → 02-12. Реверификация (цикл 2) — после SUMMARY всех трёх.

## Реверификация (цикл 2, 2026-11-16) — PASSED

Все 4 OQ disposition A закрыты исполненными gap-планами; фактическое состояние кодовой базы сверено верификатором напрямую (не по SUMMARY).

### Автоматические проверки (прогон верификатора 2026-11-16)

- `pnpm test` → **124 passed** (13 файлов; включает structure.test.ts R1/R2/R4)
- `pnpm lint` → **exit 0** (6 warnings — pedantic/perf, не блокируют по контракту D-27)
- `npx tsc --noEmit` → **exit 0**
- `pnpm e2e` → **16 passed** (одинарный прогон верификатора; двойная бит-идентичность зафиксирована в планах 02-05/02-06/02-09/02-10)

### Закрытие OQ по disposition A

| OQ | Gap-план | Evidence (сверено верификатором 2026-11-16) | Статус |
|---|---|---|---|
| OQ-3/OQ-4 | 02-10 | `src/tensor/value-ops/` — 8 per-op модулей свободными функциями (add/sub/mul/div/neg/tanh/sigmoid/log, backwardFn с чистыми локальными производными внутри каждой) + index-баррел; `value-grads.ts` удалён (0 вхождений); Value = контейнер без методов + свободная `backward(root)` (backward.ts) | **закрыт** |
| OQ-2 | 02-11 | `src/ui/` — 10 подпапок сущностей (app/chain/dataset/epoch/formula/graph/numbers/operation/stepper/typography) + README в корне; `src/run/scenario/` + `src/run/history/` домены с баррелами; `SegmentId` в `src/run/types.ts:13` (слой-инверсия run→ui закрыта); мультиэкспортные файлы (scenario/compGraph/chainLinks/trace/history/ops…) раздроблены по доменам | **закрыт** |
| OQ-1 | 02-12 | `src/structure.test.ts` — STRUCTURE-GATE бинарного минимума R1 (нет export default; единственные вхождения в src — строки/комментарии самого гейта, заякоренного на начало строки) / R2 (корень ui — только README) / R4 (tensor не-тесты — только внутрь библиотеки; резолв-семантика D-34); D-34 журнализирован в DECISIONS.md (пакет: гранулометрия-инструкция, гейт, Value-операции-функции, ulp-дрейф, ops/ по операциям, SegmentId, супрессии A6-чтения D-28 и «замыкания удалены» D-29); AGENTS.md №6 расширен на гейт + пункт 7 «Гранулометрия модулей» | **закрыт** |

### Правки замороженных контрактов — только по апруву владельца (соблюдено)

- `.oxlintrc.json:74` — override границы tensor заменён `'^(\.\./){2,}'` (подпапки легально импортируют корень библиотеки; выход ЗА src/tensor запрещён) — правка апрувована владельцем при ревью gap-планов 2026-11-13, помечена D-34-комментарием в конфиге; boundaries-тест зеркалит.
- D-33: `window.__run` / `declare global` по src = **0**.

### Статус фазы

Фазовая цель достигнута: MVP R1 «один нейрон» (DOCS-01/02, UX-02) на живом движке с NFR-02 тремя ногами + все инженерные стандарты владельца D-27..D-34 реализованы в полной формулировке и зафиксированы (гейт + журналы). Открытых вопросов нет. Фаза готова к UAT → закрытию.


## Requirements

DOCS-01 ✓ (walkthrough 8 оп, каждое число + drill-down; e2e 1–16) · DOCS-02 ✓ (drill-down формула-строки из чисел сценария) · UX-02 ✓ (клавиатура →/Space/PgDn вперёд, ←/Backspace/PgUp инертны — e2e 7–10). NFR-02 ✓ (gradcheck + эталон + инварианты; XOR-регрессия e2e 6). Orphaned — нет.

human_verification:
  - test: "Решение владельца по OQ-1…OQ-4 (матрица Disposition)"
    expected: "Владелец выбирает маршрут A/B/C по каждому из четырёх открытых вопросов; выбранные A-пункты превращаются в gap-планы, C-пункты — в ревизии D-28/D-29 журналом DECISIONS.md"
    why_human: "Вопросы — расхождения между исходными стандартами владельца и их суженной реализацией; приоритет (чинить сейчас / фаза 3 / принять) — суждение владельца, автоматика верифицирует только исполнение выбранного маршрута"
  - test: "UAT walkthrough «один нейрон» (экран, числа, drill-down, история звена)"
    expected: "Полный проход первого урока на нейроне: каждый шаг виден числом, drill-down до формулы, история звена, экран эпохи; владелец принимает UX-качество носителя MVP R1"
    why_human: "e2e 1–16 проверяют контракты; восприятие урока как учебного текста — приём владельца (прецедент: 01.2-UAT принимался владельцем по контрактам)"
