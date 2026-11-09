# Phase 2: Движок и MVP-walkthrough на одном нейроне - Pattern Map

**Mapped:** 2026-11-09
**Files analyzed:** 27 групп (~40 файлов new/modified)
**Analogs found:** 25 / 27 (2 без близкого аналога — контент из 02-RESEARCH.md Code Examples)

> Специфика фазы: это фаза рефакторинга/миграции, поэтому для большинства «новых» файлов ближайший аналог — **сам изменяемый файл в текущем виде** (extrakt-цели помечены как `self`). Все аналоги — git-tracked источники (проверено `git ls-files`); зеркал capability-плагинов среди аналогов нет.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `eslint.config.js` (new) | config | — (dev tooling) | `.oxlintrc.json` | role-match (линтер-конфиг; контент — RESEARCH §Code Examples) |
| `package.json` (scripts + devDeps) | config | — | `package.json:6-36` (self) | exact |
| `.oxlintrc.json` (carve-out `*.test.ts`, путь etalon) | config | — | `.oxlintrc.json:19-39` (self — override-структура) | exact |
| `tests/**` → `src/**` колокация (9 файлов: etalon/invariants/expanders/boundaries/runState/history/chainLinks/compGraph/format) | test | batch/transform | `tests/tensor/etalon.test.ts:1-5` (импорт-паттерн; правится на `./…`) | exact (перенос) |
| `src/run/etalon-constants.ts` (move + NEURON-константы) | test-fixture (plain-TS) | — | `tests/tensor/etalon-constants.ts` (self) | exact |
| `src/run/types.ts` (new, сплит из runState) | model (типы) | — | `src/run/runState.ts:19-110` (self) + `src/tensor/trace.ts:16-50` | exact |
| `src/run/stepRecords.ts` (new, сплит) | utility | transform | `src/run/runState.ts:86-275` (self) | exact |
| `src/run/trainingRun.ts` (new, сплит) | service/store | event-driven | `src/run/runState.ts:279-533` (self) | exact |
| `src/run/run.ts` (new, без `window.__run`) | provider (синглтон) | — | `src/run/runState.ts:535-544` (self, минус window-блок) | exact |
| `src/run/useRunSlice.ts` (new, сплит) | hook | event-driven | `src/run/runState.ts:546-549` (self) | exact |
| `src/tensor/value.ts` (декомпозиция + чистые grad-фн) | model | transform | `src/tensor/ops.ts:9-87` (чистые ядра — канон) | role-match |
| `src/tensor/tensor.ts` (BackwardPlan-дескриптор) | model | transform | `src/tensor/expanders.ts:27-39` (ExpandRequest union + switch-диспетчер) | role-match |
| `src/tensor/model.ts` (`buildModel(spec)`) | model (factory) | transform | `src/tensor/model.ts:25-51` (self — MLP) + `src/run/scenario.ts:17-24` | exact |
| `src/tensor/trace.ts` (курсор из спека) | controller (исполнение) | transform | `src/tensor/trace.ts:87-145` (self — advance switch) | exact |
| `src/tensor/index.ts` (экспорты нового API) | barrel | — | `src/tensor/index.ts:7-31` (self) | exact |
| `src/run/scenario.ts` (`ScenarioModel` + `NEURON_SCENARIO`) | model (декларативные данные) | — | `src/run/scenario.ts:26-139` (self — XOR_SCENARIO) | exact |
| `src/run/gradcheck.test.ts` (new, central difference) | test | transform | `tests/tensor/invariants.test.ts:38-57` (курсор-драйвинг) | role-match |
| `src/run/url.ts` (+ `'neuron'`) | utility | request-response (parse внешнего ввода) | `src/run/url.ts:16-26` (self — whitelist) | exact |
| `src/run/history.ts` (серии из spec.render) | utility | transform | `src/run/history.ts:165-194` (self — таблицы серий) | exact |
| `src/ui/compGraph.ts` (seeds из spec.render; loss-узел off) | model (view-data) | transform | `src/ui/compGraph.ts:70-165` (self — NODE_SEEDS/EDGE_SEEDS) | exact |
| `src/ui/chainLinks.ts` (сегменты из spec; цепь x→z→ŷ→L→W) | model (view-data) | transform | `src/ui/chainLinks.ts:40-79` (self — SEGMENTS) | exact |
| `src/ui/ComputationGraph.tsx` (nodeValue/nodeGrad по id из spec) | component | event-driven | `src/ui/ComputationGraph.tsx:84-179` (self — switch по id) | exact |
| `src/ui/FormulaStrip.tsx` (формула из spec.render) | component | event-driven | `src/ui/FormulaStrip.tsx:54-74` (self — литеральная строка) | exact |
| `e2e/smoke.spec.ts` (селекторы/baseline/импорт etalon) | test (e2e) | — | `e2e/smoke.spec.ts:48-59` (self) | exact |
| `AGENTS.md` (постоянное правило D-27) | doc | — | `AGENTS.md` § «Постоянные правила» | exact |
| `src/{tensor,run,ui,format}/README.md` (4 new) | doc | — | `README.md` (корень) | weak (в модуле README нет ни одного) |
| `tsconfig.app.json` (тесты попадают в tsc-scope) | config | — | `tsconfig.app.json:30` (`include: ["src"]`) | exact |

