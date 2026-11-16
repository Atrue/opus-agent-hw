/**
 * Геометрия подсветки звена на графе вычислений (перенос из chainLinks.ts
 * телом, D-34): звено = группа узлов графа (inventory.SEGMENT_GROUPS) —
 * клик по символу формулы подсвечивает группу (узлы-значения/операции +
 * рёбра между ними); точечная подсветка — подмножество symbolNodes спека.
 */

import type { SegmentId } from '../../run/types'
import { GRAPH_EDGES, SEGMENT_GROUPS } from '../graph/inventory'
import { chainOf } from './links'
import { symbolToSegment } from './symbols'

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

const EMPTY: ReadonlySet<string> = new Set<string>()

function toGeometry(nodes: Iterable<string>, edges: Iterable<string>): SegmentGeometry {
  return { nodes: new Set(nodes), edges: new Set(edges), plates: new Set<string>(), biases: new Set<string>() }
}

/** Точечные подмножества символа внутри его звена (symbolNodes спека). */
const SYMBOL_NODES: Readonly<Record<string, readonly string[]>> = chainOf().symbolNodes

/** Контекст геометрии: рёбра/группы графа + символы одного сценария. */
export interface GeometryContext {
  edges: readonly { id: string; from: string; to: string }[]
  segmentGroups: Readonly<Record<SegmentId, { nodes: ReadonlySet<string> }>>
  symbolToSegment: Readonly<Record<string, SegmentId>>
  symbolNodes: Readonly<Record<string, readonly string[]>>
}

/** Контекст активного сценария (по умолчанию в geometryOf). */
const ACTIVE_CONTEXT: GeometryContext = {
  edges: GRAPH_EDGES,
  segmentGroups: SEGMENT_GROUPS,
  symbolToSegment,
  symbolNodes: SYMBOL_NODES,
}

/** Геометрия подсветки: точечная для символа его звена, целиком для звена. */
export function geometryOf(segment: SegmentId, symbol?: string, ctx: GeometryContext = ACTIVE_CONTEXT): SegmentGeometry {
  const groupEntry = ctx.segmentGroups[segment]
  if (groupEntry === undefined) return toGeometry([], [])
  const inner = ctx.edges.filter((e) => groupEntry.nodes.has(e.from) && groupEntry.nodes.has(e.to)).map((e) => e.id)
  const whole = toGeometry(groupEntry.nodes, inner)
  if (symbol !== undefined) {
    const subset = ctx.symbolNodes[symbol]
    if (subset !== undefined && ctx.symbolToSegment[symbol] === segment) {
      const allowed = new Set(subset)
      const nodes = [...whole.nodes].filter((n) => allowed.has(n))
      const nodeSet = new Set(nodes)
      const edges = [...whole.edges].filter((e) => {
        const edge = ctx.edges.find((ge) => ge.id === e)!
        return nodeSet.has(edge.from) && nodeSet.has(edge.to)
      })
      if (nodes.length > 0) return toGeometry(nodeSet, edges)
    }
  }
  return whole
}

export { EMPTY as EMPTY_GEOMETRY_SET }
