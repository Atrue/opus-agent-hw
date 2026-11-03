/**
 * История обучения (R3, UX-05/UX-06): данные графика лосса и таблицы весов
 * поверх прогона — чистые построители над стабильными ссылками корня
 * (replace, не мутация — правила R4): зона истории перерисовывается только
 * при изменении своих данных. Числа — снапшоты на границе иммутабельности
 * (R1 §2.2: снапшоты на выходе для истории/таблицы весов).
 */

import type { EpochSummaryData } from './runState'
import { SAMPLE_COUNT } from './scenario'

/** Метки 13 строк таблицы весов — порядок плоского снапшота (row-major). */
export const WEIGHT_ROWS: readonly string[] = []

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

export function buildLossChartData(
  lossPoints: readonly number[],
  summaries: readonly EpochSummaryData[],
): LossChartData {
  throw new Error('buildLossChartData: не реализовано (RED)')
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

export function buildWeightsTable(snapshots: readonly (readonly number[])[]): WeightsTableData {
  throw new Error('buildWeightsTable: не реализовано (RED)')
}