## Pattern Assignments

### `src/tensor/value.ts` + `src/tensor/tensor.ts` — чистые функции градиентов (D-29)

**Analog (канон чистых функций):** `src/tensor/ops.ts`

Чистые градиент-ядра УЖЕ существуют и вызываются из замыканий — рефакторинг убирает слой замыканий, не трогая математику. Копировать стиль: JSDoc с формулой + фиксированный порядок суммирования.

**Core pattern** (`src/tensor/ops.ts:9-27`):

```typescript
/** z = W·x: матрица w [rows×cols] row-major на вектор x [cols] → [rows]. */
export function matvecForward(w: Float64Array, rows: number, cols: number, x: Float64Array): Float64Array {
  const out = new Float64Array(rows)
  for (let j = 0; j < rows; j++) {
    let acc = 0
    for (let i = 0; i < cols; i++) acc += w[j * cols + i]! * x[i]!
    out[j] = acc
  }
  return out
}

/** ∂L/∂W = ∂L/∂z · xᵀ: dW[j][i] = gOut[j]·x[i] (без суммирования). */
export function matvecGradW(gOut: Float64Array, x: Float64Array, rows: number, cols: number): Float64Array {
```

**Что заменяется** (`src/tensor/value.ts:35-42` — мутирующее замыкание):

```typescript
add(o: Value): Value {
  const out = new Value(this.data + o.data, { op: '+', parents: [this, o] })
  out.backwardFn = () => {
    this.grad += out.grad
    o.grad += out.grad
  }
  return out
}
```

→ чистая `localGrad(op, parents, incoming)` на файл `value-grads.ts` (или в том же файле рядом с классом); метод класса — только `parent.grad += incoming * local` В ТОМ ЖЕ ПОРЯДКЕ побочных эффектов (`this` → `o`). То же для `sub/mul/div/neg/tanh/sigmoid/log` (`value.ts:44-102`).

**Диспетчер-аналог для Tensor** (`src/tensor/expanders.ts:27-39` — tagged union уже используется в проекте):

```typescript
export type ExpandRequest =
  | { kind: 'matvec'; w: Operand; x: Operand; row: number }
  | { kind: 'add'; a: Operand; b: Operand; index: number }
  | { kind: 'tanh'; z: Operand; index: number }
  ...
```

`BackwardPlan` из 02-RESEARCH.md Pattern 1 — та же форма. Нестиiser порядок `accumulate(parentA) → accumulate(parentB)` один-в-один с текущими замыканиями (`src/tensor/tensor.ts:103-107`):

```typescript
out.setBackward(() => {
  if (out.grad === null) return
  accumulate(this, matvecGradW(out.grad, o.data, rows, cols))
  accumulate(o, matvecGradX(this.data, rows, cols, out.grad))
})
```

**Незыблемые точки (сигнатуры сохраняются):** `Tensor.runBackward()` (`tensor.ts:174-177`) вызывается из `SampleCursor.advance` (`src/tensor/trace.ts:119-135`) — topo-порядок и группировка backward-оп (case 9: `t.z2!.runBackward(); t.z2p!.runBackward()` — trace.ts:126-128; case 11: trace.ts:133-135) НЕ меняются. `F.bce` использует `Tensor.defineBackward` (`src/tensor/functional.ts:20-23`) — заменить на тот же plan-механизм.

