/**
 * Сценарий = декларативная модель (D-30): единственный источник топологии
 * сети (net), лосса, lr, датасета, стартовых весов (детерминированный старт,
 * DOGS-05 воспроизводимость), метаданных операций walkthrough (формулы и
 * нарративы RU) и рендер-меток (render: формула-строка, символы слоёв).
 * Сеть строится из модели: buildModel(spec) → граф → SampleCursor; UI читает
 * метки из render. XOR — первый носитель; сценарий «один нейрон» (D-31) и
 * MLP фазы 3 подключаются данными, без нового UI-слоя.
 */

import type { LayerSpec, Phase } from '../tensor'

export interface ScenarioOpMeta {
  op: string
  layer: number
  phase: Phase
  formula: string
  narrative: string
}

/** Рендер-метки слоя (D-30): символы z/h/w/b для формул, панелей и графа. */
export interface LayerSymbols {
  /** Пребиас-значение слоя (z1/z2) и его производные (∂L/∂z1). */
  z: string
  /** Активация слоя (a1 — скрытый, ŷ — выходной). */
  h: string
  /** Матрица весов слоя (W1/W2). */
  w: string
  /** Биас слоя (b1/b2). */
  b: string
}

/** Токен формулы-строки: интерактивный символ или статический текст. */
export type FormulaToken = { kind: 'sym'; sym: string } | { kind: 'text'; text: string }

/** Сегмент формулы-строки с фазной окраской разделителей (D-26). */
export interface FormulaSeg {
  phase: 'forward' | 'loss' | 'update'
  tokens: readonly FormulaToken[]
}

/** Живое число узла графа: откуда рендер берёт значение/градиент (D-30). */
export type NodeBinding =
  | { kind: 'input'; index: number }
  | { kind: 'target' }
  | { kind: 'weight'; layer: number; index: number }
  | { kind: 'bias'; layer: number; index: number }
  /** Слот тензора сэмпла; step — гейт видимости (число доступно, когда
   *  операция шага исполнена в текущем сэмпле). */
  | { kind: 'tensor'; slot: 'zPre' | 'zPost' | 'h' | 'L'; layer: number; index: number; step?: number }
  /** Скалярное произведение строки живых весов на вход слоя (W·x live-весов). */
  | { kind: 'dot'; layer: number; row: number; step: number }

export type RenderNodeKind = 'value' | 'op' | 'update'
export type RenderNodeRole = 'const' | 'param' | 'computed' | 'op'

/** Узел вычислительного графа: топология + геометрия + живые числа. */
export interface RenderNode {
  id: string
  kind: RenderNodeKind
  role: RenderNodeRole
  /** Display-подпись (z1[0] рендерится с субскриптом); для операций — глиф. */
  label: string
  /** Ранг-колонка топологической глубины (0 = входы/параметры). */
  col: number
  /** Строка раскладки (детерминированная таблица). */
  row: number
  /** Живое значение узла (нет — «н/д» всегда, напр. update-станция). */
  value?: NodeBinding
  /** Градиент ∂L/∂· (нет — не показывается). */
  grad?: NodeBinding
  /** Клик: drill-реф числа или выбор звена цепи (сегмент + символ). */
  click?: { drill: string } | { segment: string; symbol: string }
}

/** Ребро графа: операнд → операция → результат; update — параметр → станция. */
export interface RenderEdge {
  from: string
  to: string
  kind?: 'update'
}

/** Звено цепи формулы-хребта: заголовок/формула/символы + геометрия группы. */
export interface RenderSegment {
  id: string
  /** Заголовок звена (RU, символ формулы первым). */
  title: string
  formula: string
  /** Символы формулы-строки, выбирающие это звено. */
  symbols: readonly string[]
  /** Живые числа панели звена. */
  numberSyms: readonly string[]
  /** Узлы группы звена на графе (подсветка выбора). */
  nodes: readonly string[]
  /** Точечные подмножества символа внутри звена (подсветка символа). */
  symbolNodes: Readonly<Record<string, readonly string[]>>
}

/** Откуда узловой ряд берёт числа записи истории. */
export type SeriesNodePick =
  | { kind: 'scalar'; field: 'y' | 'yhat' | 'loss' }
  | { kind: 'record'; field: 'x' }
  | { kind: 'nodes'; node: string }

/** Ряды истории звена: узловые (запись/узлы спека) и весовые (плоский срез). */
export interface RenderSeries {
  node: Readonly<Record<string, { labels: readonly string[]; pick: SeriesNodePick }>>
  weight: Readonly<Record<string, { labels: readonly string[]; from: number; to: number }>>
  /** Символ звена по умолчанию (выбор без символа). */
  defaultSymbol: Readonly<Record<string, string>>
}

/** Рендер-метки сценария (D-30): «часть полей вычисляется рендером». */
export interface ScenarioRender {
  /** Формула-строка: последовательность сегментов с интерактивными символами. */
  formula: readonly FormulaSeg[]
  /** Символы слоёв по индексу слоя (топология → подписи). */
  layerSymbols: readonly LayerSymbols[]
  /** Узлы вычислительного графа (топология + живые числа). */
  nodes: readonly RenderNode[]
  /** Рёбра графа. */
  edges: readonly RenderEdge[]
  /** Группы узлов ленты шагов (по индексу walked-опы). */
  stepGroups: readonly (readonly string[])[]
  /** Звенья цепи формулы-хребта. */
  segments: readonly RenderSegment[]
  /** Ряды истории звена. */
  series: RenderSeries
}

