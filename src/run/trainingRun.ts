/**
 * Класс TrainingRun (D-28б): политика прогона forward-only (R3) — эпохи,
 * fast-forward, reset и история сессии; событийный корень на Set-listeners
 * + version-счётчик (R4: мутации весов в Float64Array публикуются счётчиком,
 * селекторы возвращают примитивы/стабильные ссылки). advance() исполняет
 * следующую операцию ЖИВОГО движка (record:true) и кладёт StepRecord.
 */

import { MLP, OPS_PER_SAMPLE, SampleCursor, type StepRecord } from '../tensor'
import { SAMPLE_COUNT, XOR_SCENARIO } from './scenario'
import type { SegmentId } from '../ui/chainLinks'
import { buildStepRecord, firstOpValue, flatWeights } from './stepRecords'
import type { Drill, EpochSummaryData, HistoryRecord, LinkSelection, Mode, RunScreen } from './types'

type Listener = () => void

export class TrainingRun {
  readonly scenario = XOR_SCENARIO
  model: MLP
  epoch = 1
  sampleIndex = 0
  /** Счётчик мутаций: веса — Float64Array, Object.is их не видит (R4 §6.2). */
  version = 0
  drill: Drill | null = null
  /** Выбранное звено цепи (01.2-01): независимо от шага и drill. */
  selection: LinkSelection | null = null
  mode: Mode = 'default'
  currentRecord: StepRecord | null = null
  /** Экран прогона: после последней операции эпохи — 'epoch-end' (R3). */
  screen: RunScreen = 'walkthrough'
  /** Лосс-точки текущей эпохи (по одной на bce-опу сэмпла; replace — R4). */
  epochLossPoints: readonly number[] = []
  /** Ключевые числа операций текущего сэмпла (лента шагов, D-25; replace — R4).
   *  Пишутся в обоих режимах — после fast-forward лента завершённого сэмпла
   *  заполнена теми же числами, что и после пошагового прохода. */
  sampleOpValues: readonly number[] = []
  /** Признак верной классификации каждого сэмпла текущей эпохи (порог 0.5). */
  epochCorrect: readonly boolean[] = []
  /** Сводки завершённых эпох (L до/после, точность). */
  completedEpochs: readonly EpochSummaryData[] = []
  /** Номер прогона (01.2-02): инкремент в reset() — история переживает сброс. */
  runId = 1
  /** История сессии (01.2-02): стартовые записи прогонов + SampleRecord на
   *  каждой границе сэмпла; живёт до reload (reset не чистит, replace — R4). */
  sampleHistory: readonly HistoryRecord[] = []
  private cursor: SampleCursor
  /** Recorder-флаг (R1): onOp-колбэк курсора пишет StepRecord только в true. */
  private recording = true
  private readonly listeners = new Set<Listener>()

  constructor() {
    this.model = new MLP(XOR_SCENARIO.startWeights)
    this.cursor = this.newCursor(0)
    // стартовые константы — первая запись истории
    this.appendStartRecord()
  }

  /** Номер следующей операции в сэмпле, 1-based (курсор индикатора R3);
   *  на завершённом сэмпле (экран эпохи) — 13, без «шага 14». */
  get stepInSample(): number {
    return Math.min(this.cursor.opIndex + 1, OPS_PER_SAMPLE)
  }

  /** Курсор активного сэмпла — живые входы/метка для drill-down. */
  get activeCursor(): SampleCursor {
    return this.cursor
  }

  /** Исполняет следующую операцию движка; record:true пишет StepRecord
   *  (пошаговый режим), record:false — пакетный fast-forward. Код исполнения
   *  один (cursor.advance()) — числа идентичны в обоих режимах (R3). */
  private execOp(record: boolean): void {
    const cursor = this.cursor
    const op = cursor.opIndex
    this.recording = record
    // onOp-рекордер пишет currentRecord только при recording
    cursor.advance()
    if (op === 6) {
      // лосс-точка сэмпла пишется на его bce-опе — в любом режиме (R3)
      this.epochLossPoints = [...this.epochLossPoints, cursor.tensors.L!.data[0]!]
      const yhat = cursor.tensors.yhat!.data[0]!
      const y = cursor.y.data[0]!
      this.epochCorrect = [...this.epochCorrect, (yhat >= 0.5) === (y >= 0.5)]
    }
    if (op === OPS_PER_SAMPLE - 1) {
      // граница сэмпла (sgd-опа, курсор done): запись истории — ЕДИНАЯ для
      // пошагового и FF режимов (общий код исполнения → числа идентичны, R3)
      const t = cursor.tensors
      this.sampleHistory = [
        ...this.sampleHistory,
        {
          kind: 'sample',
          runId: this.runId,
          epoch: this.epoch,
          sampleIndex: this.sampleIndex,
          x: Array.from(cursor.x.data),
          y: cursor.y.data[0]!,
          yhat: t.yhat!.data[0]!,
          loss: t.L!.data[0]!,
          correct: (t.yhat!.data[0]! >= 0.5) === (cursor.y.data[0]! >= 0.5),
          a1: Array.from(t.a1!.data),
          z1: Array.from(t.z1!.data),
          z2: Array.from(t.z2!.data),
          weights: flatWeights(this.model),
        },
      ]
    }
  }

