/**
 * Модель звеньев «формулы-хребта» (01.2-01; граф вычислений — 01.2-06):
 * цепь из 7 звеньев x → z1 → a1 → z2 → ŷ → L → W — чистый view-слой над
 * прогоном (без React, fast-refresh-safe; движок не меняется). Звено = группа
 * звеньев графа вычислений (compGraph.SEGMENT_GROUPS): клик по символу
 * формулы подсвечивает группу (узлы-значения/операции + рёбра между ними).
 * Заголовки — символ формулы первым (Gap 6). Пользовательские строки (RU)
 * изолированы здесь (D-10, RU-first).
 */

import { GRAPH_EDGES, GRAPH_NODES, SEGMENT_GROUPS } from './compGraph'
import { XOR_SCENARIO } from '../run/scenario'

export type SegmentId = 'x' | 'z1' | 'a1' | 'z2' | 'yhat' | 'L' | 'W'

export interface ChainSegment {
  id: SegmentId
  /** Заголовок звена (RU, символ формулы первым) — шапка панели звена. */
  title: string
  /** Формула звена — из opMeta сценария (z1/z2: склейка matvec+add). */
  formula: string
  /** Символы формулы-строки, выбирающие это звено. */
  symbols: readonly string[]
}

/**
 * Геометрия звена на графе вычислений: узлы и рёбра группы (plates/biases —
 * пустые, историческая форма интерфейса сохранена для совместимости).
 */
export interface SegmentGeometry {
  nodes: Set<string>
  edges: Set<string>
  plates: Set<string>
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

/** Контракт графа: все узлы/рёбра вычислительного графа (сверка с рендером). */
export const CHAIN_GEOMETRY_IDS = {
  nodes: GRAPH_NODES.map((n) => n.id),
  edges: GRAPH_EDGES.map((e) => e.id),
  plates: [] as string[],
  biases: [] as string[],
}

const EMPTY: ReadonlySet<string> = new Set<string>()

function toGeometry(nodes: Iterable<string>, edges: Iterable<string>): SegmentGeometry {
  return { nodes: new Set(nodes), edges: new Set(edges), plates: new Set<string>(), biases: new Set<string>() }
}

/** Геометрия группы: узлы группы + рёбра между ними (внутренние связи). */
function groupGeometry(nodes: ReadonlySet<string>): SegmentGeometry {
  const edges = GRAPH_EDGES.filter((e) => nodes.has(e.from) && nodes.has(e.to)).map((e) => e.id)
  return toGeometry(nodes, edges)
}

/** Точечные подмножества символа внутри его звена (для geometryOf(seg, sym)). */
const SYMBOL_NODES: Readonly<Record<string, readonly string[]>> = {
  x: ['x[0]', 'x[1]'],
  W1: ['W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]'],
  b1: ['b1[0]', 'b1[1]', 'b1[2]'],
  tanh: ['op:tanh[0]', 'op:tanh[1]', 'op:tanh[2]', 'a1[0]', 'a1[1]', 'a1[2]'],
  W2: ['W2[0]', 'W2[1]', 'W2[2]'],
  b2: ['b2[0]'],
  σ: ['op:sigmoid', 'ŷ'],
  ŷ: ['ŷ'],
  y: ['y[0]'],
  L: ['op:bce', 'y[0]', 'L', 'ŷ'],
  η: ['op:update', 'W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]', 'b1[0]', 'b1[1]', 'b1[2]', 'W2[0]', 'W2[1]', 'W2[2]', 'b2[0]'],
  '∂L/∂W': ['op:update', 'W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]', 'b1[0]', 'b1[1]', 'b1[2]', 'W2[0]', 'W2[1]', 'W2[2]', 'b2[0]'],
}

/** Геометрия подсветки: точечная для символа его звена, целиком для звена. */
export function geometryOf(segment: SegmentId, symbol?: string): SegmentGeometry {
  const whole = groupGeometry(SEGMENT_GROUPS[segment]!.nodes)
  if (symbol !== undefined) {
    const subset = SYMBOL_NODES[symbol]
    if (subset !== undefined && symbolToSegment[symbol] === segment) {
      const allowed = new Set(subset)
      const nodes = [...whole.nodes].filter((n) => allowed.has(n))
      const nodeSet = new Set(nodes)
      const edges = [...whole.edges].filter((e) => {
        const edge = GRAPH_EDGES.find((ge) => ge.id === e)!
        return nodeSet.has(edge.from) && nodeSet.has(edge.to)
      })
      if (nodes.length > 0) return toGeometry(nodeSet, edges)
    }
  }
  return whole
}

export { EMPTY as EMPTY_GEOMETRY_SET }