export interface ScenarioModel {
  /** URL #scenario= (url.ts KNOWN_SCENARIOS). */
  id: 'neuron' | 'xor'
  /** RU-заголовок урока — шапка приложения (RU-first, строки в данных спека). */
  title: string
  /** RU-метка датасета — карточка «Примеры» (выборка AND / выборка XOR). */
  datasetLabel: string
  /** Декларативная структура сети — источник топологии. */
  net: readonly LayerSpec[]
  /** Модель + функция потерь в одном объекте (D-30). */
  loss: { kind: 'bce' }
  lr: number
  samples: readonly { x: readonly number[]; y: number }[]
  /** Стартовые веса по слоям: ключи `w1`/`b1`… — 1-based номер слоя. */
  startWeights: Readonly<Record<string, number[][] | number[]>>
  /** Метаданы операций walkthrough: формулы/нарративы RU (длина = walked-опы). */
  ops: readonly ScenarioOpMeta[]
  /** Рендер-метки. */
  render: ScenarioRender
}

/** Стартовые веса XOR в узкой типизации (тесты берут w1/b1/w2/b2 без кастов). */

/** Метаданные 13 операций XOR-walkthrough (формулы/нарративы RU). */
const XOR_OPS: readonly ScenarioOpMeta[] = [
    {
      op: 'matvec',
      layer: 1,
      phase: 'forward',
      formula: 'z1 = W1·x',
      narrative: 'Каждый скрытый нейрон считает скалярное произведение своей строки W1 на вход x — первый шаг forward-pass.',
    },
    {
      op: 'add',
      layer: 1,
      phase: 'forward',
      formula: 'z1 = z1 + b1',
      narrative: 'Каждый нейрон добавляет свой биас b1 — сдвиг, который не зависит от входа.',
    },
    {
      op: 'tanh',
      layer: 1,
      phase: 'forward',
      formula: 'a1 = tanh(z1)',
      narrative: 'Нелинейность: tanh зажимает каждое число в (−1, 1) — без неё любой стек слоёв оставался бы линейным.',
    },
    {
      op: 'matvec',
      layer: 2,
      phase: 'forward',
      formula: 'z2 = W2·a1',
      narrative: 'Выходной нейрон собирает взвешенную сумму активаций скрытого слоя.',
    },
    {
      op: 'add',
      layer: 2,
      phase: 'forward',
      formula: 'z2 = z2 + b2',
      narrative: 'Выходной биас b2 — последний сдвиг перед активацией.',
    },
    {
      op: 'sigmoid',
      layer: 2,
      phase: 'forward',
      formula: 'ŷ = σ(z2)',
      narrative: 'σ переводит любое число в вероятность ŷ ∈ (0, 1) — это прогноз сети для входа x.',
    },
    {
      op: 'bce',
      layer: 2,
      phase: 'loss',
      formula: 'L = −[y·ln ŷ + (1−y)·ln(1−ŷ)]',
      narrative: 'Binary cross-entropy измеряет, насколько прогноз ŷ промахнулся относительно правильного ответа y. Именно это число будем уменьшать.',
    },
    {
      op: 'bce-grad',
      layer: 2,
      phase: 'backward',
      formula: '∂L/∂ŷ = −(y−ŷ)/(ŷ(1−ŷ))',
      narrative: 'Старт backward-pass: насколько нужно сдвинуть ŷ, чтобы L уменьшился. Это производная BCE по прогнозу.',
    },
    {
      op: 'sigmoid-grad',
      layer: 2,
      phase: 'backward',
      formula: '∂L/∂z2 = ∂L/∂ŷ · ŷ(1−ŷ)',
      narrative: 'Цепное правило: градиент протекает через σ обратно к z2 — умножаем на локальную производную σ(z2) = ŷ(1−ŷ).',
    },
    {
      op: 'matvec-grad',
      layer: 2,
      phase: 'backward',
      formula: '∂L/∂W2 = ∂L/∂z2 · a1ᵀ,  ∂L/∂b2 = ∂L/∂z2,  ∂L/∂a1 = W2ᵀ·∂L/∂z2',
      narrative: 'Градиент matvec-а: градиент веса = восходящий градиент × активация-вход этой связи; ∂L/∂a1 уходит дальше вглубь сети.',
    },
    {
      op: 'tanh-grad',
      layer: 1,
      phase: 'backward',
      formula: '∂L/∂z1 = ∂L/∂a1 * (1−a1²)',
      narrative: 'Через tanh: на месте каждой активации умножаем восходящий градиент на производную 1−a1².',
    },
    {
      op: 'matvec-grad',
      layer: 1,
      phase: 'backward',
      formula: '∂L/∂W1 = ∂L/∂z1 · xᵀ,  ∂L/∂b1 = ∂L/∂z1,  ∂L/∂x = W1ᵀ·∂L/∂z1',
      narrative: 'Градиенты первого слоя. ∂L/∂x дальше не распространяется: x — вход, старт цепного правила.',
    },
    {
      op: 'sgd',
      layer: 0,
      phase: 'update',
      formula: 'W = W − η·∂L/∂W',
      narrative: 'SGD: каждый вес шагает против своего градиента (η = 0.5). Показан один вес явно, остальные обновляются той же формулой.',
    },
  ]

