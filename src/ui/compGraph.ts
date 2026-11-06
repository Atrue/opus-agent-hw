/**
 * Граф вычислений (01.2-06, правила владельца 2026-11-05): диаграмма =
 * буквальный граф движка — звено-значение (закруглённый квадрат: константа —
 * белая рамка, параметр — зелёная, вычисленное — нейтральная) и звено-операция
 * (круг; операции по-элементно: matvec×3, add×3, tanh×3, matvec2, add2, σ,
 * bce + ОДНА update-станция «W ← W − η·∂L/∂W»). Рамки канвы детерминированы:
 * координаты — чистая функция структуры (ранг-колонка × строка × pitch),
 * никаких авто-layout/случайностей — одинаковый вход даёт бит-идентичную
 * картину (e2e-дисциплина). Чистый data-слой без React (fast-refresh-safe);
 * топология статична (XOR 2-3-1), значения навешивает рендер live-срезами
 * прогона (инвариант «граф = drill-down = движок»).
 */

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
const MAX_COL = 16
const MAX_ROW = 9

export function graphBounds(): { w: number; h: number } {
  return { w: PAD_X + MAX_COL * PITCH_X + NODE_W, h: PAD_Y + MAX_ROW * PITCH_Y + NODE_H }
}

/** Короткие матричные подписи параметров (аудит нотации: W1[j,i]). */
const W1_LABELS = ['W1[0,0]', 'W1[0,1]', 'W1[1,0]', 'W1[1,1]', 'W1[2,0]', 'W1[2,1]'] as const
const W2_LABELS = ['W2[0,0]', 'W2[0,1]', 'W2[0,2]'] as const

interface NodeSeed {
  id: string
  kind: GraphNodeKind
  role: GraphNodeRole
  label: string
  col: number
  row: number
}

