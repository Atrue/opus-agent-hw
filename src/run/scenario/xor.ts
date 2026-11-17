/**
 * Сценарий XOR (2-3-1, tanh+σ, BCE; перенос из scenario.ts телом, D-34):
 * данные одного субъекта — 13 оп walkthrough, граф 43 узла, звенья цепи
 * x → z1 → a1 → z2 → ŷ → L → W, стартовые веса (детерминированный старт,
 * DOCS-05) и ряды истории. MLP фазы 3 подключается таким же файлом.
 */

import { bB, dot, flow, inB, ten, wB } from './bindings'
import type { RenderEdge, RenderFrame, RenderNode, RenderSegment, RenderSeries, ScenarioModel, ScenarioOpMeta } from './types'

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

const W1_IDS = ['W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]'] as const
const B1_IDS = ['b1[0]', 'b1[1]', 'b1[2]'] as const
const W2_IDS = ['W2[0]', 'W2[1]', 'W2[2]'] as const
const ALL_PARAMS = [...W1_IDS, ...B1_IDS, ...W2_IDS, 'b2[0]'] as const

/**
 * Узлы XOR-графа 2-3-1 (35; 2.1-01: update-узел и matvec-промежуточные
 * W1x/W2a1 удалены — рёбра «·» → «+» без пересадок; b-узлы — в колонке
 * своих «·», под ними; лосс вне графа — D-32).
 */
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
  ...[0, 1, 2].map((j): RenderNode => ({ id: `b1[${String(j)}]`, kind: 'value', role: 'param', label: `b1[${String(j)}]`, col: 2, row: (j === 0 ? 1 : j === 1 ? 5 : 9), value: bB(0, j), grad: bB(0, j), click: { drill: `b1[${String(j)}]` } })),
  ...[0, 1, 2].map((j): RenderNode => ({ id: `op:add[${String(j)}]`, kind: 'op', role: 'op', label: '+', col: 3, row: j === 0 ? 0 : j === 1 ? 4 : 8, value: ten('zPost', 0, j, 1), grad: ten('zPost', 0, j), click: { segment: 'z1', symbol: 'b1' } })),
  ...[0, 1, 2].map((j): RenderNode => ({ id: `z1[${String(j)}]`, kind: 'value', role: 'computed', label: `z1[${String(j)}]`, col: 4, row: j === 0 ? 0 : j === 1 ? 4 : 8, value: ten('zPost', 0, j, 1), grad: ten('zPost', 0, j) })),
  ...[0, 1, 2].map((j): RenderNode => ({ id: `op:tanh[${String(j)}]`, kind: 'op', role: 'op', label: 'tanh', col: 5, row: j === 0 ? 0 : j === 1 ? 4 : 8, value: ten('h', 0, j, 2), grad: ten('h', 0, j), click: { segment: 'a1', symbol: 'tanh' } })),
  ...[0, 1, 2].map((j): RenderNode => ({ id: `a1[${String(j)}]`, kind: 'value', role: 'computed', label: `a1[${String(j)}]`, col: 6, row: j === 0 ? 0 : j === 1 ? 4 : 8, value: ten('h', 0, j, 2), grad: ten('h', 0, j), click: { drill: `a1[${String(j)}]` } })),
  { id: 'W2[0]', kind: 'value', role: 'param', label: 'W2[0,0]', col: 6, row: 2, value: wB(1, 0), grad: wB(1, 0), click: { drill: 'W2[0]' } },
  { id: 'W2[1]', kind: 'value', role: 'param', label: 'W2[0,1]', col: 6, row: 3, value: wB(1, 1), grad: wB(1, 1), click: { drill: 'W2[1]' } },
  { id: 'W2[2]', kind: 'value', role: 'param', label: 'W2[0,2]', col: 6, row: 6, value: wB(1, 2), grad: wB(1, 2), click: { drill: 'W2[2]' } },
  { id: 'op:matvec2', kind: 'op', role: 'op', label: '·', col: 7, row: 4, value: dot(1, 0, 3), grad: ten('zPost', 1, 0), click: { segment: 'z2', symbol: 'W2' } },
  { id: 'b2[0]', kind: 'value', role: 'param', label: 'b2[0]', col: 7, row: 5, value: bB(1, 0), grad: bB(1, 0), click: { drill: 'b2[0]' } },
  { id: 'op:add2', kind: 'op', role: 'op', label: '+', col: 8, row: 4, value: ten('zPost', 1, 0, 4), grad: ten('zPost', 1, 0), click: { segment: 'z2', symbol: 'b2' } },
  { id: 'z2', kind: 'value', role: 'computed', label: 'z2', col: 9, row: 4, value: ten('zPost', 1, 0, 4), grad: ten('zPost', 1, 0) },
  { id: 'op:sigmoid', kind: 'op', role: 'op', label: 'σ', col: 10, row: 4, value: ten('h', 1, 0, 5), grad: ten('h', 1, 0), click: { segment: 'yhat', symbol: 'σ' } },
  { id: 'ŷ', kind: 'value', role: 'computed', label: 'ŷ', col: 11, row: 4, value: ten('h', 1, 0, 5), grad: ten('h', 1, 0), click: { drill: 'ŷ' } },
]