// ---- фабрики живых чисел узлов (короткие конструкторы биндингов) ----
const inB = (index: number): NodeBinding => ({ kind: 'input', index })
const wB = (layer: number, index: number): NodeBinding => ({ kind: 'weight', layer, index })
const bB = (layer: number, index: number): NodeBinding => ({ kind: 'bias', layer, index })
const ten = (slot: 'zPre' | 'zPost' | 'h' | 'L', layer: number, index: number, step?: number): NodeBinding =>
  step === undefined ? { kind: 'tensor', slot, layer, index } : { kind: 'tensor', slot, layer, index, step }
const dot = (layer: number, row: number, step: number): NodeBinding => ({ kind: 'dot', layer, row, step })

const W1_IDS = ['W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]'] as const
const B1_IDS = ['b1[0]', 'b1[1]', 'b1[2]'] as const
const W2_IDS = ['W2[0]', 'W2[1]', 'W2[2]'] as const
const ALL_PARAMS = [...W1_IDS, ...B1_IDS, ...W2_IDS, 'b2[0]'] as const
const UPDATE_NODES = ['op:update', ...ALL_PARAMS] as const

/** Узлы XOR-графа 2-3-1 (43): константы, параметры, операции, значения, станция. */
const XOR_NODES: readonly RenderNode[] = [
  { id: 'x[0]', kind: 'value', role: 'const', label: 'x1', col: 0, row: 4, value: inB(0), grad: inB(0), click: { drill: 'x[0]' } },
  { id: 'x[1]', kind: 'value', role: 'const', label: 'x2', col: 0, row: 6, value: inB(1), grad: inB(1), click: { drill: 'x[1]' } },
  ...[0, 1, 2].flatMap((j): RenderNode[] => [
    { id: `W1[${String(j * 2)}]`, kind: 'value', role: 'param', label: `W1[${String(j)},0]`, col: 1, row: j === 0 ? 0 : j === 1 ? 4 : 8, value: wB(0, j * 2), grad: wB(0, j * 2), click: { drill: `W1[${String(j * 2)}]` } },
    { id: `W1[${String(j * 2 + 1)}]`, kind: 'value', role: 'param', label: `W1[${String(j)},1]`, col: 1, row: (j === 0 ? 0 : j === 1 ? 4 : 8) + 1, value: wB(0, j * 2 + 1), grad: wB(0, j * 2 + 1), click: { drill: `W1[${String(j * 2 + 1)}]` } },
  ]),
  ...[0, 1, 2].map((j): RenderNode => ({
    id: `op:matvec[${String(j)}]`, kind: 'op', role: 'op', label: '·', col: 2, row: j === 0 ? 0 : j === 1 ? 4 : 8,
    value: dot(0, j, 0), grad: ten('zPost', 0, j), click: { segment: 'z1', symbol: 'W1' },
  })),
  ...[0, 1, 2].map((j): RenderNode => ({ id: `W1x[${String(j)}]`, kind: 'value', role: 'computed', label: `W1x${String(j + 1)}`, col: 3, row: j === 0 ? 0 : j === 1 ? 4 : 8, value: dot(0, j, 0), grad: ten('zPost', 0, j) })),
  ...[0, 1, 2].map((j): RenderNode => ({ id: `b1[${String(j)}]`, kind: 'value', role: 'param', label: `b1[${String(j)}]`, col: 3, row: (j === 0 ? 1 : j === 1 ? 5 : 9), value: bB(0, j), grad: bB(0, j), click: { drill: `b1[${String(j)}]` } })),
  ...[0, 1, 2].map((j): RenderNode => ({ id: `op:add[${String(j)}]`, kind: 'op', role: 'op', label: '+', col: 4, row: j === 0 ? 0 : j === 1 ? 4 : 8, value: ten('zPost', 0, j, 1), grad: ten('zPost', 0, j), click: { segment: 'z1', symbol: 'b1' } })),
  ...[0, 1, 2].map((j): RenderNode => ({ id: `z1[${String(j)}]`, kind: 'value', role: 'computed', label: `z1[${String(j)}]`, col: 5, row: j === 0 ? 0 : j === 1 ? 4 : 8, value: ten('zPost', 0, j, 1), grad: ten('zPost', 0, j) })),
  ...[0, 1, 2].map((j): RenderNode => ({ id: `op:tanh[${String(j)}]`, kind: 'op', role: 'op', label: 'tanh', col: 6, row: j === 0 ? 0 : j === 1 ? 4 : 8, value: ten('h', 0, j, 2), grad: ten('h', 0, j), click: { segment: 'a1', symbol: 'tanh' } })),
  ...[0, 1, 2].map((j): RenderNode => ({ id: `a1[${String(j)}]`, kind: 'value', role: 'computed', label: `a1[${String(j)}]`, col: 7, row: j === 0 ? 0 : j === 1 ? 4 : 8, value: ten('h', 0, j, 2), grad: ten('h', 0, j), click: { drill: `a1[${String(j)}]` } })),
  { id: 'W2[0]', kind: 'value', role: 'param', label: 'W2[0,0]', col: 7, row: 2, value: wB(1, 0), grad: wB(1, 0), click: { drill: 'W2[0]' } },
  { id: 'W2[1]', kind: 'value', role: 'param', label: 'W2[0,1]', col: 7, row: 3, value: wB(1, 1), grad: wB(1, 1), click: { drill: 'W2[1]' } },
  { id: 'W2[2]', kind: 'value', role: 'param', label: 'W2[0,2]', col: 7, row: 6, value: wB(1, 2), grad: wB(1, 2), click: { drill: 'W2[2]' } },
  { id: 'op:matvec2', kind: 'op', role: 'op', label: '·', col: 8, row: 4, value: dot(1, 0, 3), grad: ten('zPost', 1, 0), click: { segment: 'z2', symbol: 'W2' } },
  { id: 'W2a1', kind: 'value', role: 'computed', label: 'W2a1', col: 9, row: 4, value: dot(1, 0, 3), grad: ten('zPost', 1, 0) },
  { id: 'b2[0]', kind: 'value', role: 'param', label: 'b2[0]', col: 9, row: 5, value: bB(1, 0), grad: bB(1, 0), click: { drill: 'b2[0]' } },
  { id: 'op:add2', kind: 'op', role: 'op', label: '+', col: 10, row: 4, value: ten('zPost', 1, 0, 4), grad: ten('zPost', 1, 0), click: { segment: 'z2', symbol: 'b2' } },
  { id: 'z2', kind: 'value', role: 'computed', label: 'z2', col: 11, row: 4, value: ten('zPost', 1, 0, 4), grad: ten('zPost', 1, 0) },
  { id: 'op:sigmoid', kind: 'op', role: 'op', label: 'σ', col: 12, row: 4, value: ten('h', 1, 0, 5), grad: ten('h', 1, 0), click: { segment: 'yhat', symbol: 'σ' } },
  { id: 'ŷ', kind: 'value', role: 'computed', label: 'ŷ', col: 13, row: 4, value: ten('h', 1, 0, 5), grad: ten('h', 1, 0), click: { drill: 'ŷ' } },
  { id: 'op:update', kind: 'update', role: 'op', label: 'W ← W − η·∂L/∂W', col: 14, row: 8, click: { segment: 'W', symbol: 'η' } },
]