/** Детерминированная таблица звеньев (структура XOR 2-3-1; строки нейронов). */
const NODE_SEEDS: readonly NodeSeed[] = [
  // константы: входы и метка — белая рамка
  { id: 'x[0]', kind: 'value', role: 'const', label: 'x1', col: 0, row: 4 },
  { id: 'x[1]', kind: 'value', role: 'const', label: 'x2', col: 0, row: 6 },
  { id: 'y[0]', kind: 'value', role: 'const', label: 'y', col: 14, row: 6 },
  // параметры первого слоя (зелёная рамка) — пары W1 у своего нейрона
  { id: 'W1[0]', kind: 'value', role: 'param', label: W1_LABELS[0], col: 1, row: 0 },
  { id: 'W1[1]', kind: 'value', role: 'param', label: W1_LABELS[1], col: 1, row: 1 },
  { id: 'W1[2]', kind: 'value', role: 'param', label: W1_LABELS[2], col: 1, row: 4 },
  { id: 'W1[3]', kind: 'value', role: 'param', label: W1_LABELS[3], col: 1, row: 5 },
  { id: 'W1[4]', kind: 'value', role: 'param', label: W1_LABELS[4], col: 1, row: 8 },
  { id: 'W1[5]', kind: 'value', role: 'param', label: W1_LABELS[5], col: 1, row: 9 },
  // скрытый слой: matvec → W1x (до биаса) → add (+b1) → z1 → tanh → a1
  { id: 'op:matvec[0]', kind: 'op', role: 'op', label: '·', col: 2, row: 0 },
  { id: 'op:matvec[1]', kind: 'op', role: 'op', label: '·', col: 2, row: 4 },
  { id: 'op:matvec[2]', kind: 'op', role: 'op', label: '·', col: 2, row: 8 },
  { id: 'W1x[0]', kind: 'value', role: 'computed', label: 'W1x1', col: 3, row: 0 },
  { id: 'W1x[1]', kind: 'value', role: 'computed', label: 'W1x2', col: 3, row: 4 },
  { id: 'W1x[2]', kind: 'value', role: 'computed', label: 'W1x3', col: 3, row: 8 },
  { id: 'b1[0]', kind: 'value', role: 'param', label: 'b1[0]', col: 3, row: 1 },
  { id: 'b1[1]', kind: 'value', role: 'param', label: 'b1[1]', col: 3, row: 5 },
  { id: 'b1[2]', kind: 'value', role: 'param', label: 'b1[2]', col: 3, row: 9 },
  { id: 'op:add[0]', kind: 'op', role: 'op', label: '+', col: 4, row: 0 },
  { id: 'op:add[1]', kind: 'op', role: 'op', label: '+', col: 4, row: 4 },
  { id: 'op:add[2]', kind: 'op', role: 'op', label: '+', col: 4, row: 8 },
  { id: 'z1[0]', kind: 'value', role: 'computed', label: 'z1[0]', col: 5, row: 0 },
  { id: 'z1[1]', kind: 'value', role: 'computed', label: 'z1[1]', col: 5, row: 4 },
  { id: 'z1[2]', kind: 'value', role: 'computed', label: 'z1[2]', col: 5, row: 8 },
  { id: 'op:tanh[0]', kind: 'op', role: 'op', label: 'tanh', col: 6, row: 0 },
  { id: 'op:tanh[1]', kind: 'op', role: 'op', label: 'tanh', col: 6, row: 4 },
  { id: 'op:tanh[2]', kind: 'op', role: 'op', label: 'tanh', col: 6, row: 8 },
  { id: 'a1[0]', kind: 'value', role: 'computed', label: 'a1[0]', col: 7, row: 0 },
  { id: 'a1[1]', kind: 'value', role: 'computed', label: 'a1[1]', col: 7, row: 4 },
  { id: 'a1[2]', kind: 'value', role: 'computed', label: 'a1[2]', col: 7, row: 8 },
  // параметры второго слоя — у своей операции (свободные строки колонки)
  { id: 'W2[0]', kind: 'value', role: 'param', label: W2_LABELS[0], col: 7, row: 2 },
  { id: 'W2[1]', kind: 'value', role: 'param', label: W2_LABELS[1], col: 7, row: 3 },
  { id: 'W2[2]', kind: 'value', role: 'param', label: W2_LABELS[2], col: 7, row: 6 },
  // выходной слой: matvec2 → W2a1 → add2 (+b2) → z2 → σ → ŷ → bce(+y) → L
  { id: 'op:matvec2', kind: 'op', role: 'op', label: '·', col: 8, row: 4 },
  { id: 'W2a1', kind: 'value', role: 'computed', label: 'W2a1', col: 9, row: 4 },
  { id: 'b2[0]', kind: 'value', role: 'param', label: 'b2[0]', col: 9, row: 5 },
  { id: 'op:add2', kind: 'op', role: 'op', label: '+', col: 10, row: 4 },
  { id: 'z2', kind: 'value', role: 'computed', label: 'z2', col: 11, row: 4 },
  { id: 'op:sigmoid', kind: 'op', role: 'op', label: 'σ', col: 12, row: 4 },
  { id: 'ŷ', kind: 'value', role: 'computed', label: 'ŷ', col: 13, row: 4 },
  { id: 'op:bce', kind: 'op', role: 'op', label: 'BCE', col: 14, row: 4 },
  { id: 'L', kind: 'value', role: 'computed', label: 'L', col: 15, row: 4 },
  // update-станция (одна): W ← W − η·∂L/∂W, рёбра ко всем 13 параметрам
  { id: 'op:update', kind: 'update', role: 'op', label: 'W ← W − η·∂L/∂W', col: 16, row: 8 },
]

const edge = (from: string, to: string, kind: GraphEdge['kind'] = 'flow'): GraphEdge => ({ id: `${from}->${to}`, from, to, kind })

/** Рёбра: операнд → операция → результат (движение значения). */
const EDGE_SEEDS: readonly GraphEdge[] = [
  ...[0, 1, 2].flatMap((j) => [
    edge('x[0]', `op:matvec[${j}]`),
    edge('x[1]', `op:matvec[${j}]`),
    edge(`W1[${j * 2}]`, `op:matvec[${j}]`),
    edge(`W1[${j * 2 + 1}]`, `op:matvec[${j}]`),
    edge(`op:matvec[${j}]`, `W1x[${j}]`),
    edge(`W1x[${j}]`, `op:add[${j}]`),
    edge(`b1[${j}]`, `op:add[${j}]`),
    edge(`op:add[${j}]`, `z1[${j}]`),
    edge(`z1[${j}]`, `op:tanh[${j}]`),
    edge(`op:tanh[${j}]`, `a1[${j}]`),
    edge(`a1[${j}]`, 'op:matvec2'),
  ]),
  edge('W2[0]', 'op:matvec2'),
  edge('W2[1]', 'op:matvec2'),
  edge('W2[2]', 'op:matvec2'),
  edge('op:matvec2', 'W2a1'),
  edge('W2a1', 'op:add2'),
  edge('b2[0]', 'op:add2'),
  edge('op:add2', 'z2'),
  edge('z2', 'op:sigmoid'),
  edge('op:sigmoid', 'ŷ'),
  edge('ŷ', 'op:bce'),
  edge('y[0]', 'op:bce'),
  edge('op:bce', 'L'),
  // update: все 13 параметров → станция (тонкий пунктир)
  edge('W1[0]', 'op:update', 'update'),
  edge('W1[1]', 'op:update', 'update'),
  edge('W1[2]', 'op:update', 'update'),
  edge('W1[3]', 'op:update', 'update'),
  edge('W1[4]', 'op:update', 'update'),
  edge('W1[5]', 'op:update', 'update'),
  edge('b1[0]', 'op:update', 'update'),
  edge('b1[1]', 'op:update', 'update'),
  edge('b1[2]', 'op:update', 'update'),
  edge('W2[0]', 'op:update', 'update'),
  edge('W2[1]', 'op:update', 'update'),
  edge('W2[2]', 'op:update', 'update'),
  edge('b2[0]', 'op:update', 'update'),
]