**Safety net:** после КАЖДОГО файлового хода — полный `pnpm test` (etalon 1e-6 + invariants бит-в-бит + expanders 1e-12).

---

### `src/run/scenario.ts` — `ScenarioModel` + `NEURON_SCENARIO` (D-30/D-31)

**Analog:** `src/run/scenario.ts:17-45` (self — `XorScenario` + `XOR_SCENARIO`)

**Core pattern** — декларативный объект с literal-typed `id`, стартовыми весами полной точности, `opMeta` RU:

```typescript
export interface XorScenario {
  id: 'xor'
  layers: readonly number[]
  lr: number
  samples: readonly { x: readonly number[]; y: number }[]
  startWeights: { w1: number[][]; b1: number[]; w2: number[][]; b2: number[] }
  opMeta: readonly ScenarioOpMeta[]
}

export const XOR_SCENARIO: XorScenario = {
  id: 'xor',
  layers: [2, 3, 1],
  lr: 0.5,
  ...
```

`ScenarioModel` (RESEARCH Pattern 2, строки 296-307) расширяет этот же интерфейс полями `net: LayerSpec[]`, `loss: { kind: 'bce' }`, `startWeights: Record<string, …>`, `render: ScenarioRender`. `NEURON_SCENARIO` копирует структуру `XOR_SCENARIO` (26-139): 8 `opMeta`-записей вместо 13, формулы/нарративы RU в том же стиле (см. `scenario.ts:46-53`); веса руками под правило ŷ₀ ∈ [0.3, 0.7] (Pitfall 6). `opMeta`-тип `ScenarioOpMeta` (`scenario.ts:9-15`) уже готов — переиспользовать.

**Педагогический мост (RESEARCH A4):** входы 2 (x₁,x₂), датасет AND 4 примера, σ+BCE, lr ~0.5.

---

### `src/tensor/model.ts` — `buildModel(spec)` (D-30)

**Analog:** `src/tensor/model.ts:25-51` (self — MLP)

**Core pattern** — класс с `params()` (геттер параметров БЕЗ входов — уже соответствует D-30) и `forward`, возвращающим все промежуточные тензоры:

```typescript
export class MLP {
  readonly W1: Tensor
  ...
  params(): readonly Tensor[] {
    return [this.W1, this.b1, this.W2, this.b2]
  }

  forward(x: Tensor): MlpForward {
    const z1p = this.W1.matmul(x)
    const z1 = z1p.add(this.b1)
    ...
```

`buildModel(spec)` = генерализация: `net: LayerSpec[]` + `loss` → тот же контракт `{ params(): readonly Tensor[]; forward(x): ForwardTensors }`; MLP 2-3-1 остаётся частным случаем спека (фаза 3). `MlpForward`-тип (`model.ts:16-23`) обобщается в словарь/список walked-оп для `SampleCursor`. Конструктор из спека: `Tensor.of(start.w1, true)` — паттерн `model.ts:31-36`.

---

### `src/tensor/trace.ts` — курсор из спека (D-30/D-31)

**Analog:** `src/tensor/trace.ts:87-145` (self — advance switch)

**Core pattern** — switch на 13 операций с прямыми обращениями `this.model.W1…` (`trace.ts:92-143`):

```typescript
advance(): void {
  if (this.done) throw new Error('SampleCursor: сэмпл завершён — создайте новый курсор')
  const op = this.nextOp
  this.nextOp += 1
  const t = this.tensors
  switch (op) {
    case 0:
      t.z1p = this.model.W1.matmul(this.x)
      break
```

Обобщение: walked-список op'ов, сгенерированный `buildModel` (порядок = топология); case-тела переносятся как есть (байтовая семантика каждого `runBackward()`-вызова). `OPS_PER_SAMPLE = 13` (`trace.ts:53`) становится per-scenario (8 для neuron) — потребители: `runState.ts:322` (`stepInSample`), e2e. Recorder-механика (`onOp`, `trace.ts:50,64,144`) и типы `StepRecord`/`TensorIo` (`trace.ts:20-38`) не меняются.

---