/** Рёбра XOR-графа: операнд → операция → результат + update-станция. */
const flow = (from: string, to: string): RenderEdge => ({ from, to })
const upd = (from: string): RenderEdge => ({ from, to: 'op:update', kind: 'update' })
const XOR_EDGES: readonly RenderEdge[] = [
  ...[0, 1, 2].flatMap((j) => [
    flow('x[0]', `op:matvec[${String(j)}]`),
    flow('x[1]', `op:matvec[${String(j)}]`),
    flow(`W1[${String(j * 2)}]`, `op:matvec[${String(j)}]`),
    flow(`W1[${String(j * 2 + 1)}]`, `op:matvec[${String(j)}]`),
    flow(`op:matvec[${String(j)}]`, `W1x[${String(j)}]`),
    flow(`W1x[${String(j)}]`, `op:add[${String(j)}]`),
    flow(`b1[${String(j)}]`, `op:add[${String(j)}]`),
    flow(`op:add[${String(j)}]`, `z1[${String(j)}]`),
    flow(`z1[${String(j)}]`, `op:tanh[${String(j)}]`),
    flow(`op:tanh[${String(j)}]`, `a1[${String(j)}]`),
    flow(`a1[${String(j)}]`, 'op:matvec2'),
  ]),
  flow('W2[0]', 'op:matvec2'),
  flow('W2[1]', 'op:matvec2'),
  flow('W2[2]', 'op:matvec2'),
  flow('op:matvec2', 'W2a1'),
  flow('W2a1', 'op:add2'),
  flow('b2[0]', 'op:add2'),
  flow('op:add2', 'z2'),
  flow('z2', 'op:sigmoid'),
  flow('op:sigmoid', 'ŷ'),
  ...ALL_PARAMS.map(upd),
]

/** Группы узлов 13 шагов ленты (подсветка активной walked-опы). */
const XOR_STEP_GROUPS: readonly (readonly string[])[] = [
  ['op:matvec[0]', 'op:matvec[1]', 'op:matvec[2]', 'W1x[0]', 'W1x[1]', 'W1x[2]'],
  ['op:add[0]', 'op:add[1]', 'op:add[2]', 'z1[0]', 'z1[1]', 'z1[2]'],
  ['op:tanh[0]', 'op:tanh[1]', 'op:tanh[2]', 'a1[0]', 'a1[1]', 'a1[2]'],
  ['op:matvec2', 'W2a1'],
  ['op:add2', 'z2'],
  ['op:sigmoid', 'ŷ'],
  ['ŷ'],
  ['ŷ'],
  ['op:sigmoid', 'z2', 'ŷ'],
  ['op:matvec2', 'W2a1', 'ŷ'],
  ['op:tanh[0]', 'op:tanh[1]', 'op:tanh[2]', 'a1[0]', 'a1[1]', 'a1[2]', 'z1[0]', 'z1[1]', 'z1[2]'],
  ['op:matvec[0]', 'op:matvec[1]', 'op:matvec[2]', 'W1x[0]', 'W1x[1]', 'W1x[2]', 'z1[0]', 'z1[1]', 'z1[2]'],
  [...UPDATE_NODES],
]

