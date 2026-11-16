/**
 * Инвентарь графа вычислений (перенос из compGraph.ts телом, D-34): полный
 * инвентарь спека — узлы/рёбра/группы звеньев/группы шагов. Билдеры
 * параметризуются спеком (тесты сверяют инвентарь XOR и neuron); модульные
 * константы строятся из activeScenario() — сценарий сессии фиксируется по
 * URL до импорта UI (run.ts), таблицы стабильны весь сеанс.
 */

import { activeScenario, type ScenarioModel } from '../../run/scenario'
import type { SegmentId } from '../../run/types'
import { buildGraph, type GraphEdge, type GraphNode } from './geometry'

export interface NodeGroup {
  readonly nodes: ReadonlySet<string>
  readonly edges: ReadonlySet<string>
}

/** Полный инвентарь графа спека: узлы/рёбра/группы звеньев/группы шагов. */
export function buildInventory(spec: ScenarioModel = activeScenario()) {
  const nodes = buildGraph(spec).nodes
  const edges: GraphEdge[] = spec.render.edges.map((e) => ({
    id: `${e.from}->${e.to}`,
    from: e.from,
    to: e.to,
    kind: e.kind === 'update' ? 'update' : 'flow',
  }))
  const group = (nodeIds: readonly string[]): NodeGroup => {
    const set = new Set(nodeIds)
    const inner = edges.filter((e) => set.has(e.from) && set.has(e.to)).map((e) => e.id)
    return { nodes: set, edges: new Set(inner) }
  }
  return {
    nodes,
    edges,
    segmentGroups: Object.fromEntries(spec.render.segments.map((seg) => [seg.id, group(seg.nodes)])) as Readonly<
      Record<SegmentId, NodeGroup>
    >,
    stepGroups: spec.render.stepGroups.map((ids) => group(ids)),
  }
}

/** Статичный инвентарь активного сценария (топология неизменна в течение сессии). */
const INVENTORY = buildInventory()
export const GRAPH_NODES: readonly GraphNode[] = INVENTORY.nodes
export const GRAPH_EDGES: readonly GraphEdge[] = INVENTORY.edges
export const SEGMENT_GROUPS: Readonly<Record<SegmentId, NodeGroup>> = INVENTORY.segmentGroups
export const STEP_GROUPS: readonly NodeGroup[] = INVENTORY.stepGroups