### Сплит `src/run/runState.ts` → `types.ts` / `stepRecords.ts` / `trainingRun.ts` / `run.ts` / `useRunSlice.ts` (D-28б/D-33)

**Analog:** `src/run/runState.ts` (self, 549 строк — разрезается по границам)

| Новый файл | Что выносится (текущие строки) |
|---|---|
| `types.ts` | `Mode` 19, `LinkSelection` 22-25, `RunScreen` 28, `EpochSummaryData` 31-41, `Drill` 43-46, `SampleRecord` 54-68, `StartRecord` 71-76, `HistoryRecord` 79, `isSampleRecord` 82-84 |
| `stepRecords.ts` | PROV-константы 86-89, `stepProv` 91-93, `scalarIo` 95-99, `gradVec` 101-105, `flatWeights` 107-110, `buildStepRecord` 117-261, `currentPhase` 263-266, `firstOpValue` 269-275 |
| `trainingRun.ts` | `class TrainingRun` 279-533 (вкл. `newCursor`-recorder 519-532) |
| `run.ts` | `export const run = new TrainingRun()` 536 — БЕЗ блока `declare global`/`window.__run` 538-544 (D-33: удалить; A1: заменить документированным DevTools-сниппетом в README модуля) |
| `useRunSlice.ts` | хук 546-549 |

**Core pattern** — событийный корень на Set-listeners + version-счётчик (сохранить при переносе):

```typescript
subscribe = (listener: Listener): (() => void) => {
  this.listeners.add(listener)
  return () => {
    this.listeners.delete(listener)
  }
}

private emit(): void {
  for (const listener of this.listeners) listener()
}
```

(`runState.ts:508-517`; мутации весов публикуются `this.version += 1; this.emit()` — 477-479 и др.)

**buildStepRecord → из opMeta спека:** текущий switch на 13 кейсов (`runState.ts:129-260`, см. case 0 на 130-137) заменяется сборкой из метаданных op'ов; формат `inputs/outputs/grads/changed` и provenance-строки RU (`PROV_WEIGHT = 'вес модели (стартовые константы сценария)'`, 86-89) сохраняются дословно — на них завязаны etalon-тест (формулы/нарративы строкой) и UI.

**Модульная грань (Pitfall 4):** `trainingRun.ts` импортирует `SegmentId` из `../ui/chainLinks` (`runState.ts:17`) — при сплите следить за циклами (chainLinks → scenario → …).

---

### `eslint.config.js` (new) + `package.json` + `.oxlintrc.json` (D-27)

> **Ревизия D-27 (владелец, 2026-11-09, ревью планов): линтер = только oxlint.** Части этого паттерна про `eslint.config.js`, FlatCompat/airbnb-стек и скрипт `oxlint && eslint .` устарели (см. переработанный 02-01-PLAN.md и 02-CONTEXT.md §D-27 ревизия). Актуален ниже: **carve-out `.oxlintrc.json` для `*.test.ts`** (используется планом 02-02) и существующая override-механика. Новый bring-up 02-01: categories correctness/suspicious=error, pedantic/perf=warn в `.oxlintrc.json` + замороженный блок исключений; `scripts.lint` не меняется.

**Role-analog:** `.oxlintrc.json:7-39` — существующий линтер-конфиг c override-механикой:

```json
"overrides": [
  {
    "files": ["src/tensor/**"],
    "rules": {
      "no-restricted-imports": [ "error", { "patterns": [
        { "regex": "^[^.]", "message": "Внутри src/tensor/ разрешены только внутренние импорты './…' — библиотека изолирована от приложения и react (R2)." },
```

Контент-источник: **02-RESEARCH.md §Code Examples «ESLint flat config»** (строки 412-455) — полный эскиз `eslint.config.js` (FlatCompat + airbnb-base + tseslint + oxlint-дедуп + зафиксированные исключения `import/prefer-default-export: 'off'`, `@typescript-eslint/no-non-null-assertion: 'off'`). Разделение ответственности: oxlint = границы (`no-restricted-imports`, `.oxlintrc.json:7-17`) + react; ESLint = TS-стиль/корректность; границы в ESLint НЕ дублировать (Anti-Pattern RESEARCH).

**package.json:** `lint` скрипт становится `oxlint && eslint .` (сейчас `"lint": "oxlint"` — package.json:9); devDeps из RESEARCH Installation (строка 121-123) — через `checkpoint:human-verify`.