  /** Исполняет следующую операцию (record:true); на границе сэмплов меняет
   *  курсор, на границе эпохи открывает экран завершения эпохи (R3). */
  advance(): void {
    if (this.screen === 'epoch-end') {
      this.startNextEpoch()
      return
    }
    this.execOp(true)
    this.drill = null
    this.afterOpBoundary()
    this.version += 1
    this.emit()
  }

  /** Fast-forward «Запустить эпоху ⏩»: весь остаток эпохи пакетно с
   *  record:false (тот же код исполнения, что advance()) и экран эпохи. */
  runEpoch(): void {
    if (this.screen === 'epoch-end') return
    while (!this.cursor.done) this.execOp(false)
    while (this.sampleIndex + 1 < SAMPLE_COUNT) {
      this.sampleIndex += 1
      this.cursor = this.newCursor(this.sampleIndex)
      while (!this.cursor.done) this.execOp(false)
    }
    this.recording = true
    this.drill = null
    this.finalizeEpoch()
    this.version += 1
    this.emit()
  }

  /** Граница сэмпла/эпохи после исполнения операции пошагово. */
  private afterOpBoundary(): void {
    if (!this.cursor.done) return
    const next = this.sampleIndex + 1
    if (next >= SAMPLE_COUNT) {
      // экран завершения эпохи — продолжение по advance()
      this.finalizeEpoch()
    } else {
      this.sampleIndex = next
      this.cursor = this.newCursor(next)
      this.sampleOpValues = []
    }
  }

  /** Сводка эпохи + переход на экран эпохи. */
  private finalizeEpoch(): void {
    const points = this.epochLossPoints
    const correct = this.epochCorrect.filter((c) => c).length
    this.completedEpochs = [
      ...this.completedEpochs,
      {
        epoch: this.epoch,
        lossBefore: points[0]!,
        lossAfter: points[points.length - 1]!,
        accuracy: correct / this.epochCorrect.length,
        correct,
      },
    ]
    this.screen = 'epoch-end'
  }

  /** Экран эпохи → следующая эпоха: счётчик +1, курсор на первой операции. */
  private startNextEpoch(): void {
    this.epoch += 1
    this.sampleIndex = 0
    this.cursor = this.newCursor(0)
    this.screen = 'walkthrough'
    this.epochLossPoints = []
    this.epochCorrect = []
    this.currentRecord = null
    this.sampleOpValues = []
    this.drill = null
    this.version += 1
    this.emit()
  }

  /** Перезапуск прогона (01.2-02, пункт 6 ТЗ): позиция/модель/текущая эпоха —
   *  с чистого листа (стартовые константы, шаг 1), но история сессии
   *  (sampleHistory, completedEpochs) живёт до reload; runId+1 разделяет
   *  прогоны на графике лосса и в истории звена. */
  reset(): void {
    this.runId += 1
    this.model = new MLP(XOR_SCENARIO.startWeights)
    this.epoch = 1
    this.sampleIndex = 0
    this.cursor = this.newCursor(0)
    this.currentRecord = null
    this.screen = 'walkthrough'
    this.epochLossPoints = []
    this.epochCorrect = []
    this.sampleOpValues = []
    this.appendStartRecord()
    this.drill = null
    this.version += 1
    this.emit()
  }

  /** Стартовая запись прогона: плоские стартовые константы (без чисел сэмпла). */
  private appendStartRecord(): void {
    this.sampleHistory = [
      ...this.sampleHistory,
      { kind: 'start', runId: this.runId, epoch: this.epoch, weights: flatWeights(this.model) },
    ]
  }

  openDrill(ref: string): void {
    this.drill = { kind: 'number', ref }
    this.version += 1
    this.emit()
  }

  closeDrill(): void {
    this.drill = null
    this.version += 1
    this.emit()
  }

  /** Выбор звена формулы-хребта (01.2-01); reset()/advance()/drill его
   *  не трогают — навигация «формула ↔ схема» живёт независимо от шага. */
  selectLink(segment: SegmentId, symbol: string): void {
    this.selection = { segment, symbol }
    this.version += 1
    this.emit()
  }

  clearLink(): void {
    if (this.selection === null) return
    this.selection = null
    this.version += 1
    this.emit()
  }

  toggleMode(): void {
    this.mode = this.mode === 'default' ? 'lecture' : 'default'
    this.version += 1
    this.emit()
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }

  private newCursor(sampleIndex: number): SampleCursor {
    const sample = XOR_SCENARIO.samples[sampleIndex]!
    return new SampleCursor(this.model, sample.x, sample.y, XOR_SCENARIO.lr, (cursor, op) => {
      // Record строится всегда: ленте шагов нужно число операции в обоих
      // режимах; полный StepRecord публикуется только в пошаговом (R1).
      // Копии маленьких массивов — пренебрежимая цена против второго
      // дублирования маппинга op→тензор.
      const record = buildStepRecord(cursor, op)
      const values = [...this.sampleOpValues]
      values[op] = firstOpValue(record)
      this.sampleOpValues = values
      if (this.recording) this.currentRecord = record
    })
  }
}
