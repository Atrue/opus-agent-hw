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
 */

import { XOR_SCENARIO } from '../run/scenario'
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
export function graphBounds(): { w: number; h: number } {
  let maxCol = 0
  let maxRow = 0
  for (const n of XOR_SCENARIO.render.nodes) {
    if (n.col > maxCol) maxCol = n.col
    if (n.row > maxRow) maxRow = n.row
  }
  return { w: PAD_X + maxCol * PITCH_X + NODE_W, h: PAD_Y + maxRow * PITCH_Y + NODE_H }
}

/** Полный граф с координатами и рамками (чистая функция структуры спека). */
export function buildGraph(): { nodes: readonly GraphNode[]; view: { w: number; h: number } } {
  const nodes = XOR_SCENARIO.render.nodes.map((s) => ({
    id: s.id,
    kind: s.kind,
    role: s.role,
    label: s.label,
    col: s.col,
    row: s.row,
    x: PAD_X + s.col * PITCH_X,
    y: PAD_Y + s.row * PITCH_Y,
  }))
  return { nodes, view: graphBounds() }
}

/** Статичный инвентарь графа (топология сценария неизменна в течение сессии). */
export const GRAPH_NODES: readonly GraphNode[] = buildGraph().nodes
export const GRAPH_EDGES: readonly GraphEdge[] = XOR_SCENARIO.render.edges.map((e) => ({
  id: `${e.from}->${e.to}`,
  from: e.from,
  to: e.to,
  kind: e.kind === 'update' ? 'update' : 'flow',
}))

export interface NodeGroup {
  readonly nodes: ReadonlySet<string>
  readonly edges: ReadonlySet<string>
}

const group = (nodeIds: readonly string[]): NodeGroup => {
  const nodes = new Set(nodeIds)
  const edges = new Set(GRAPH_EDGES.filter((e) => nodes.has(e.from) && nodes.has(e.to)).map((e) => e.id))
  return { nodes, edges }
}

/** Группы звеньев цепи (selection формулы-строки → подсветка группы). */
export const SEGMENT_GROUPS: Readonly<Record<SegmentId, NodeGroup>> = Object.fromEntries(
  XOR_SCENARIO.render.segments.map((seg) => [seg.id, group(seg.nodes)]),
)

/** Группы шагов ленты (по индексу walked-опы; подсветка активной op). */
export const STEP_GROUPS: readonly NodeGroup[] = XOR_SCENARIO.render.stepGroups.map((ids) => group(ids))