**.oxlintrc.json carve-out (Pitfall 1):** после колокации `src/tensor/value.test.ts` и др. импортируют `vitest` — regex `^[^.]` (`.oxlintrc.json:26-31`) ловит их. Добавить override для `src/tensor/**/*.test.ts` с послаблением ТОЛЬКО на `vitest` (по образцу существующего overrides-блока 19-39); также путь etalon-исключения в group-паттерне (`.oxlintrc.json:12` `!**/etalon-constants`) актуализировать под `src/run/etalon-constants.ts`.

---

### Колокация тестов `tests/**` → `src/**` (D-28а)

**Analog:** `tests/tensor/etalon.test.ts:1-5` — паттерн импортов, который правится на относительные:

```typescript
import { describe, expect, it } from 'vitest'
import { buildStepRecord } from '../../src/run/runState'
import { XOR_SCENARIO } from '../../src/run/scenario'
import { MLP, SampleCursor, type StepRecord, type TensorValues } from '../../src/tensor'
import { ETALON_SAMPLE_1 } from './etalon-constants'
```

После переезда: `from '../../src/run/runState'` → `from './runState'` (или `./trainingRun` после сплита); `from '../../src/tensor'` → `from '../tensor'` (в `src/run/*`), `from '../tensor'` (в `src/ui/*`). `vitest` include default уже покрывает `src/**` (RESEARCH, verified) — `vite.config.ts:9-13` менять НЕ нужно. `tests/tensor/etalon-constants.ts` → `src/run/etalon-constants.ts` (RESEARCH Open Question 1): сохранить качество «plain-TS, 0 импортов» (`etalon-constants.ts:1-10` — header это фиксирует).

**boundaries.test.ts exempt (Pitfall 1):** правило (1) «внутри src/tensor/ только `./…`» (`tests/tensor/boundaries.test.ts:56-62`) падает на `src/tensor/expanders.test.ts` (импорт vitest). Механика правки — фильтр `tensorFiles` (строка 48) дополняется исключением `*.test.ts` только для правила (1); правило (2) deep-imports (64-71) продолжает сканировать тесты. SRC_DIR-путь (строка 15: `new URL('../../src', import.meta.url)`) после переезда самого теста в `src/tensor/` меняется на `'../..'`/`'..'` соответственно.

---

### `src/run/gradcheck.test.ts` (new) — central difference для NEURON (D-31)

**Analog:** `tests/tensor/invariants.test.ts:38-57` — прогон курсора на живом движке:

```typescript
function runEpoch(record: boolean): EpochResult {
  const model = new MLP(XOR_SCENARIO.startWeights)
  ...
  const cursor = new SampleCursor(model, sample.x, sample.y, XOR_SCENARIO.lr, recorder)
  while (!cursor.done) {
    const op = cursor.opIndex
    cursor.advance()
```

Скелет numGrad — 02-RESEARCH.md §Code Examples строки 459-474 (пересборка графа с персёрбированным весом, h=1e-6, tol 1e-4). Дополнительно: tolerance-хелпер копировать из `tests/tensor/etalon.test.ts:23-31` (см. Shared Patterns).

---

### `src/run/etalon-constants.ts` — self-capture NEURON-констант (D-31)

**Analog:** `tests/tensor/etalon-constants.ts:12-27` (self):

```typescript
export interface EtalonStep {
  op: string
  formula: string
  narrative: string
  outputs: number[] | number[][]
  grads: Record<string, number[] | number[][]> | null
}

export const ETALON_SAMPLE_1: readonly EtalonStep[] = [
  { op: 'matvec', formula: 'z1 = W1·x', ..., outputs: [-0.9228963213252399, ...], grads: null },
```

NEURON-константы — новый экспорт рядом (`ETALON_NEURON_SAMPLE_1`), полная точность double литералами (shortest round-trip), источник в комментариях НЕ называется (гейт NO-JSON-REFS, RESEARCH self-capture шаг 4). XOR-эталон ОСТАВИТЬ как регрессию движка (RESEARCH Open Question 5). Порядок съёма — RESEARCH строки 476-488.

---

### `src/run/url.ts` — сценарий `'neuron'` (D-31)

