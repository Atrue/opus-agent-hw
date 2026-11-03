/**
 * XOR-сценарий уровня приложения (R3): фиксированные стартовые веса
 * (воспроизводимость демо), lr, 4 сэмпла XOR (первый — [1,0]→1, эталонный),
 * формулы и нарративы RU всех 13 операций walkthrough.
 */

import type { Phase } from '../tensor'

export interface ScenarioOpMeta {
  op: string
  layer: number
  phase: Phase
  formula: string
  narrative: string
}

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
  samples: [
    { x: [1, 0], y: 1 },
    { x: [0, 1], y: 1 },
    { x: [0, 0], y: 0 },
    { x: [1, 1], y: 0 },
  ],
  startWeights: {
    w1: [
      [-0.9228963213252399, 0.3924486452741056],
      [-0.712133557209278, -0.0749354903418249],
      [0.34329352823553405, 0.5859025433105887],
    ],
    b1: [-0.09362154306757531, -0.0034555404038976167, -0.9616857839513044],
    w2: [[-0.1352223220971196, -0.25525063835814765, 0.704577266381706]],
    b2: [0.09396780858201126],
  },
  opMeta: [
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
  ],
}

export const SAMPLE_COUNT = XOR_SCENARIO.samples.length
