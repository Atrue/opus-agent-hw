/**
 * История звена цепи по сэмплам (01.2-02, пункт 4 ТЗ; перенос из history.ts
 * телом, D-34): весовые символы (W/b) — компоненты плоских весов записей,
 * узловые (x, y, z, ŷ, L) — поля записей сэмплов; звено W (SGD-обновление) —
 * судьба всех весов. Потолок отображения — анти-«стена цифр».
 */

import { isSampleRecord, type HistoryRecord, type SegmentId } from '../types'
import { SERIES } from './series'
import type { NodePick } from './types'

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
 * (W/b — символы слоёв спека) — компоненты плоских весов записей (стартовая
 * запись прогона даёт стартовые константы ряда), узловые (x, y, z, ŷ, L) —
 * поля записей сэмплов. Звено W (SGD-обновление) — судьба всех весов.
 * Метаданные точек (runId/epoch/sampleIndex) задают разделители эпох и
 * прогонов в UI.
 */
export function linkHistoryOf(
  history: readonly HistoryRecord[],
  segment: SegmentId,
  symbol?: string,
  series: { node: Record<string, { labels: readonly string[]; pick: NodePick }>; weight: Record<string, { labels: readonly string[]; from: number; to: number }>; defaultSymbol: Record<SegmentId, string>; weightRows: readonly string[] } = SERIES,
): { series: readonly LinkSeries[] } {
  const sym = symbol ?? series.defaultSymbol[segment]
  if (segment === 'W') {
    // SGD масштабирует все веса — история обновления = все веса (UX-06)
    return { series: weightSeries(history, 0, series.weightRows.length, series.weightRows) }
  }
  const w = series.weight[sym]
  if (w !== undefined) return { series: weightSeries(history, w.from, w.to, w.labels) }
  const n = series.node[sym]
  if (n !== undefined) return { series: nodeSeries(history, n.pick, n.labels) }
  return { series: [] }
}

/** Потолок отображения истории звена — последние ~40 точек (анти-«стена цифр», 01.2-02). */
const LINK_HISTORY_CAP = 40

/** Последние cap точек ряда + сколько точек скрыто слева («+N раньше»). */
export function capLinkHistory(
  points: readonly LinkHistoryPoint[],
  cap: number = LINK_HISTORY_CAP,
): { shown: readonly LinkHistoryPoint[]; hidden: number } {
  const hidden = Math.max(0, points.length - cap)
  return { shown: points.slice(hidden), hidden }
}