**Analog:** `src/run/url.ts:16-26` (self — whitelist + клампинг):

```typescript
export const DEFAULT_SCENARIO = 'xor'

const KNOWN_SCENARIOS: readonly string[] = ['xor']

export function parseHash(hash: string): UrlState {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const scenario = params.get('scenario')
  return { scenario: scenario !== null && KNOWN_SCENARIOS.includes(scenario) ? scenario : DEFAULT_SCENARIO }
}
```

Правка: `KNOWN_SCENARIOS = ['neuron', 'xor']`; `DEFAULT_SCENARIO = 'neuron'` (рекомендация RESEARCH Open Question 4 — подтвердить на planning-чекпойнте). Механика клампинга (threat T-01.1-01) не меняется.

---

### `src/ui/compGraph.ts` — seeds из spec.render + loss-узел off graph (D-30/D-32)

**Analog:** `src/ui/compGraph.ts:70-120` (self — NODE_SEEDS):

```typescript
const NODE_SEEDS: readonly NodeSeed[] = [
  { id: 'x[0]', kind: 'value', role: 'const', label: 'x1', col: 0, row: 4 },
  ...
  { id: 'y[0]', kind: 'value', role: 'const', label: 'y', col: 14, row: 6 },
  { id: 'op:bce', kind: 'op', role: 'op', label: 'BCE', col: 14, row: 4 },
  { id: 'L', kind: 'value', role: 'computed', label: 'L', col: 15, row: 4 },
```

Новая структура: seeds читаются из `spec.render` (NEURON: ~10 узлов, цепь x→z→ŷ + update-станция), НЕ хардкодятся заново (Anti-Pattern RESEARCH: копирование NODE_SEEDS для нового сценария удвоит дублирование в фазе 3). Детерминированная геометрия сохранить: `col/row` → `x: PAD_X + s.col * PITCH_X` (`compGraph.ts:172-175`), pitch-константы 43-48, MAX_COL/MAX_ROW → пересчитать (49-54).

**D-32 — удалить с графа:** узлы `op:bce` (строка 116), `L` (117), `y[0]` (74 — единственный потребитель y на графе, Pitfall 5); рёбра `edge('ŷ','op:bce')`, `edge('y[0]','op:bce')`, `edge('op:bce','L')` (148-150); `SEGMENT_GROUPS.L` (203: `group(['op:bce','y[0]','L','ŷ'])`) переопределить на `['ŷ']`-подсветку; `STEP_GROUPS[6]/[7]` (215-216) — на `ŷ`. Расчёты лосса НЕ трогаются (D-26 жив: панель звена L, формула-строка, график лосса).

---

### `src/ui/chainLinks.ts` — сегменты из spec (D-30/D-31)

**Analog:** `src/ui/chainLinks.ts:40-63` (self — SEGMENTS):

```typescript
export const SEGMENTS: readonly ChainSegment[] = [
  { id: 'x', title: 'x — вход примера', formula: 'x = (x1, x2)', symbols: ['x'] },
  {
    id: 'z1',
    title: 'z1 — взвешенная сумма скрытого слоя',
    formula: `${op(0)} + b1`,
    symbols: ['W1', 'b1'],
  },
```

NEURON-цепь: `x → z → ŷ → L → W` (SegmentId сжимается с 7 до 5 — `chainLinks.ts:14`); RU-заголовки «символ первым» и склейка формул из opMeta (`op(i)`-хелпер, строка 38) — паттерн сохранить. `SEGMENT_NUMBER_SYMS` (71-79), `SYMBOL_NODES` (102-115), `symbolToSegment` (66-68), `geometryOf` (118-134) — та же форма, данные из spec.render.

---

### `src/ui/ComputationGraph.tsx` + `src/ui/FormulaStrip.tsx` — значения/формула из spec (D-30/D-32)

**Analog (nodeValue):** `src/ui/ComputationGraph.tsx:84-167` — switch по стабильным id:

```typescript
function nodeValue(id: string): number | undefined {
  const cursor = run.activeCursor
  const t = cursor.tensors
  const done = run.sampleOpValues
  ...
  switch (id) {
    case 'x[0]':
      return cursor.x.data[0]
```

