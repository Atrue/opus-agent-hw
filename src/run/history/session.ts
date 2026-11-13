/**
 * Накопительная геометрия сессии для графика лосса (01.2-02; перенос из
 * history.ts телом, D-34): границы прогонов, точки завершённых эпох, база
 * линии текущей эпохи + метки плоских весов активного сценария.
 */

import { isSampleRecord, type HistoryRecord } from '../types'
import { sampleCount, seriesOf } from './series'

/** Метки плоских весов активного сценария (порядок среза) — series.weight. */
export const WEIGHT_ROWS: readonly string[] = seriesOf().weightRows

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
 * Геометрия сессии из sampleHistory: эпоха завершена ⇔ её группа сэмплов
 * (runId, epoch) насчитывает SAMPLE_COUNT записей — тогда её последняя
 * x-позиция идёт в epochEndXs (порядок соответствует completedEpochs).
 * Граница прогона — смена runId между соседними записями сэмплов.
 */
export function sessionGeometryOf(
  history: readonly HistoryRecord[],
  _summaryCount: number,
  currentRun?: { runId: number; epoch: number },
): SessionGeometry {
  const runBounds: number[] = []
  const epochEndXs: number[] = []
  let samples = 0
  let currentRunSamples = 0
  let prevRun: number | null = null
  let groupRun: number | null = null
  let groupEpoch = 0
  let groupLen = 0
  const closeGroup = (): void => {
    // полная группа = завершённая эпоха: её последний сэмпл — точка эпохи
    if (groupRun !== null && groupLen === sampleCount()) epochEndXs.push(samples)
  }
  for (const rec of history) {
    if (!isSampleRecord(rec)) {
      // стартовая запись нового прогона = граница прогона (видна сразу после
      // сброса, до первого сэмпла нового прогона); первая запись — не граница
      if (prevRun !== null) runBounds.push(samples)
      prevRun = null
      continue
    }
    // защита
    if (prevRun !== null && rec.runId !== prevRun) runBounds.push(samples)
    prevRun = rec.runId
    if (rec.runId !== groupRun || rec.epoch !== groupEpoch) {
      closeGroup()
      groupRun = rec.runId
      groupEpoch = rec.epoch
      groupLen = 0
    }
    groupLen += 1
    samples += 1
    if (currentRun !== undefined && rec.runId === currentRun.runId && rec.epoch === currentRun.epoch) {
      currentRunSamples += 1
    }
  }
  closeGroup()
  return {
    runBounds,
    epochEndXs,
    samples,
    samplesBefore: currentRun === undefined ? samples : samples - currentRunSamples,
  }
}
