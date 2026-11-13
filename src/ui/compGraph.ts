/**
 * Граф вычислений (01.2-06; данные — spec.render с D-30): диаграмма =
 * буквальный граф движка — звено-значение (закруглённый квадрат: константа —
 * белая рамка, параметр — зелёная, вычисленное — нейтральная) и звено-операция
 * (круг; операции по-элементно + ОДНА update-станция «W ← W − η·∂L/∂W»).
 * Топология и живые числа — рендер-метки спека; рамки канвы детерминированы:
 * координаты — чистая функция структуры (ранг-колонка × строка × pitch),
 * никаких авто-layout/случайностей — одинаковый вход даёт бит-идентичную
 * картину (e2e-дисциплина). Чистый data-слой без React (fast-refresh-safe);
 * значения навешивает рендер live-срезами прогона (инвариант
 * «граф = drill-down = движок»).
 *
 * Билдеры параметризуются спеком (тесты сверяют инвентарь XOR и neuron);
 * модульные константы строятся из activeScenario() — сценарий сессии
 * фиксируется по URL до импорта UI (run.ts), таблицы стабильны весь сеанс.
 */

import { activeScenario, type ScenarioModel } from '../run/scenario'
import type { SegmentId } from './chainLinks'

export type GraphNodeKind = 'value' | 'op' | 'update'
export type GraphNodeRole = 'const' | 'param' | 'computed' | 'op'

export interface GraphNode {
  readonly id: string
  readonly kind: GraphNodeKind
  readonly role: GraphNodeRole
  /** Display-подпись (SvgSubLabel: z1[0] → z₁[0]); для операций — глиф оп. */
  readonly label: string
  /** Ранг-колонка топологической глубины (0 = входы/параметры). */
  readonly col: number
  /** Строка раскладки (строки нейронов; детерминированная таблица). */
  readonly row: number
  /** Координаты центра в рамках канвы (PAD + col/row × pitch). */
  readonly x: number
  readonly y: number
}

export interface GraphEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  /** update-рёбра (параметр → update-станция) рисуются тонким пунктиром. */
  readonly kind: 'flow' | 'update'
}

/** Рамки канвы: фиксированные pitch/padding, размер — функция структуры. */
export const PITCH_X = 78
export const PITCH_Y = 44
export const PAD_X = 34
export const PAD_Y = 26
export const NODE_W = 62
export const NODE_H = 30

/** Рамки канвы из данных спека (максимум col/row + один pitch запас). */
export function graphBounds(spec: ScenarioModel = activeScenario()): { w: number; h: number } {
  let maxCol = 0
  let maxRow = 0
  for (const n of spec.render.nodes) {
    if (n.col > maxCol) maxCol = n.col
    if (n.row > maxRow) maxRow = n.row
  }
  return { w: PAD_X + maxCol * PITCH_X + NODE_W, h: PAD_Y + maxRow * PITCH_Y + NODE_H }
}

/** Полный граф с координатами и рамками (чистая функция структуры спека). */
export function buildGraph(spec: ScenarioModel = activeScenario()): { nodes: readonly GraphNode[]; view: { w: number; h: number } } {
  const nodes = spec.render.nodes.map((s) => ({
    id: s.id,
    kind: s.kind,
    role: s.role,
    label: s.label,
    col: s.col,
    row: s.row,
    x: PAD_X + s.col * PITCH_X,
    y: PAD_Y + s.row * PITCH_Y,
  }))
  return { nodes, view: graphBounds(spec) }
}

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