Обобщение: id-адресация стабильных узлов из спека вместо литеральных XOR-кейсов; `nodeGrad` (170+) — симметрично. Гейт видимости `done[k] !== undefined` (напр. 126, 130) — сохранить семантику «число доступно, когда операция исполнена».

**Analog (формула):** `src/ui/FormulaStrip.tsx:54-74` — литеральная XOR-строка → рендер из `spec.render` (NEURON: `ŷ = σ(W·x + b) · L = BCE(y, ŷ) · W ← W − η·∂L/∂W`). Механику интерактивных символов сохранить: `SYM_TESTID` ASCII-маппинг (17-30), `aria-pressed`, testid `formula-sym-*` (32-44) — e2e-селекторы опираются на них.

**Pitfall 3/структура:** компоненты сейчас default-export (`export default function FormulaStrip()`, FormulaStrip.tsx:46) — фаза переводит в именованные экспорты (D-28б); тесты/e2e-селекторы не завязаны на экспорт, но импорты `App.tsx` правятся.

---

### `src/run/history.ts` — серии из spec (D-30/D-31)

**Analog:** `src/run/history.ts:165-194` (self — таблицы):

```typescript
const NODE_SERIES: Record<string, { labels: readonly string[]; pick: NodePick }> = {
  x: { labels: ['x₁', 'x₂'], pick: (r) => r.x },
  ...
  L: { labels: ['L'], pick: (r) => [r.loss] },
}

const WEIGHT_SERIES: Record<string, { labels: readonly string[]; from: number; to: number }> = {
  W1: { labels: WEIGHT_ROWS.slice(0, 6), from: 0, to: 6 },
```

Правка: таблицы становятся данными спека (NEURON: 3 веса W[2]+b[1] — `WEIGHT_ROWS` 19-33 сжимается с 13 до 3 меток); `SampleRecord`-поля `a1/z1/z2` (runState.ts:64-66) у нейрон-сценария вырождаются — спека решает, какие узловые поля несёт запись. `SEGMENT_DEFAULT_SYMBOL` (186-194) — под новый набор SegmentId. Чистые функции `sessionGeometryOf`/`buildLossChartData`/`linkHistoryOf` (70-248) не меняются по механике; `SAMPLE_COUNT`-зависимость (строка 15, сценарий-агностична — уже из `./scenario`).

---

### `e2e/smoke.spec.ts` — селекторы/baseline/импорт (D-31/D-32)

**Analog:** `e2e/smoke.spec.ts:48-59` (self):

```typescript
rmSync('e2e/screenshots', { recursive: true, force: true })
mkdirSync('e2e/screenshots', { recursive: true })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})
```

Правки: импорт etalon (строка 4: `'../tests/tensor/etalon-constants'` → `'../src/run/etalon-constants'`); селекторы loss-графа (`op:bce`, узел L — Pitfall 5/7: aria-label svg упоминает BCE, ComputationGraph.tsx:402); baseline-счётчик 28 → пересчёт под 8 оп/сэмпл (двойной прогон бит-идентичен — дисциплина 01.1-04, reducedMotion + DPR2 из playwright.config.ts:21). Контракт «testid описывает содержимое экрана» (D-20/R2) сохраняется.

---

### README-модули `src/{tensor,run,ui,format}/README.md` (D-28в, 4 new)

**Analog (weak):** `README.md` (корень) — единственный README в репо. Содержание: краткое «что делает модуль» + публичная поверхность (для `src/tensor` — указать границу index.ts как «публичный вход модуля», D-28 переосмысливает существующую границу). Стиль заголовков файлов-модулей — образец doc-comment-заголовков (`src/format/numbers.ts:1-7`, `src/tensor/index.ts:1-5`): модуль + обоснование решения + ссылки на решения.

### `AGENTS.md` — постоянное правило линтера (D-27)

**Analog:** AGENTS.md § «Постоянные правила (от пользователя, не обходить)» — новое правило №5 по образцу строк 1-2 (store-библиотеки, npm-пакеты): «любое изменение конфига линтера или его исключений — только с явного апрува владельца».

## Shared Patterns

### NFR-02 tolerance-хелпер (все численные тесты)
**Source:** `tests/tensor/etalon.test.ts:14-31`
**Apply to:** `src/run/etalon.test.ts` (миграция), `src/run/gradcheck.test.ts` (новый), все тесты сценариев.

