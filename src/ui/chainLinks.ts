/**
 * Модель звеньев «формулы-хребта» (01.2-01; цепь-станций — 01.2-04,
 * утверждено владельцем 2026-11-05): цепь станций, читаемая слева-направо
 * строго по формуле — пример → x →[W1·x+b1]→ z1 →[tanh]→ a1 →[W2·a1+b2]→
 * z2 →[σ]→ ŷ →[BCE]→ L; звено W замыкает цикл обновлением весов. Чистый
 * view-слой над прогоном (без React, fast-refresh-safe; движок не меняется).
 * Звено = объединение соседних операций сценария (z1 = matvec+add); формулы
 * собираются из opMeta. symbolToSegment отображает каждый символ формулы
 * сети ровно в одно звено (клик по символу → run.selectLink); geometryOf —
 * геометрия подсветки звена на диаграмме (id узлов/рёбер/плашек/биасов,
 * контракт ArchitectureDiagram == CHAIN_GEOMETRY_IDS). Пользовательские
 * строки (RU) изолированы здесь (D-10, RU-first).
 */

import { XOR_SCENARIO } from '../run/scenario'

export type SegmentId = 'x' | 'z1' | 'a1' | 'z2' | 'yhat' | 'L' | 'W'

export interface ChainSegment {
  id: SegmentId
  /** Заголовок звена (RU) — символ формулы первым, шапка панели звена. */
  title: string
  /** Формула звена — из opMeta сценария (z1/z2: склейка matvec+add). */
  formula: string
  /** Символы формулы-строки, выбирающие это звено. */
  symbols: readonly string[]
}

/** Плашки-станции на диаграмме: активации tanh/σ и лосс bce. */
export type PlateId = 'tanh' | 'σ' | 'bce'

/** Геометрия звена на диаграмме: множества id узлов/рёбер/плашек/биасов.
 *  Возвращаемые множества — разделяемый контракт только для чтения. */
export interface SegmentGeometry {
  nodes: Set<string>
  edges: Set<string>
  plates: Set<PlateId>
  biases: Set<string>
}

/** Формула операции opMeta по индексу. */
const op = (i: number): string => XOR_SCENARIO.opMeta[i]!.formula

export const SEGMENTS: readonly ChainSegment[] = [
  { id: 'x', title: 'x — вход примера', formula: 'x = (x1, x2)', symbols: ['x'] },
  {
    id: 'z1',
    title: 'z1 — взвешенная сумма скрытого слоя',
    formula: `${op(0)} + b1`, // «z1 = W1·x» + «z1 = z1 + b1» → «z1 = W1·x + b1»
    symbols: ['W1', 'b1'],
  },
  { id: 'a1', title: 'a1 — активация tanh', formula: op(2), symbols: ['tanh'] },
  {
    id: 'z2',
    title: 'z2 — взвешенная сумма выхода',
    formula: `${op(3)} + b2`, // «z2 = W2·a1» + «z2 = z2 + b2» → «z2 = W2·a1 + b2»
    symbols: ['W2', 'b2'],
  },
  { id: 'yhat', title: 'ŷ — прогноз (σ)', formula: op(5), symbols: ['σ', 'ŷ'] },
  { id: 'L', title: 'L — лосс (binary cross-entropy)', formula: op(6), symbols: ['y', 'L'] },
  {
    id: 'W',
    title: 'W — обновление весов (SGD)',
    formula: op(12).replace('=', '←'), // «W = W − η·∂L/∂W» → «W ← W − η·∂L/∂W»
    symbols: ['η', '∂L/∂W'],
  },
]

/** Каждый символ формулы сети — ровно в одно звено (источник: SEGMENTS). */
export const symbolToSegment: Readonly<Record<string, SegmentId>> = Object.fromEntries(
  SEGMENTS.flatMap((s) => s.symbols.map((sym) => [sym, s.id])),
)

/** Символы живых чисел панели звена (значения — живые тензоры прогона). */
export const SEGMENT_NUMBER_SYMS: Record<SegmentId, readonly string[]> = {
  x: ['x'],
  z1: ['W1', 'b1', 'z1'],
  a1: ['z1', 'a1'],
  z2: ['W2', 'b2', 'z2'],
  yhat: ['z2', 'ŷ'],
  L: ['ŷ', 'y', 'L'],
  W: ['η', '∂L/∂W2', 'W2[0,0]'],
}

