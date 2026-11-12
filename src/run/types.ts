/**
 * Типы модуля run (D-28б): срезы состояния прогона, экраны и записи истории
 * сессии. Тип-файл — легальная агрегация по A6 (1 модуль + типы).
 *
 * История сессии (01.2-02): SampleRecord на границе сэмпла + StartRecord на
 * старте/сбросе прогона; живёт до reload (reset = перезапуск прогона, D-26).
 */

import type { SegmentId } from '../ui/chainLinks'

export type Mode = 'default' | 'lecture'

/** Выбор звена цепи формулы-хребта (01.2-01): клик по символу формулы. */
export interface LinkSelection {
  segment: SegmentId
  symbol: string
}

/** Экран прогона: walkthrough или экран завершения эпохи (R3). */
export type RunScreen = 'walkthrough' | 'epoch-end'

/** Сводка завершённой эпохи для экрана эпохи и истории обучения (UX-05/UX-06). */
export interface EpochSummaryData {
  epoch: number
  /** L первого сэмпла эпохи («до»). */
  lossBefore: number
  /** L последнего сэмпла эпохи («после»). */
  lossAfter: number
  /** Доля верно классифицированных сэмплов (порог 0.5). */
  accuracy: number
  /** Число верно классифицированных сэмплов. */
  correct: number
}

export interface Drill {
  kind: 'number'
  ref: string
}

/**
 * Запись истории сессии на границе сэмпла (01.2-02): полный срез состояния
 * прогона — вход/метка/узловые числа завершённого сэмпла + плоские 13 весов
 * ПОСЛЕ его SGD-шага. Пишется в общем коде исполнения (инвариант «пошагово
 * = FF» распространяется на историю автоматически).
 */
export interface SampleRecord {
  kind: 'sample'
  runId: number
  epoch: number
  sampleIndex: number
  x: readonly number[]
  y: number
  yhat: number
  loss: number
  correct: boolean
  a1: readonly number[]
  z1: readonly number[]
  z2: readonly number[]
  weights: readonly number[]
}

/** Стартовая запись прогона: веса-константы на старте/сбросе, без чисел сэмпла. */
export interface StartRecord {
  kind: 'start'
  runId: number
  epoch: number
  weights: readonly number[]
}

/** Запись истории сессии: стартовые константы прогона или граница сэмпла. */
export type HistoryRecord = SampleRecord | StartRecord

/** Type-guard записи сэмпла (стартовые записи чисел сэмпла не несут). */
export function isSampleRecord(rec: HistoryRecord): rec is SampleRecord {
  return rec.kind === 'sample'
}
