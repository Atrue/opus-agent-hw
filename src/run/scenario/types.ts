/**
 * Типы сценария = декларативная модель (D-30; перенос из scenario.ts телом,
 * D-34): спек ScenarioModel — единственный источник топологии сети (net),
 * лосса, lr, датасета, стартовых весов, метаданных операций walkthrough
 * (формулы и нарративы RU) и рендер-меток (render: формула-строка, символы
 * слоёв, граф, звенья цепи, серии истории).
 */

import type { LayerSpec, Phase } from '../../tensor'

export interface ScenarioOpMeta {
  op: string
  layer: number
  phase: Phase
  formula: string
  narrative: string
}

/** Рендер-метки слоя (D-30): символы z/h/w/b для формул, панелей и графа. */
export interface LayerSymbols {
  /** Пребиас-значение слоя (z1/z2) и его производные (∂L/∂z1). */
  z: string
  /** Активация слоя (a1 — скрытый, ŷ — выходной). */
  h: string
  /** Матрица весов слоя (W1/W2). */
  w: string
  /** Биас слоя (b1/b2). */
  b: string
}

/** Токен формулы-строки: интерактивный символ или статический текст. */
export type FormulaToken = { kind: 'sym'; sym: string } | { kind: 'text'; text: string }

/** Сегмент формулы-строки с фазной окраской разделителей (D-26). */
export interface FormulaSeg {
  phase: 'forward' | 'loss' | 'update'
  tokens: readonly FormulaToken[]
}

/** Живое число узла графа: откуда рендер берёт значение/градиент (D-30). */
export type NodeBinding =
  | { kind: 'input'; index: number }
  | { kind: 'target' }
  | { kind: 'weight'; layer: number; index: number }
  | { kind: 'bias'; layer: number; index: number }
  /** Слот тензора сэмпла; step — гейт видимости (число доступно, когда
   *  операция шага исполнена в текущем сэмпле). */
  | { kind: 'tensor'; slot: 'zPre' | 'zPost' | 'h' | 'L'; layer: number; index: number; step?: number }
  /** Скалярное произведение строки живых весов на вход слоя (W·x live-весов). */
  | { kind: 'dot'; layer: number; row: number; step: number }

export type RenderNodeKind = 'value' | 'op' | 'update'
export type RenderNodeRole = 'const' | 'param' | 'computed' | 'op'

/** Узел вычислительного графа: топология + геометрия + живые числа. */
export interface RenderNode {
  id: string
  kind: RenderNodeKind
  role: RenderNodeRole
  /** Display-подпись (z1[0] рендерится с субскриптом); для операций — глиф. */
  label: string
  /** Ранг-колонка топологической глубины (0 = входы/параметры). */
  col: number
  /** Строка раскладки (детерминированная таблица). */
  row: number
  /** Живое значение узла (нет — «н/д» всегда, напр. update-станция). */
  value?: NodeBinding
  /** Градиент ∂L/∂· (нет — не показывается). */
  grad?: NodeBinding
  /** Клик: drill-реф числа или выбор звена цепи (сегмент + символ). */
  click?: { drill: string } | { segment: string; symbol: string }
}

/** Ребро графа: операнд → операция → результат; update — параметр → станция. */
export interface RenderEdge {
  from: string
  to: string
  kind?: 'update'
}

/** Звено цепи формулы-хребта: заголовок/формула/символы + геометрия группы. */
export interface RenderSegment {
  id: string
  /** Заголовок звена (RU, символ формулы первым). */
  title: string
  formula: string
  /** Символы формулы-строки, выбирающие это звено. */
  symbols: readonly string[]
  /** Живые числа панели звена. */
  numberSyms: readonly string[]
  /** Узлы группы звена на графе (подсветка выбора). */
  nodes: readonly string[]
  /** Точечные подмножества символа внутри звена (подсветка символа). */
  symbolNodes: Readonly<Record<string, readonly string[]>>
}

/** Откуда узловый ряд берёт числа записи истории. */
export type SeriesNodePick =
  | { kind: 'scalar'; field: 'y' | 'yhat' | 'loss' }
  | { kind: 'record'; field: 'x' }
  | { kind: 'nodes'; node: string }

/** Ряды истории звена: узловые (запись/узлы спека) и весовые (плоский срез). */
export interface RenderSeries {
  node: Readonly<Record<string, { labels: readonly string[]; pick: SeriesNodePick }>>
  weight: Readonly<Record<string, { labels: readonly string[]; from: number; to: number }>>
  /** Символ звена по умолчанию (выбор без символа). */
  defaultSymbol: Readonly<Record<string, string>>
}

/** Рендер-метки сценария (D-30): «часть полей вычисляется рендером». */
export interface ScenarioRender {
  /** Формула-строка: последовательность сегментов с интерактивными символами. */
  formula: readonly FormulaSeg[]
  /** Символы слоёв по индексу слоя (топология → подписи). */
  layerSymbols: readonly LayerSymbols[]
  /** Узлы вычислительного графа (топология + живые числа). */
  nodes: readonly RenderNode[]
  /** Рёбра графа. */
  edges: readonly RenderEdge[]
  /** Группы узлов ленты шагов (по индексу walked-опы). */
  stepGroups: readonly (readonly string[])[]
  /** Звенья цепи формулы-хребта. */
  segments: readonly RenderSegment[]
  /** Ряды истории звена. */
  series: RenderSeries
}

export interface ScenarioModel {
  /** URL #scenario= (url.ts KNOWN_SCENARIOS). */
  id: 'neuron' | 'xor'
  /** RU-заголовок урока — шапка приложения (RU-first, строки в данных спека). */
  title: string
  /** RU-метка датасета — карточка «Примеры» (выборка AND / выборка XOR). */
  datasetLabel: string
  /** Декларативная структура сети — источник топологии. */
  net: readonly LayerSpec[]
  /** Модель + функция потерь в одном объекте (D-30). */
  loss: { kind: 'bce' }
  lr: number
  samples: readonly { x: readonly number[]; y: number }[]
  /** Стартовые веса по слоям: ключи `w1`/`b1`… — 1-based номер слоя. */
  startWeights: Readonly<Record<string, number[][] | number[]>>
  /** Метаданы операций walkthrough: формулы/нарративы RU (длина = walked-опы). */
  ops: readonly ScenarioOpMeta[]
  /** Рендер-метки. */
  render: ScenarioRender
}
