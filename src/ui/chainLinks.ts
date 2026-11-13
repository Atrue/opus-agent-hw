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
import { activeScenario, type ScenarioModel } from '../run/scenario'

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

/** Звенья/символы/подмножества из спека (тесты параметризуют XOR/neuron). */
export function chainOf(spec: ScenarioModel = activeScenario()) {
  const segments: readonly ChainSegment[] = spec.render.segments.map((seg) => ({
    id: seg.id,
    title: seg.title,
    formula: seg.formula,
    symbols: seg.symbols,
  }))
  return {
    segments,
    symbolToSegment: Object.fromEntries(segments.flatMap((s) => s.symbols.map((sym) => [sym, s.id]))) as Readonly<
      Record<string, SegmentId>
    >,
    numberSyms: Object.fromEntries(spec.render.segments.map((seg) => [seg.id, seg.numberSyms])) as Readonly<
      Record<SegmentId, readonly string[]>
    >,
    symbolNodes: Object.assign({}, ...spec.render.segments.map((seg) => seg.symbolNodes)) as Readonly<
      Record<string, readonly string[]>
    >,
  }
}

/** Звенья цепи активного сценария (порядок = цепь). */
export const SEGMENTS: readonly ChainSegment[] = chainOf().segments

/** Каждый символ формулы сети — ровно в одно звено (источник: SEGMENTS). */
export const symbolToSegment: Readonly<Record<string, SegmentId>> = chainOf().symbolToSegment

/** Символы живых чисел панели звена (значения — живые тензоры прогона). */
export const SEGMENT_NUMBER_SYMS: Readonly<Record<SegmentId, readonly string[]>> = chainOf().numberSyms

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
