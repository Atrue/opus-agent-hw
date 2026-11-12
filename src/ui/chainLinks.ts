/**
 * Модель звеньев «формулы-хребта» (01.2-01; граф вычислений — 01.2-06;
 * данные — spec.render с D-30): цепь звеньев (XOR: x → z1 → a1 → z2 → ŷ →
 * L → W) — чистый view-слой над прогоном (без React, fast-refresh-safe;
 * движок не меняется). Звено = группа звеньев графа вычислений
 * (compGraph.SEGMENT_GROUPS): клик по символу формулы подсвечивает группу
 * (узлы-значения/операции + рёбра между ними). Заголовки — символ формулы
 * первым (Gap 6). Пользовательские строки (RU) изолированы в данных спека
 * (D-10, RU-first). Идентификаторы звеньев — строки спека (набор звеньев —
 * данные сценария; нейрон-сценарий сжимает цепь до 5 звеньев).
 */

import { GRAPH_EDGES, GRAPH_NODES, SEGMENT_GROUPS } from './compGraph'
import { XOR_SCENARIO } from '../run/scenario'

/** Идентификатор звена — строка спека (render.segments[].id). */
export type SegmentId = string

export interface ChainSegment {
  id: SegmentId
  /** Заголовок звена (RU, символ формулы первым) — шапка панели звена. */
  title: string
  /** Формула звена — данные спека (XOR: склейка формул opMeta matvec+add). */
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

/** Звенья цепи из spec.render (порядок = цепь). */
export const SEGMENTS: readonly ChainSegment[] = XOR_SCENARIO.render.segments.map((seg) => ({
  id: seg.id,
  title: seg.title,
  formula: seg.formula,
  symbols: seg.symbols,
}))

/** Каждый символ формулы сети — ровно в одно звено (источник: SEGMENTS). */
export const symbolToSegment: Readonly<Record<string, SegmentId>> = Object.fromEntries(
  SEGMENTS.flatMap((s) => s.symbols.map((sym) => [sym, s.id])),
)

/** Символы живых чисел панели звена (значения — живые тензоры прогона). */
export const SEGMENT_NUMBER_SYMS: Readonly<Record<SegmentId, readonly string[]>> = Object.fromEntries(
  XOR_SCENARIO.render.segments.map((seg) => [seg.id, seg.numberSyms]),
)

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

/** Точечные подмножества символа внутри его звена (symbolNodes спека). */
const SYMBOL_NODES: Readonly<Record<string, readonly string[]>> = Object.assign(
  {},
  ...XOR_SCENARIO.render.segments.map((seg) => seg.symbolNodes),
)

/** Геометрия подсветки: точечная для символа его звена, целиком для звена. */
export function geometryOf(segment: SegmentId, symbol?: string): SegmentGeometry {
  const groupEntry = SEGMENT_GROUPS[segment]
  if (groupEntry === undefined) return toGeometry([], [])
  const whole = groupGeometry(groupEntry.nodes)
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