const Z1_NODES = [...ALL_PARAMS.slice(0, 9), 'op:matvec[0]', 'op:matvec[1]', 'op:matvec[2]', 'W1x[0]', 'W1x[1]', 'W1x[2]', 'op:add[0]', 'op:add[1]', 'op:add[2]', 'z1[0]', 'z1[1]', 'z1[2]'] as const
const A1_NODES = ['op:tanh[0]', 'op:tanh[1]', 'op:tanh[2]', 'a1[0]', 'a1[1]', 'a1[2]'] as const
const Z2_NODES = ['W2[0]', 'W2[1]', 'W2[2]', 'b2[0]', 'op:matvec2', 'W2a1', 'op:add2', 'z2'] as const

/** Звенья цепи XOR: x → z1 → a1 → z2 → ŷ → L → W. */
const XOR_SEGMENTS: readonly RenderSegment[] = [
  {
    id: 'x',
    title: 'x — вход примера',
    formula: 'x = (x1, x2)',
    symbols: ['x'],
    numberSyms: ['x'],
    nodes: ['x[0]', 'x[1]'],
    symbolNodes: { x: ['x[0]', 'x[1]'] },
  },
  {
    id: 'z1',
    title: 'z1 — взвешенная сумма скрытого слоя',
    formula: `${XOR_OPS[0]!.formula} + b1`,
    symbols: ['W1', 'b1'],
    numberSyms: ['W1', 'b1', 'z1'],
    nodes: [...Z1_NODES],
    symbolNodes: { W1: [...W1_IDS], b1: [...B1_IDS] },
  },
  {
    id: 'a1',
    title: 'a1 — активация tanh',
    formula: XOR_OPS[2]!.formula,
    symbols: ['tanh'],
    numberSyms: ['z1', 'a1'],
    nodes: [...A1_NODES],
    symbolNodes: { tanh: [...A1_NODES] },
  },
  {
    id: 'z2',
    title: 'z2 — взвешенная сумма выхода',
    formula: `${XOR_OPS[3]!.formula} + b2`,
    symbols: ['W2', 'b2'],
    numberSyms: ['W2', 'b2', 'z2'],
    nodes: [...Z2_NODES],
    symbolNodes: { W2: [...W2_IDS], b2: ['b2[0]'] },
  },
  {
    id: 'yhat',
    title: 'ŷ — прогноз (σ)',
    formula: XOR_OPS[5]!.formula,
    symbols: ['σ', 'ŷ'],
    numberSyms: ['z2', 'ŷ'],
    nodes: ['op:sigmoid', 'ŷ'],
    symbolNodes: { σ: ['op:sigmoid', 'ŷ'], ŷ: ['ŷ'] },
  },
  {
    id: 'L',
    title: 'L — лосс (binary cross-entropy)',
    formula: XOR_OPS[6]!.formula,
    symbols: ['y', 'L'],
    numberSyms: ['ŷ', 'y', 'L'],
    nodes: ['ŷ'],
    symbolNodes: {},
  },
  {
    id: 'W',
    title: 'W — обновление весов (SGD)',
    formula: XOR_OPS[12]!.formula.replace('=', '←'),
    symbols: ['η', '∂L/∂W'],
    numberSyms: ['η', '∂L/∂W2', 'W2[0,0]'],
    nodes: [...UPDATE_NODES],
    symbolNodes: { η: [...UPDATE_NODES], '∂L/∂W': [...UPDATE_NODES] },
  },
]

/** Ряды истории звена XOR: узловые поля SampleRecord + плоские срезы весов. */
const XOR_SERIES: RenderSeries = {
  node: {
    x: { labels: ['x₁', 'x₂'], pick: { kind: 'record', field: 'x' } },
    y: { labels: ['y'], pick: { kind: 'scalar', field: 'y' } },
    z1: { labels: ['z1[0]', 'z1[1]', 'z1[2]'], pick: { kind: 'nodes', node: 'z1' } },
    a1: { labels: ['a1[0]', 'a1[1]', 'a1[2]'], pick: { kind: 'nodes', node: 'a1' } },
    tanh: { labels: ['a1[0]', 'a1[1]', 'a1[2]'], pick: { kind: 'nodes', node: 'a1' } },
    z2: { labels: ['z2[0]'], pick: { kind: 'nodes', node: 'z2' } },
    σ: { labels: ['ŷ'], pick: { kind: 'scalar', field: 'yhat' } },
    ŷ: { labels: ['ŷ'], pick: { kind: 'scalar', field: 'yhat' } },
    L: { labels: ['L'], pick: { kind: 'scalar', field: 'loss' } },
  },
  weight: {
    W1: { labels: ['W1[0,0]', 'W1[0,1]', 'W1[1,0]', 'W1[1,1]', 'W1[2,0]', 'W1[2,1]'], from: 0, to: 6 },
    b1: { labels: ['b1[0]', 'b1[1]', 'b1[2]'], from: 6, to: 9 },
    W2: { labels: ['W2[0,0]', 'W2[0,1]', 'W2[0,2]'], from: 9, to: 12 },
    b2: { labels: ['b2[0]'], from: 12, to: 13 },
  },
  defaultSymbol: { x: 'x', z1: 'W1', a1: 'a1', z2: 'W2', yhat: 'ŷ', L: 'L', W: '∂L/∂W' },
}

export const XOR_START_WEIGHTS: {
  w1: number[][]
  b1: number[]
  w2: number[][]
  b2: number[]
} = {
  w1: [
    [-0.9228963213252399, 0.3924486452741056],
    [-0.712133557209278, -0.0749354903418249],
    [0.34329352823553405, 0.5859025433105887],
  ],
  b1: [-0.09362154306757531, -0.0034555404038976167, -0.9616857839513044],
  w2: [[-0.1352223220971196, -0.25525063835814765, 0.704577266381706]],
  b2: [0.09396780858201126],
}