// id геометрии диаграммы-цепи станций (контракт ArchitectureDiagram, 01.2-04)
const X_NODES = ['x[0]', 'x[1]']
const Z1_NODES = ['z1[0]', 'z1[1]', 'z1[2]']
const A1_NODES = ['a1[0]', 'a1[1]', 'a1[2]']
const W1_EDGES = ['W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]']
const W2_EDGES = ['W2[0]', 'W2[1]', 'W2[2]']
/** Подводы примера: тонкие рёбра маркер «пример k» → узлы x (звено x). */
const SAMPLE_FEEDS = ['sample-feed[0]', 'sample-feed[1]']
const B1_NODES = ['b1[0]', 'b1[1]', 'b1[2]']
const B2_NODES = ['b2[0]']

/** Контракт цепи станций: сверяется юнит-тестом с GEOMETRY_IDS диаграммы
 *  (узлы x×2/z1×3/a1×3/z2/ŷ/y/L · рёбра W1×6+W2×3+подводы×2 · плашки
 *  tanh/σ/bce · биас-чипы b1×3+b2). */
export const CHAIN_GEOMETRY_IDS = {
  nodes: [...X_NODES, ...Z1_NODES, ...A1_NODES, 'z2', 'ŷ', 'y', 'L'],
  edges: [...W1_EDGES, ...W2_EDGES, ...SAMPLE_FEEDS],
  plates: ['tanh', 'σ', 'bce'] as const,
  biases: [...B1_NODES, ...B2_NODES],
}

function geom(nodes: string[] = [], edges: string[] = [], plates: PlateId[] = [], biases: string[] = []): SegmentGeometry {
  return { nodes: new Set(nodes), edges: new Set(edges), plates: new Set(plates), biases: new Set(biases) }
}

/** Геометрия звена-станции целиком: что подсвечивается на диаграмме при
 *  выборе. x = узлы+подводы; z1/z2 = рёбра W + узлы-суммы + биас-чипы;
 *  a1/yhat = узлы + плашка активации; L = ŷ+y+L + плашка bce. */
const SEGMENT_GEOMETRY: Record<SegmentId, SegmentGeometry> = {
  x: geom(X_NODES, SAMPLE_FEEDS),
  z1: geom(Z1_NODES, W1_EDGES, [], B1_NODES),
  a1: geom(A1_NODES, [], ['tanh']),
  z2: geom(['z2'], W2_EDGES, [], B2_NODES),
  yhat: geom(['ŷ'], [], ['σ']),
  L: geom(['ŷ', 'y', 'L'], [], ['bce']),
  W: geom([], [...W1_EDGES, ...W2_EDGES], [], [...B1_NODES, ...B2_NODES]),
}

/** Точечная геометрия символа (внутри своего звена); η/∂L/∂W масштабируют
 *  всё обновление → геометрия звена W (рёбра W1+W2 и биасы). */
const SYMBOL_GEOMETRY: Record<string, SegmentGeometry> = {
  x: geom(X_NODES, SAMPLE_FEEDS),
  W1: geom([], W1_EDGES),
  b1: geom([], [], [], B1_NODES),
  tanh: geom(A1_NODES, [], ['tanh']),
  W2: geom([], W2_EDGES),
  b2: geom([], [], [], B2_NODES),
  σ: geom(['ŷ'], [], ['σ']),
  ŷ: geom(['ŷ']),
  y: geom(['y']),
  L: geom(['ŷ', 'y', 'L'], [], ['bce']),
  η: SEGMENT_GEOMETRY.W,
  '∂L/∂W': SEGMENT_GEOMETRY.W,
}

/** Геометрия подсветки: точечная для символа его звена, целиком для звена. */
export function geometryOf(segment: SegmentId, symbol?: string): SegmentGeometry {
  if (symbol !== undefined) {
    const g = SYMBOL_GEOMETRY[symbol]
    if (g !== undefined && symbolToSegment[symbol] === segment) return g
  }
  return SEGMENT_GEOMETRY[segment]
}