/** Статичный инвентарь графа (топология XOR неизменна в течение сессии). */
export const GRAPH_NODES: readonly GraphNode[] = buildGraph().nodes
export const GRAPH_EDGES: readonly GraphEdge[] = EDGE_SEEDS

/** Полный граф с координатами и рамками (чистая функция структуры). */
export function buildGraph(): { nodes: readonly GraphNode[]; view: { w: number; h: number } } {
  const nodes = NODE_SEEDS.map((s) => ({ ...s, x: PAD_X + s.col * PITCH_X, y: PAD_Y + s.row * PITCH_Y }))
  return { nodes, view: graphBounds() }
}

export interface NodeGroup {
  readonly nodes: ReadonlySet<string>
  readonly edges: ReadonlySet<string>
}

const group = (nodeIds: readonly string[]): NodeGroup => {
  const nodes = new Set(nodeIds)
  const edges = new Set(GRAPH_EDGES.filter((e) => nodes.has(e.from) && nodes.has(e.to)).map((e) => e.id))
  return { nodes, edges }
}

const PARAM_IDS = ['W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]', 'b1[0]', 'b1[1]', 'b1[2]', 'W2[0]', 'W2[1]', 'W2[2]', 'b2[0]'] as const

/** Группы звеньев цепи (selection формулы-строки → подсветка группы). */
export const SEGMENT_GROUPS: Readonly<Record<SegmentId, NodeGroup>> = {
  x: group(['x[0]', 'x[1]']),
  z1: group([
    ...PARAM_IDS.slice(0, 9),
    'op:matvec[0]', 'op:matvec[1]', 'op:matvec[2]',
    'W1x[0]', 'W1x[1]', 'W1x[2]',
    'op:add[0]', 'op:add[1]', 'op:add[2]',
    'z1[0]', 'z1[1]', 'z1[2]',
  ]),
  a1: group(['op:tanh[0]', 'op:tanh[1]', 'op:tanh[2]', 'a1[0]', 'a1[1]', 'a1[2]']),
  z2: group(['W2[0]', 'W2[1]', 'W2[2]', 'b2[0]', 'op:matvec2', 'W2a1', 'op:add2', 'z2']),
  yhat: group(['op:sigmoid', 'ŷ']),
  L: group(['op:bce', 'y[0]', 'L', 'ŷ']),
  W: group(['op:update', ...PARAM_IDS]),
}

/** Группы 13 шагов ленты (индекс 0–12 = opMeta; подсветка активной op). */
export const STEP_GROUPS: readonly NodeGroup[] = [
  group(['op:matvec[0]', 'op:matvec[1]', 'op:matvec[2]', 'W1x[0]', 'W1x[1]', 'W1x[2]']),
  group(['op:add[0]', 'op:add[1]', 'op:add[2]', 'z1[0]', 'z1[1]', 'z1[2]']),
  group(['op:tanh[0]', 'op:tanh[1]', 'op:tanh[2]', 'a1[0]', 'a1[1]', 'a1[2]']),
  group(['op:matvec2', 'W2a1']),
  group(['op:add2', 'z2']),
  group(['op:sigmoid', 'ŷ']),
  group(['op:bce', 'L']),
  group(['op:bce', 'ŷ', 'L']),
  group(['op:sigmoid', 'z2', 'ŷ']),
  group(['op:matvec2', 'W2a1', 'ŷ']),
  group(['op:tanh[0]', 'op:tanh[1]', 'op:tanh[2]', 'a1[0]', 'a1[1]', 'a1[2]', 'z1[0]', 'z1[1]', 'z1[2]']),
  group(['op:matvec[0]', 'op:matvec[1]', 'op:matvec[2]', 'W1x[0]', 'W1x[1]', 'W1x[2]', 'z1[0]', 'z1[1]', 'z1[2]']),
  group(['op:update', ...PARAM_IDS]),
]
