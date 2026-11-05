/**
 * История обучения (R3, UX-05/UX-06): данные графика лосса и таблицы весов
 * поверх прогона — чистые построители над стабильными ссылками корня
 * (replace, не мутация — правила R4): зона истории перерисовывается только
 * при изменении своих данных. Числа — снапшоты на границе иммутабельности
 * (R1 §2.2: снапшоты на выходе для истории/таблицы весов).
 */

import type { EpochSummaryData, HistoryRecord, SampleRecord } from './runState'
import { SAMPLE_COUNT } from './scenario'
import type { SegmentId } from '../ui/chainLinks'

/** Метки 13 строк таблицы весов — порядок плоского снапшота (row-major):
 *  W1 (6), b1 (3), W2 (3), b2 (1). */
export const WEIGHT_ROWS: readonly string[] = [
  'W1[0,0]',
  'W1[0,1]',
  'W1[1,0]',
  'W1[1,1]',
  'W1[2,0]',
  'W1[2,1]',
  'b1[0]',
  'b1[1]',
  'b1[2]',
  'W2[0,0]',
  'W2[0,1]',
  'W2[0,2]',
  'b2[0]',
]

export interface LossPoint {
  x: number
  y: number
}

export interface LossChartData {
  /** Линия лосса текущей эпохи (по сэмплам). */
  line: readonly LossPoint[]
  /** Точки завершённых эпох (lossAfter на границе эпохи). */
  dots: readonly LossPoint[]
  yMin: number
  yMax: number
}

/**
 * Геометрия графика лосса на единой оси сэмплов прогона: точка завершённой
 * эпохи k стоит на позиции (k+1)·SAMPLE_COUNT, линия текущей эпохи продолжает
 * вправо от последней границы (прогресс обучения виден без смены шкалы).
 */
export function buildLossChartData(
  lossPoints: readonly number[],
  summaries: readonly EpochSummaryData[],
): LossChartData {
  const dots: LossPoint[] = summaries.map((s, k) => ({ x: (k + 1) * SAMPLE_COUNT, y: s.lossAfter }))
  const base = summaries.length * SAMPLE_COUNT
  const line: LossPoint[] = lossPoints.map((y, i) => ({ x: base + i + 1, y }))
  const ys = [...dots.map((p) => p.y), ...line.map((p) => p.y)]
  if (ys.length === 0) return { line, dots, yMin: 0, yMax: 0 }
  return { line, dots, yMin: Math.min(...ys), yMax: Math.max(...ys) }
}

export interface WeightsTableRow {
  label: string
  values: readonly number[]
}

export interface WeightsTableData {
  /** Заголовки столбцов: 0 = стартовые константы, 1..N = границы эпох. */
  epochs: readonly number[]
  rows: readonly WeightsTableRow[]
}

/** Модель таблицы весов (UX-06): строки = 13 весов, столбцы = снапшоты эпох. */
export function buildWeightsTable(snapshots: readonly (readonly number[])[]): WeightsTableData {
  const epochs = snapshots.map((_, i) => i)
  const rows = WEIGHT_ROWS.map((label, r) => ({
    label,
    values: snapshots.map((snap) => snap[r]!),
  }))
  return { epochs, rows }
}

/** Точка истории звена: значение на границе сэмпла с метаданными сессии. */
export interface LinkHistoryPoint {
  runId: number
  epoch: number
  /** −1 у стартовой записи прогона (до первого сэмпла). */
  sampleIndex: number
  value: number
}

/** Ряд истории одного числа звена (компоненты многомерных символов). */
export interface LinkSeries {
  label: string
  points: readonly LinkHistoryPoint[]
}

/**
 * История звена цепи по сэмплам (01.2-02): весовые символы (W1/b1/W2/b2) —
 * компоненты плоских весов записей (включая стартовые), узловые (x, y, z1,
 * a1, z2, ŷ, L) — поля записей сэмплов; звено W (SGD) — все 13 весов.
 * (RED-скелет: заполнение рядов — в GREEN-коммите плана 01.2-02.)
 */
export function linkHistoryOf(
  _history: readonly HistoryRecord[],
  _segment: SegmentId,
  _symbol?: string,
): { series: readonly LinkSeries[] } {
  return { series: [] }
}

/** Накопленная геометрия сессии для графика лосса (01.2-02). */
export interface SessionGeometry {
  /** Границы прогонов: накопленное число сэмплов до начала каждого прогона
   *  (кроме первого) — вертикальные разделители на графике. */
  runBounds: readonly number[]
  /** x-позиция последнего сэмпла каждой завершённой эпохи (порядок сводок). */
  epochEndXs: readonly number[]
  /** Всего сэмплов сессии. */
  samples: number
  /** Сэмплов сессии до первого сэмпла текущей эпохи (база линии). */
  samplesBefore: number
}

/**
 * Геометрия сессии из sampleHistory: разделители прогонов, позиции концов
 * завершённых эпох (полные группы сэмплов), база линии текущей эпохи.
 * (RED-скелет: заполнение — в GREEN-коммите плана 01.2-02.)
 */
export function sessionGeometryOf(
  _history: readonly HistoryRecord[],
  _summaryCount: number,
  _currentRun?: { runId: number; epoch: number },
): SessionGeometry {
  return { runBounds: [], epochEndXs: [], samples: 0, samplesBefore: 0 }
}