export const XOR_SCENARIO: ScenarioModel = {
  id: 'xor',
  title: 'XOR: backprop по шагам',
  datasetLabel: 'выборка XOR',
  net: [
    { inputs: 2, units: 3, activation: 'tanh' },
    { inputs: 3, units: 1, activation: 'sigmoid' },
  ],
  loss: { kind: 'bce' },
  lr: 0.5,
  samples: [
    { x: [1, 0], y: 1 },
    { x: [0, 1], y: 1 },
    { x: [0, 0], y: 0 },
    { x: [1, 1], y: 0 },
  ],
  startWeights: XOR_START_WEIGHTS,
  ops: XOR_OPS,
  render: {
    formula: [
      {
        phase: 'forward',
        tokens: [
          { kind: 'sym', sym: 'ŷ' },
          { kind: 'text', text: ' = ' },
          { kind: 'sym', sym: 'σ' },
          { kind: 'text', text: '(' },
          { kind: 'sym', sym: 'W2' },
          { kind: 'text', text: '·' },
          { kind: 'sym', sym: 'tanh' },
          { kind: 'text', text: '(' },
          { kind: 'sym', sym: 'W1' },
          { kind: 'text', text: '·' },
          { kind: 'sym', sym: 'x' },
          { kind: 'text', text: ' + ' },
          { kind: 'sym', sym: 'b1' },
          { kind: 'text', text: ') + ' },
          { kind: 'sym', sym: 'b2' },
          { kind: 'text', text: ')' },
        ],
      },
      {
        phase: 'loss',
        tokens: [
          { kind: 'sym', sym: 'L' },
          { kind: 'text', text: ' = −[' },
          { kind: 'sym', sym: 'y' },
          { kind: 'text', text: '·ln ' },
          { kind: 'sym', sym: 'ŷ' },
          { kind: 'text', text: ' + (1−' },
          { kind: 'sym', sym: 'y' },
          { kind: 'text', text: ')·ln(1−' },
          { kind: 'sym', sym: 'ŷ' },
          { kind: 'text', text: ')]' },
        ],
      },
      {
        phase: 'update',
        tokens: [
          { kind: 'text', text: 'W ← W − ' },
          { kind: 'sym', sym: 'η' },
          { kind: 'text', text: '·' },
          { kind: 'sym', sym: '∂L/∂W' },
        ],
      },
    ],
    layerSymbols: [
      { z: 'z1', h: 'a1', w: 'W1', b: 'b1' },
      { z: 'z2', h: 'ŷ', w: 'W2', b: 'b2' },
    ],
    nodes: XOR_NODES,
    edges: XOR_EDGES,
    stepGroups: XOR_STEP_GROUPS,
    segments: XOR_SEGMENTS,
    series: XOR_SERIES,
  },
}

/** Форма сети для подписей («2-3-1» / «2-1») — механическая производная net. */
export function netShapeOf(spec: ScenarioModel): string {
  return [spec.net[0]!.inputs, ...spec.net.map((l) => l.units)].join('-')
}

// ============================ Сценарий «один нейрон» (D-31) ============================

/** Метаданные 8 операций нейрон-walkthrough (формулы/нарративы RU). */
const NEURON_OPS: readonly ScenarioOpMeta[] = [
  {
    op: 'matvec',
    layer: 1,
    phase: 'forward',
    formula: 'z = W·x',
    narrative: 'Единственный нейрон считает скалярное произведение своей строки W на вход x — первый шаг forward-pass.',
  },
  {
    op: 'add',
    layer: 1,
    phase: 'forward',
    formula: 'z = z + b',
    narrative: 'Нейрон добавляет свой биас b — сдвиг, который не зависит от входа.',
  },
  {
    op: 'sigmoid',
    layer: 1,
    phase: 'forward',
    formula: 'ŷ = σ(z)',
    narrative: 'σ переводит любое число в вероятность ŷ ∈ (0, 1) — это прогноз нейрона для входа x.',
  },
  {
    op: 'bce',
    layer: 1,
    phase: 'loss',
    formula: 'L = −[y·ln ŷ + (1−y)·ln(1−ŷ)]',
    narrative: 'Binary cross-entropy измеряет, насколько прогноз ŷ промахнулся относительно правильного ответа y. Именно это число будем уменьшать.',
  },
  {
    op: 'bce-grad',
    layer: 1,
    phase: 'backward',
    formula: '∂L/∂ŷ = −(y−ŷ)/(ŷ(1−ŷ))',
    narrative: 'Старт backward-pass: насколько нужно сдвинуть ŷ, чтобы L уменьшился. Это производная BCE по прогнозу.',
  },
  {
    op: 'sigmoid-grad',
    layer: 1,
    phase: 'backward',
    formula: '∂L/∂z = ∂L/∂ŷ · ŷ(1−ŷ)',
    narrative: 'Цепное правило: градиент протекает через σ обратно к z — умножаем на локальную производную σ(z) = ŷ(1−ŷ).',
  },
  {
    op: 'matvec-grad',
    layer: 1,
    phase: 'backward',
    formula: '∂L/∂W = ∂L/∂z · xᵀ,  ∂L/∂b = ∂L/∂z,  ∂L/∂x = Wᵀ·∂L/∂z',
    narrative: 'Градиенты нейрона: градиент каждого веса = восходящий градиент × вход этой связи. ∂L/∂x дальше не распространяется: x — вход, старт цепного правила.',
  },
  {
    op: 'sgd',
    layer: 0,
    phase: 'update',
    formula: 'W = W − η·∂L/∂W',
    narrative: 'SGD: каждый вес шагает против своего градиента (η = 0.5). Показан один вес явно, остальные обновляются той же формулой.',
  },
]

