/**
 * Сценарий «один нейрон» (D-31; перенос из scenario.ts телом, D-34): данные
 * одного субъекта — 8 оп walkthrough, граф 10 узлов (2.1-01: без update-узла
 * и matvec-промежуточного), звенья x → z → ŷ → L → W.
 */

import { bB, dot, flow, inB, ten, wB } from './bindings'
import type { RenderEdge, RenderFrame, RenderNode, RenderSegment, RenderSeries, ScenarioModel, ScenarioOpMeta } from './types'

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

/**
 * Узлы нейрон-графа (2.1-01: update-узел и matvec-промежуточный Wx удалены —
 * ребро «·» → «+» без пересадки; b[0] — в колонке «·», под ней; лосс вне
 * графа — D-32).
 */
const NEURON_NODES: readonly RenderNode[] = [
  { id: 'x[0]', kind: 'value', role: 'const', label: 'x1', col: 0, row: 3, value: inB(0), grad: inB(0), click: { drill: 'x[0]' } },
  { id: 'x[1]', kind: 'value', role: 'const', label: 'x2', col: 0, row: 5, value: inB(1), grad: inB(1), click: { drill: 'x[1]' } },
  { id: 'W[0]', kind: 'value', role: 'param', label: 'W[0,0]', col: 1, row: 2, value: wB(0, 0), grad: wB(0, 0), click: { drill: 'W[0]' } },
  { id: 'W[1]', kind: 'value', role: 'param', label: 'W[0,1]', col: 1, row: 6, value: wB(0, 1), grad: wB(0, 1), click: { drill: 'W[1]' } },
  { id: 'op:matvec', kind: 'op', role: 'op', label: '·', col: 2, row: 4, value: dot(0, 0, 0), grad: ten('zPost', 0, 0), click: { segment: 'z', symbol: 'W' } },
  { id: 'b[0]', kind: 'value', role: 'param', label: 'b[0]', col: 2, row: 6, value: bB(0, 0), grad: bB(0, 0), click: { drill: 'b[0]' } },
  { id: 'op:add', kind: 'op', role: 'op', label: '+', col: 3, row: 4, value: ten('zPost', 0, 0, 1), grad: ten('zPost', 0, 0), click: { segment: 'z', symbol: 'b' } },
  { id: 'z', kind: 'value', role: 'computed', label: 'z', col: 4, row: 4, value: ten('zPost', 0, 0, 1), grad: ten('zPost', 0, 0) },
  { id: 'op:sigmoid', kind: 'op', role: 'op', label: 'σ', col: 5, row: 4, value: ten('h', 0, 0, 2), grad: ten('h', 0, 0), click: { segment: 'yhat', symbol: 'σ' } },
  { id: 'ŷ', kind: 'value', role: 'computed', label: 'ŷ', col: 6, row: 4, value: ten('h', 0, 0, 2), grad: ten('h', 0, 0), click: { drill: 'ŷ' } },
]

const NEURON_EDGES: readonly RenderEdge[] = [
  flow('x[0]', 'op:matvec'),
  flow('x[1]', 'op:matvec'),
  flow('W[0]', 'op:matvec'),
  flow('W[1]', 'op:matvec'),
  flow('op:matvec', 'op:add'),
  flow('b[0]', 'op:add'),
  flow('op:add', 'z'),
  flow('z', 'op:sigmoid'),
  flow('op:sigmoid', 'ŷ'),
]

const NEURON_STEP_GROUPS: readonly (readonly string[])[] = [
  ['op:matvec'],
  ['op:add', 'z'],
  ['op:sigmoid', 'ŷ'],
  ['ŷ'],
  ['ŷ'],
  ['op:sigmoid', 'z', 'ŷ'],
  ['op:matvec', 'z'],
  ['W[0]', 'W[1]', 'b[0]'],
]

const NEURON_SEGMENTS: readonly RenderSegment[] = [  {
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
    nodes: ['W[0]', 'W[1]', 'b[0]', 'op:matvec', 'op:add', 'z'],
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
    nodes: ['W[0]', 'W[1]', 'b[0]'],
    symbolNodes: { η: ['W[0]', 'W[1]', 'b[0]'], '∂L/∂W': ['W[0]', 'W[1]', 'b[0]'] },
  },
]

/**
 * Рамка-нейрон (2.1-03, фикс 4; ревизия ревью UAT 2026-11-17): охватывает
 * внутренние веса и вычисления нейрона — параметры (W, b) и операции
 * взвешенной суммы («·», «+»); z, σ, ŷ — последующие вычисления — вне
 * рамки. Коллапс-блок несёт живое z (выход взвешенной суммы).
 */
const NEURON_FRAMES: readonly RenderFrame[] = [
  {
    id: 'n1',
    title: 'Нейрон 1',
    nodes: ['W[0]', 'W[1]', 'b[0]', 'op:matvec', 'op:add'],
    output: ten('zPost', 0, 0, 1),
    drill: 'z',
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
    frames: NEURON_FRAMES,
    series: NEURON_SERIES,
  },
}