/** Рёбра XOR-графа: операнд → операция → операция (без пересадок, 2.1-01). */
const XOR_EDGES: readonly RenderEdge[] = [
  ...[0, 1, 2].flatMap((j) => [
    flow('x[0]', `op:matvec[${String(j)}]`),
    flow('x[1]', `op:matvec[${String(j)}]`),
    flow(`W1[${String(j * 2)}]`, `op:matvec[${String(j)}]`),
    flow(`W1[${String(j * 2 + 1)}]`, `op:matvec[${String(j)}]`),
    flow(`op:matvec[${String(j)}]`, `op:add[${String(j)}]`),
    flow(`b1[${String(j)}]`, `op:add[${String(j)}]`),
    flow(`op:add[${String(j)}]`, `z1[${String(j)}]`),
    flow(`z1[${String(j)}]`, `op:tanh[${String(j)}]`),
    flow(`op:tanh[${String(j)}]`, `a1[${String(j)}]`),
    flow(`a1[${String(j)}]`, 'op:matvec2'),
  ]),
  flow('W2[0]', 'op:matvec2'),
  flow('W2[1]', 'op:matvec2'),
  flow('W2[2]', 'op:matvec2'),
  flow('op:matvec2', 'op:add2'),
  flow('b2[0]', 'op:add2'),
  flow('op:add2', 'z2'),
  flow('z2', 'op:sigmoid'),
  flow('op:sigmoid', 'ŷ'),
]

/** Группы узлов 13 шагов ленты (подсветка активной walked-опы). */
const XOR_STEP_GROUPS: readonly (readonly string[])[] = [
  ['op:matvec[0]', 'op:matvec[1]', 'op:matvec[2]'],
  ['op:add[0]', 'op:add[1]', 'op:add[2]', 'z1[0]', 'z1[1]', 'z1[2]'],
  ['op:tanh[0]', 'op:tanh[1]', 'op:tanh[2]', 'a1[0]', 'a1[1]', 'a1[2]'],
  ['op:matvec2'],
  ['op:add2', 'z2'],
  ['op:sigmoid', 'ŷ'],
  ['ŷ'],
  ['ŷ'],
  ['op:sigmoid', 'z2', 'ŷ'],
  ['op:matvec2', 'ŷ'],
  ['op:tanh[0]', 'op:tanh[1]', 'op:tanh[2]', 'a1[0]', 'a1[1]', 'a1[2]', 'z1[0]', 'z1[1]', 'z1[2]'],
  ['op:matvec[0]', 'op:matvec[1]', 'op:matvec[2]', 'z1[0]', 'z1[1]', 'z1[2]'],
  [...ALL_PARAMS],
]

const Z1_NODES = [...ALL_PARAMS.slice(0, 9), 'op:matvec[0]', 'op:matvec[1]', 'op:matvec[2]', 'op:add[0]', 'op:add[1]', 'op:add[2]', 'z1[0]', 'z1[1]', 'z1[2]'] as const
const A1_NODES = ['op:tanh[0]', 'op:tanh[1]', 'op:tanh[2]', 'a1[0]', 'a1[1]', 'a1[2]'] as const
const Z2_NODES = ['W2[0]', 'W2[1]', 'W2[2]', 'b2[0]', 'op:matvec2', 'op:add2', 'z2'] as const

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
    nodes: [...ALL_PARAMS],
    symbolNodes: { η: [...ALL_PARAMS], '∂L/∂W': [...ALL_PARAMS] },
  },
]

/** Рамки-нейроны XOR (2.1-03, фикс 4): 3 скрытых + выходной. */
const XOR_FRAMES: readonly RenderFrame[] = [
  ...[0, 1, 2].map((j): RenderFrame => ({
    id: `n${String(j + 1)}`,
    title: `Нейрон ${String(j + 1)}`,
    nodes: [`op:matvec[${String(j)}]`, `op:add[${String(j)}]`, `z1[${String(j)}]`, `op:tanh[${String(j)}]`, `a1[${String(j)}]`],
    output: ten('h', 0, j, 2),
    drill: `a1[${String(j)}]`,
  })),
  {
    id: 'n4',
    title: 'Нейрон 4',
    nodes: ['op:matvec2', 'op:add2', 'z2', 'op:sigmoid', 'ŷ'],
    output: ten('h', 1, 0, 5),
    drill: 'ŷ',
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

/** Стартовые веса XOR в узкой типизации (тесты берут w1/b1/w2/b2 без кастов). */
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
    frames: XOR_FRAMES,
    series: XOR_SERIES,
  },
}