const N_SYM = { z: 'z', h: 'ŷ', w: 'W', b: 'b' } as const

const NEURON_NODES: readonly RenderNode[] = [
  { id: 'x[0]', kind: 'value', role: 'const', label: 'x1', col: 0, row: 3, value: inB(0), grad: inB(0), click: { drill: 'x[0]' } },
  { id: 'x[1]', kind: 'value', role: 'const', label: 'x2', col: 0, row: 5, value: inB(1), grad: inB(1), click: { drill: 'x[1]' } },
  { id: 'W[0]', kind: 'value', role: 'param', label: 'W[0,0]', col: 1, row: 2, value: wB(0, 0), grad: wB(0, 0), click: { drill: 'W[0]' } },
  { id: 'W[1]', kind: 'value', role: 'param', label: 'W[0,1]', col: 1, row: 6, value: wB(0, 1), grad: wB(0, 1), click: { drill: 'W[1]' } },
  { id: 'op:matvec', kind: 'op', role: 'op', label: '·', col: 2, row: 4, value: dot(0, 0, 0), grad: ten('zPost', 0, 0), click: { segment: 'z', symbol: 'W' } },
  { id: 'Wx', kind: 'value', role: 'computed', label: 'Wx', col: 3, row: 4, value: dot(0, 0, 0), grad: ten('zPost', 0, 0) },
  { id: 'b[0]', kind: 'value', role: 'param', label: 'b[0]', col: 3, row: 6, value: bB(0, 0), grad: bB(0, 0), click: { drill: 'b[0]' } },
  { id: 'op:add', kind: 'op', role: 'op', label: '+', col: 4, row: 4, value: ten('zPost', 0, 0, 1), grad: ten('zPost', 0, 0), click: { segment: 'z', symbol: 'b' } },
  { id: 'z', kind: 'value', role: 'computed', label: 'z', col: 5, row: 4, value: ten('zPost', 0, 0, 1), grad: ten('zPost', 0, 0) },
  { id: 'op:sigmoid', kind: 'op', role: 'op', label: 'σ', col: 6, row: 4, value: ten('h', 0, 0, 2), grad: ten('h', 0, 0), click: { segment: 'yhat', symbol: 'σ' } },
  { id: 'ŷ', kind: 'value', role: 'computed', label: 'ŷ', col: 7, row: 4, value: ten('h', 0, 0, 2), grad: ten('h', 0, 0), click: { drill: 'ŷ' } },
  { id: 'op:update', kind: 'update', role: 'op', label: 'W ← W − η·∂L/∂W', col: 8, row: 8, click: { segment: 'W', symbol: 'η' } },
]

const NEURON_EDGES: readonly RenderEdge[] = [
  flow('x[0]', 'op:matvec'),
  flow('x[1]', 'op:matvec'),
  flow('W[0]', 'op:matvec'),
  flow('W[1]', 'op:matvec'),
  flow('op:matvec', 'Wx'),
  flow('Wx', 'op:add'),
  flow('b[0]', 'op:add'),
  flow('op:add', 'z'),
  flow('z', 'op:sigmoid'),
  flow('op:sigmoid', 'ŷ'),
  upd('W[0]'),
  upd('W[1]'),
  upd('b[0]'),
]

const NEURON_STEP_GROUPS: readonly (readonly string[])[] = [
  ['op:matvec', 'Wx'],
  ['op:add', 'z'],
  ['op:sigmoid', 'ŷ'],
  ['ŷ'],
  ['ŷ'],
  ['op:sigmoid', 'z', 'ŷ'],
  ['op:matvec', 'Wx', 'z'],
  ['op:update', 'W[0]', 'W[1]', 'b[0]'],
]

const NEURON_SEGMENTS: readonly RenderSegment[] = [
  {
    id: 'x',
    title: 'x — вход примера',
    formula: 'x = (x1, x2)',
    symbols: ['x'],
    numberSyms: ['x'],
    nodes: ['x[0]', 'x[1]'],
    symbolNodes: { x: ['x[0]', 'x[1]'] },
  },
  {
    id: 'z',
    title: 'z — взвешенная сумма нейрона',
    formula: `${NEURON_OPS[0]!.formula} + b`,
    symbols: ['W', 'b'],
    numberSyms: ['W', 'b', 'z'],
    nodes: ['W[0]', 'W[1]', 'b[0]', 'op:matvec', 'Wx', 'op:add', 'z'],
    symbolNodes: { W: ['W[0]', 'W[1]'], b: ['b[0]'] },
  },
  {
    id: 'yhat',
    title: 'ŷ — прогноз (σ)',
    formula: NEURON_OPS[2]!.formula,
    symbols: ['σ', 'ŷ'],
    numberSyms: ['z', 'ŷ'],
    nodes: ['op:sigmoid', 'ŷ'],
    symbolNodes: { σ: ['op:sigmoid', 'ŷ'], ŷ: ['ŷ'] },
  },
  {
    id: 'L',
    title: 'L — лосс (binary cross-entropy)',
    formula: NEURON_OPS[3]!.formula,
    symbols: ['y', 'L'],
    numberSyms: ['ŷ', 'y', 'L'],
    nodes: ['ŷ'],
    symbolNodes: {},
  },
  {
    id: 'W',
    title: 'W — обновление весов (SGD)',
    formula: NEURON_OPS[7]!.formula.replace('=', '←'),
    symbols: ['η', '∂L/∂W'],
    numberSyms: ['η', '∂L/∂W', 'W[0,0]'],
    nodes: ['op:update', 'W[0]', 'W[1]', 'b[0]'],
    symbolNodes: { η: ['op:update', 'W[0]', 'W[1]', 'b[0]'], '∂L/∂W': ['op:update', 'W[0]', 'W[1]', 'b[0]'] },
  },
]

