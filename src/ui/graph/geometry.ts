/**
 * Геометрия графа вычислений (перенос из compGraph.ts телом, D-34):
 * детерминированная раскладка — координаты чистая функция структуры
 * (ранг-колонка × строка × фиксированный pitch), никаких авто-layout/
 * случайностей — одинаковый вход даёт бит-идентичную картину (e2e-дисциплина).
 * Чистый data-слой без React (fast-refresh-safe).
 */

import { activeScenario, type ScenarioModel } from '../../run/scenario'

export type GraphNodeKind = 'value' | 'op'
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
}

/** Рамки канвы: фиксированные pitch/padding, размер — функция структуры. */
export const PITCH_X = 78
export const PITCH_Y = 56
export const PAD_X = 34
/** 2.1-03: запас под рамку-нейрон строки 0 (полублок 24 + FRAME_PAD 12 + заголовок). */
export const PAD_Y = 56
/** Узел-значение — квадрат 1:1 (2.1-02, фикс 5). */
export const NODE_W = 48
export const NODE_H = 48

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
