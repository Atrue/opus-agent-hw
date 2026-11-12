/**
 * История обучения (R3, UX-05/UX-06): чистые построители поверх per-sample
 * истории сессии (SampleRecord на границе сэмпла + стартовые записи прогонов)
 * — стабильные ссылки корня (replace, не мутация — правила R4): зона истории
 * перерисовывается только при изменении своих данных. Числа — снапшоты на
 * границе иммутабельности (R1 §2.2: снапшоты на выходе для истории).
 *
 * 01.2-02: ось графика лосса — сэмплы сессии (reset не стирает историю,
 * прогоны разделены вертикалями); linkHistoryOf — история звена цепи по
 * сэмплам (гранулярность утверждена владельцем).
 */

import type { EpochSummaryData, HistoryRecord, SampleRecord } from './types'
import { isSampleRecord } from './types'
import { SAMPLE_COUNT, XOR_SCENARIO } from './scenario'
import type { SegmentId } from '../ui/chainLinks'

/** Метки плоских весов (порядок среза) — данные спека: series.weight. */
export const WEIGHT_ROWS: readonly string[] = Object.values(XOR_SCENARIO.render.series.weight).flatMap((w) => w.labels)

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
    if (groupRun !== null && groupLen === SAMPLE_COUNT) epochEndXs.push(samples)
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
    x: geometry.epochEndXs[k] ?? (k + 1) * SAMPLE_COUNT,
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

/** Извлечение узлового поля записи (по символу формулы). */
type NodePick = (r: SampleRecord) => readonly number[]

/** Узловые символы — данные спека (series.node): поле SampleRecord (+обёртка скаляра). */
const NODE_SERIES: Record<string, { labels: readonly string[]; pick: NodePick }> = Object.fromEntries(
  Object.entries(XOR_SCENARIO.render.series.node).map(([sym, n]) => [
    sym,
    { labels: n.labels, pick: (r: SampleRecord): readonly number[] => (n.scalar ? [r[n.field] as number] : (r[n.field] as readonly number[])) },
  ]),
)

/** Весовые символы — данные спека (series.weight): срезы плоских весов записи. */
const WEIGHT_SERIES: Record<string, { labels: readonly string[]; from: number; to: number }> = Object.fromEntries(
  Object.entries(XOR_SCENARIO.render.series.weight).map(([sym, w]) => [sym, { labels: w.labels, from: w.from, to: w.to }]),
)

/** Символ звена по умолчанию, если выбор без символа (series.defaultSymbol). */
const SEGMENT_DEFAULT_SYMBOL: Record<SegmentId, string> = { ...XOR_SCENARIO.render.series.defaultSymbol }

/** Ряды плоских весов по записям истории (включая стартовые записи прогонов). */
function weightSeries(history: readonly HistoryRecord[], from: number, to: number, labels: readonly string[]): LinkSeries[] {
  const out: LinkSeries[] = []
  for (let j = from; j < to; j++) {
    const points = history.map((rec) => ({
      runId: rec.runId,
      epoch: rec.epoch,
      sampleIndex: isSampleRecord(rec) ? rec.sampleIndex : -1,
      value: rec.weights[j]!,
    }))
    out.push({ label: labels[j - from]!, points })
  }
  return out
}

/** Ряды узлового поля по записям сэмплов (стартовые записи чисел не несут). */
function nodeSeries(history: readonly HistoryRecord[], pick: NodePick, labels: readonly string[]): LinkSeries[] {
  const out: LinkSeries[] = []
  for (let j = 0; j < labels.length; j++) {
    const points: LinkHistoryPoint[] = []
    for (const rec of history) {
      if (!isSampleRecord(rec)) continue
      points.push({ runId: rec.runId, epoch: rec.epoch, sampleIndex: rec.sampleIndex, value: pick(rec)[j]! })
    }
    out.push({ label: labels[j]!, points })
  }
  return out
}

/**
 * История звена цепи по сэмплам (01.2-02, пункт 4 ТЗ): весовые символы
 * (W1/b1/W2/b2) — компоненты плоских весов записей (стартовая запись прогона
 * даёт стартовые константы ряда), узловые (x, y, z1, a1, z2, ŷ, L, а также
 * плашки tanh/σ по их выходам) — поля записей сэмплов. Звено W (SGD-обновление)
 * — судьба всех 13 весов. Метаданные точек (runId/epoch/sampleIndex) задают
 * разделители эпох и прогонов в UI.
 */
export function linkHistoryOf(
  history: readonly HistoryRecord[],
  segment: SegmentId,
  symbol?: string,
): { series: readonly LinkSeries[] } {
  const sym = symbol ?? SEGMENT_DEFAULT_SYMBOL[segment]
  if (segment === 'W') {
    // SGD масштабирует все 13 весов — история обновления = все веса (UX-06)
    return { series: weightSeries(history, 0, WEIGHT_ROWS.length, WEIGHT_ROWS) }
  }
  const w = WEIGHT_SERIES[sym]
  if (w !== undefined) return { series: weightSeries(history, w.from, w.to, w.labels) }
  const n = NODE_SERIES[sym]
  if (n !== undefined) return { series: nodeSeries(history, n.pick, n.labels) }
  return { series: [] }
}

/** Потолок отображения истории звена — последние ~40 точек (анти-«стена цифр», 01.2-02). */
export const LINK_HISTORY_CAP = 40

/** Последние cap точек ряда + сколько точек скрыто слева («+N раньше»). */
export function capLinkHistory(
  points: readonly LinkHistoryPoint[],
  cap: number = LINK_HISTORY_CAP,
): { shown: readonly LinkHistoryPoint[]; hidden: number } {
  const hidden = Math.max(0, points.length - cap)
  return { shown: points.slice(hidden), hidden }
}

