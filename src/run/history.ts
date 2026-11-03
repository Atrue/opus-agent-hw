/**
 * История обучения (R3, UX-05/UX-06): данные графика лосса и таблицы весов
 * поверх прогона — чистые построители над стабильными ссылками корня
 * (replace, не мутация — правила R4): зона истории перерисовывается только
 * при изменении своих данных. Числа — снапшоты на границе иммутабельности
 * (R1 §2.2: снапшоты на выходе для истории/таблицы весов).
 */

import type { EpochSummaryData } from './runState'
import { SAMPLE_COUNT } from './scenario'

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