const NEURON_SERIES: RenderSeries = {
  node: {
    x: { labels: ['x₁', 'x₂'], pick: { kind: 'record', field: 'x' } },
    y: { labels: ['y'], pick: { kind: 'scalar', field: 'y' } },
    z: { labels: ['z[0]'], pick: { kind: 'nodes', node: 'z' } },
    σ: { labels: ['ŷ'], pick: { kind: 'scalar', field: 'yhat' } },
    ŷ: { labels: ['ŷ'], pick: { kind: 'scalar', field: 'yhat' } },
    L: { labels: ['L'], pick: { kind: 'scalar', field: 'loss' } },
  },
  weight: {
    W: { labels: ['W[0,0]', 'W[0,1]', 'b[0]'], from: 0, to: 3 },
  },
  defaultSymbol: { x: 'x', z: 'W', yhat: 'ŷ', L: 'L', W: '∂L/∂W' },
}

/**
 * Первый урок (D-31): один нейрон, AND-датасет (линейно-разделим — нейрон
 * решает честно; мост к XOR фазы 3). Стартовые веса — константы руками под
 * правило первого шага (Pitfall 6): ŷ₀ ∈ [0.3, 0.7] на всех примерах
 * (0.69/0.50/0.50/0.31), |∂L/∂ŷ| ≤ 2 — проверяется scenario.test ДО съёма
 * эталон-констант (02-09).
 */
export const NEURON_SCENARIO: ScenarioModel = {
  id: 'neuron',
  title: 'Один нейрон: backprop по шагам',
  datasetLabel: 'выборка AND',
  net: [{ inputs: 2, units: 1, activation: 'sigmoid' }],
  loss: { kind: 'bce' },
  lr: 0.5,
  samples: [
    { x: [1, 1], y: 1 },
    { x: [0, 1], y: 0 },
    { x: [1, 0], y: 0 },
    { x: [0, 0], y: 0 },
  ],
  startWeights: {
    w1: [[0.8, 0.8]],
    b1: [-0.8],
  },
  ops: NEURON_OPS,
  render: {
    formula: [
      {
        phase: 'forward',
        tokens: [
          { kind: 'sym', sym: 'ŷ' },
          { kind: 'text', text: ' = ' },
          { kind: 'sym', sym: 'σ' },
          { kind: 'text', text: '(' },
          { kind: 'sym', sym: 'W' },
          { kind: 'text', text: '·' },
          { kind: 'sym', sym: 'x' },
          { kind: 'text', text: ' + ' },
          { kind: 'sym', sym: 'b' },
          { kind: 'text', text: ')' },
        ],
      },
      {
        phase: 'loss',
        tokens: [
          { kind: 'sym', sym: 'L' },
          { kind: 'text', text: ' = −[' },
          { kind: 'sym', sym: 'y' },
          { kind: 'text', text: '·ln ' },
          { kind: 'sym', sym: 'ŷ' },
          { kind: 'text', text: ' + (1−' },
          { kind: 'sym', sym: 'y' },
          { kind: 'text', text: ')·ln(1−' },
          { kind: 'sym', sym: 'ŷ' },
          { kind: 'text', text: ')]' },
        ],
      },
      {
        phase: 'update',
        tokens: [
          { kind: 'text', text: 'W ← W − ' },
          { kind: 'sym', sym: 'η' },
          { kind: 'text', text: '·' },
          { kind: 'sym', sym: '∂L/∂W' },
        ],
      },
    ],
    layerSymbols: [N_SYM],
    nodes: NEURON_NODES,
    edges: NEURON_EDGES,
    stepGroups: NEURON_STEP_GROUPS,
    segments: NEURON_SEGMENTS,
    series: NEURON_SERIES,
  },
}

// ============================ Реестр сценариев ============================

const SCENARIOS: Readonly<Record<string, ScenarioModel>> = {
  neuron: NEURON_SCENARIO,
  xor: XOR_SCENARIO,
}

/** Спец по id из белого списка url (невалидное клампится к дефолту). */
export function scenarioById(id: string): ScenarioModel {
  return SCENARIOS[id] ?? NEURON_SCENARIO
}

let currentScenario: ScenarioModel = NEURON_SCENARIO

/** Активный сценарий сессии (фиксируется один раз на старте по URL). */
export function activeScenario(): ScenarioModel {
  return currentScenario
}

/** Фиксация активного сценария (run.ts по parseHash до первого рендера). */
export function activateScenario(id: string): void {
  currentScenario = scenarioById(id)
}