```typescript
const REL_TOL = 1e-6
const ABS_FLOOR = 1e-12

function expectValuesClose(actual: TensorValues, expected: TensorValues, ctx: string): void {
  ...
  const tol = Math.max(REL_TOL * Math.abs(e[i]!), ABS_FLOOR)
  expect(Math.abs(a[i]! - e[i]!), ...).toBeLessThanOrEqual(tol)
```

Snapshot-матчеры чисел запрещены (AGENTS NFR-02) — только явные сравнения.

### Бит-идентичность (инварианты D-29)
**Source:** `tests/tensor/invariants.test.ts:63-67`
**Apply to:** рефакторинг Value/Tensor/trace — прогон до/после каждого хода.

```typescript
expect(stepwise.weights[p]!, `параметр #${String(p)} идентичен бит-в-бит`).toEqual(batch.weights[p])
expect(stepwise.losses).toEqual(batch.losses)
```

### Фиксированный порядок суммирования/аккумуляции
**Source:** `src/tensor/ops.ts:1-7` (header-контракт) + `accumulate` в `src/tensor/tensor.ts:35-41`
**Apply to:** все чистые grad-функции D-29 — ядра ops.ts НЕ трогать; порядок `accumulate(parentA → parentB)` и направление аккумуляции `acc` слева направо от 0 сохранять один-в-один (float-сложение некоммутативно — Pitfall 2).

### Граница модуля tensor (двойной enforcement)
**Source:** `.oxlintrc.json:7-17` (no-restricted-imports) + `tests/tensor/boundaries.test.ts:55-86` (fs-скан + проверка самого конфига)
**Apply to:** колокация тестов (carve-out обеих механик), `src/tensor/index.ts` (баррел — осознанное исключение из «1 экспорт», A6).

### Doc-comment-заголовок файла
**Source:** каждый модуль (`src/tensor/ops.ts:1-7`, `src/format/numbers.ts:1-7`, `src/run/url.ts:1-10`)
**Apply to:** все новые файлы (`types.ts`, `trainingRun.ts`, `run.ts`, gradcheck и др.): первый блок `/** … */` — что делает модуль, ключевое решение, ссылка на инвариант/решение. Это доминирующая конвенция кодовой базы.

### RU-строки изолированы в data-слое
**Source:** `src/ui/chainLinks.ts:40-63` (titles), `src/run/runState.ts:86-89` (PROV-*), `src/run/scenario.ts:46-138` (narratives)
**Apply to:** NEURON_SCENARIO opMeta, новые titles/провenance — RU-first, литералы в одном месте (D-10).

### Тест-дисциплина e2e (детерминизм скриншотов)
**Source:** `e2e/smoke.spec.ts:40-54` + `playwright.config.ts:14-28` (DPR 2, reducedMotion)
**Apply to:** любая UI-волна фазы (D-31/D-32) регенерирует baseline в том же плане; двойной прогон бит-идентичен.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `eslint.config.js` (контент) | config | — | В репо нет ни одного ESLint-конфига; flat config + FlatCompat-мост пишется по 02-RESEARCH.md §Code Examples (проверенные источники: eslint.org migration-guide, typescript-eslint.io, oxc.rs). Role-аналог `.oxlintrc.json` даёт только структуру overrides. |
| `src/{tensor,run,ui,format}/README.md` | doc | — | В репо нет модульных README (только корневой); формат «краткое описание функционала модуля» — по D-28в, стиль — корневой README.md. |

## Metadata

**Analog search scope:** `src/tensor/**`, `src/run/**`, `src/ui/**`, `src/format/**`, `tests/**`, `e2e/**`, корневые конфиги (`.oxlintrc.json`, `vite.config.ts`, `tsconfig*.json`, `playwright.config.ts`, `package.json`, `AGENTS.md`)
**Files scanned:** 30 (полностью: 22; секционно: `ComputationGraph.tsx`, `expanders.ts`, `etalon-constants.ts`, `runState.test.ts`, `chainLinks.test.ts`, `smoke.spec.ts`, RESEARCH/CONTEXT)
**Tracked-source gate:** все аналоги проверены по `git ls-files` — git-tracked, capability-зеркал нет
**Pattern extraction date:** 2026-11-09
