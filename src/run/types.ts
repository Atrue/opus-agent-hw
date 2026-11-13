/**
 * Типы модуля run (D-28б): срезы состояния прогона, экраны и записи истории
 * сессии. Тип-файл — легальная агрегация по A6 (1 модуль + типы).
 *
 * История сессии (01.2-02): SampleRecord на границе сэмпла + StartRecord на
 * старте/сбросе прогона; живёт до reload (reset = перезапуск прогона, D-26).
 *
 * SegmentId (D-34, 02-11): идентификатор звена живёт в run-слое — закрыта
 * слой-инверсия run→ui (ui/chain* импортирует отсюда).
 */

/** Идентификатор звена цепи формулы-хребта — строка спека (render.segments[].id). */
export type SegmentId = string

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
 * прогона — вход/метка/узловые числа завершённого сэмпла + плоские веса
 * ПОСЛЕ его SGD-шага. Пишется в общем коде исполнения (инвариант «пошагово
 * = FF» распространяется на историю автоматически). Узловые числа — по
 * символам слоёв спека (render.layerSymbols): XOR z1/a1/z2/ŷ, neuron z/ŷ.
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
  /** Узловые числа по символам слоёв спека (z/h per layer). */
  nodes: Readonly<Record<string, readonly number[]>>
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
