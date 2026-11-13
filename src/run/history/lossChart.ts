/**
 * График лосса (UX-05; перенос из history.ts телом, D-34): геометрия данных
 * на единой оси сэмплов сессии из точек лосса текущей эпохи и сводок
 * завершённых эпох.
 */

import type { EpochSummaryData } from '../types'
import { sampleCount } from './series'
import type { SessionGeometry } from './session'

export interface LossPoint {
  x: number
  y: number
}

export interface LossChartData {
  /** Линия лосса текущей эпохи (по сэмплам, от базы сессии). */
  line: readonly LossPoint[]
  /** Точки завершённых эпох (lossAfter на накопительной границе сессии). */
  dots: readonly LossPoint[]
  /** x-позиции вертикальных разделителей прогонов (сэмплы сессии). */
  runBounds: readonly number[]
  yMin: number
  yMax: number
}

/**
 * Геометрия графика лосса на единой оси сэмплов сессии: точка завершённой
 * эпохи стоит на её накопительной позиции (не (k+1)·SAMPLE_COUNT — сбросы
 * сдвигают ось), линия текущей эпохи продолжает вправо от базы сессии,
 * границы прогонов (runBounds) рисуются вертикальными разделителями.
 */
export function buildLossChartData(
  lossPoints: readonly number[],
  summaries: readonly EpochSummaryData[],
  geometry: SessionGeometry,
): LossChartData {
  const dots: LossPoint[] = summaries.map((s, k) => ({
    x: geometry.epochEndXs[k] ?? (k + 1) * sampleCount(),
    y: s.lossAfter,
  }))
  const base = geometry.samplesBefore
  const line: LossPoint[] = lossPoints.map((y, i) => ({ x: base + i + 1, y }))
  const ys = [...dots.map((p) => p.y), ...line.map((p) => p.y)]
  if (ys.length === 0) return { line, dots, runBounds: geometry.runBounds, yMin: 0, yMax: 0 }
  return {
    line,
    dots,
    runBounds: geometry.runBounds,
    yMin: Math.min(...ys),
    yMax: Math.max(...ys),
  }
}
