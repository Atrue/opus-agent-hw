/**
 * Корень прогона (R4): класс TrainingRun — модульный синглтон `run`, чистый TS
 * + Set-listeners (никаких реактивных базовых классов); useRunSlice поверх
 * useSyncExternalStore — селективные перерисовки через Object.is на срезе
 * (селекторы возвращают примитивы/стабильные ссылки; мутации весов в Float64Array
 * публикуются счётчиком version). window.__run = run — DevTools-прозрачность.
 *
 * Прогон forward-only (R3): advance() исполняет следующую операцию ЖИВОГО
 * движка (record:true) и кладёт StepRecord; эпохи бесконечны; reset() —
 * детерминированный старт из констант сценария. buildStepRecord — снимок
 * операции в форму шага прототипа (schemaVersion 1).
 */

import { useSyncExternalStore } from 'react'
import { gradIo, MLP, OPS_PER_SAMPLE, SampleCursor, tensorIo, type Phase, type StepRecord, type Tensor, type TensorIo } from '../tensor'
import { SAMPLE_COUNT, XOR_SCENARIO } from './scenario'

export type Mode = 'default' | 'lecture'

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

const PROV_WEIGHT = 'вес модели (стартовые константы сценария)'
const PROV_INPUT = 'входные данные — граница графа'
const PROV_TARGET = 'метка — граница графа'
const PROV_LR = 'гиперпараметр SGD'

function stepProv(opIndex: number): string {
  return `шаг ${String(opIndex + 1)} (${XOR_SCENARIO.opMeta[opIndex]!.op})`
}

function scalarIo(sym: string, values: readonly number[], provenance?: string): TensorIo {
  const io: TensorIo = { sym, shape: [values.length], values: [...values] }
  if (provenance !== undefined) io.provenance = provenance
  return io
}

/** Снимок градиента вектора [n] как number[] (t.grad уже вычислен). */
function gradVec(t: Tensor): number[] {
  if (t.grad === null) throw new Error(`gradVec: у тензора [${t.shape.join(',')}] нет градиента`)
  return Array.from(t.grad)
}

/** Плоские 13 весов модели в порядке снапшота: W1 (6), b1 (3), W2 (3), b2 (1). */
function flatWeights(m: MLP): number[] {
  return [...Array.from(m.W1.data), ...Array.from(m.b1.data), ...Array.from(m.W2.data), ...Array.from(m.b2.data)]
}

/**
 * Снимок выполненной операции opIndex в StepRecord: входы/выходы/градиенты
 * копируются из живых тензоров курсора в момент записи (заморозка чисел —
 * поздний opt.step() не испортит историю, R1 §2.2).
 */
export function buildStepRecord(cursor: SampleCursor, opIndex: number): StepRecord {
  const meta = XOR_SCENARIO.opMeta[opIndex]!
  const t = cursor.tensors
  const m = cursor.model
  const base = {
    index: opIndex,
    op: meta.op,
    layer: meta.layer,
    phase: meta.phase,
    formula: meta.formula,
    narrative: { ru: meta.narrative },
  }
  switch (opIndex) {
    case 0:
      return {
        ...base,
        inputs: [tensorIo('W1', m.W1, PROV_WEIGHT), tensorIo('x', cursor.x, PROV_INPUT)],
        outputs: tensorIo('z1', t.z1p!),
        grads: null,
        changed: ['z1'],
      }
    case 1:
      return {
        ...base,
        inputs: [tensorIo('z1', t.z1p!, stepProv(0)), tensorIo('b1', m.b1, PROV_WEIGHT)],
        outputs: tensorIo('z1', t.z1!),
        grads: null,
        changed: ['z1'],
      }
    case 2:
      return {
        ...base,
        inputs: [tensorIo('z1', t.z1!, stepProv(1))],
        outputs: tensorIo('a1', t.a1!),
        grads: null,
        changed: ['a1'],
      }
    case 3:
      return {
        ...base,
        inputs: [tensorIo('W2', m.W2, PROV_WEIGHT), tensorIo('a1', t.a1!, stepProv(2))],
        outputs: tensorIo('z2', t.z2p!),
        grads: null,
        changed: ['z2'],
      }
    case 4:
      return {
        ...base,
        inputs: [tensorIo('z2', t.z2p!, stepProv(3)), tensorIo('b2', m.b2, PROV_WEIGHT)],
        outputs: tensorIo('z2', t.z2!),
        grads: null,
        changed: ['z2'],
      }
    case 5:
      return {
        ...base,
        inputs: [tensorIo('z2', t.z2!, stepProv(4))],
        outputs: tensorIo('ŷ', t.yhat!),
        grads: null,
        changed: ['yhat'],
      }
    case 6:
      return {
        ...base,
        inputs: [tensorIo('ŷ', t.yhat!, stepProv(5)), tensorIo('y', cursor.y, PROV_TARGET)],
        outputs: tensorIo('L', t.L!),
        grads: null,
        changed: ['L'],
      }
    case 7: {
      const dyhat = gradVec(t.yhat!)
      return {
        ...base,
        inputs: [tensorIo('ŷ', t.yhat!, stepProv(5)), tensorIo('y', cursor.y, PROV_TARGET)],
        outputs: scalarIo('∂L/∂ŷ', dyhat),
        grads: { '∂L/∂ŷ': dyhat },
        changed: ['dyhat'],
      }
    }
    case 8: {
      const dz2 = gradVec(t.z2!)
      return {
        ...base,
        inputs: [scalarIo('∂L/∂ŷ', gradVec(t.yhat!), stepProv(7))],
        outputs: scalarIo('∂L/∂z2', dz2),
        grads: { '∂L/∂z2': dz2 },
        changed: ['dz2'],
      }
    }
    case 9: {
      const dW2 = gradIo('∂L/∂W2', m.W2)
      return {
        ...base,
        inputs: [scalarIo('∂L/∂z2', gradVec(t.z2!), stepProv(8)), tensorIo('a1', t.a1!, stepProv(2))],
        outputs: { sym: '∂L/∂W2', shape: [1, 3], values: dW2 },
        grads: {
          '∂L/∂W2': dW2,
          '∂L/∂b2': gradVec(m.b2),
          '∂L/∂a1': gradVec(t.a1!),
        },
        changed: ['dW2', 'db2', 'da1'],
      }
    }
    case 10: {
      const dz1 = gradVec(t.z1!)
      return {
        ...base,
        inputs: [scalarIo('∂L/∂a1', gradVec(t.a1!), stepProv(9))],
        outputs: scalarIo('∂L/∂z1', dz1),
        grads: { '∂L/∂z1': dz1 },
        changed: ['dz1'],
      }
    }
    case 11: {
      const dW1 = gradIo('∂L/∂W1', m.W1)
      return {
        ...base,
        inputs: [scalarIo('∂L/∂z1', gradVec(t.z1!), stepProv(10)), tensorIo('x', cursor.x, PROV_INPUT)],
        outputs: { sym: '∂L/∂W1', shape: [3, 2], values: dW1 },
        grads: {
          '∂L/∂W1': dW1,
          '∂L/∂b1': gradVec(m.b1),
          '∂L/∂x': gradVec(cursor.x),
        },
        changed: ['dW1', 'db1', 'dx'],
      }
    }
    case 12: {
      const before = cursor.sgdBefore ?? m.W2.data[0]!
      return {
        ...base,
        inputs: [
          scalarIo('W2[0,0]', [before], PROV_WEIGHT),
          scalarIo('∂L/∂W2[0,0]', [m.W2.grad![0]!], stepProv(9)),
          scalarIo('η', [cursor.lr], PROV_LR),
        ],
        outputs: scalarIo('W2[0,0]', [before, m.W2.data[0]!]),
        grads: null,
        changed: ['W'],
      }
    }
    default:
      throw new Error(`buildStepRecord: неизвестная операция ${String(opIndex)}`)
  }
}

/** Текущая фаза для бейджа (до первого шага — фаза предстоящей операции). */
export function currentPhase(record: StepRecord | null): Phase {
  return record?.phase ?? XOR_SCENARIO.opMeta[0]!.phase
}

type Listener = () => void

export class TrainingRun {
  readonly scenario = XOR_SCENARIO
  model: MLP
  epoch = 1
  sampleIndex = 0
  /** Счётчик мутаций: веса — Float64Array, Object.is их не видит (R4 §6.2). */
  version = 0
  drill: Drill | null = null
  mode: Mode = 'default'
  currentRecord: StepRecord | null = null
  /** Экран прогона: после последней операции эпохи — 'epoch-end' (R3). */
  screen: RunScreen = 'walkthrough'
  /** Лосс-точки текущей эпохи (по одной на bce-опу сэмпла; replace — R4). */
  epochLossPoints: readonly number[] = []
  /** Признак верной классификации каждого сэмпла текущей эпохи (порог 0.5). */
  epochCorrect: readonly boolean[] = []
  /** Сводки завершённых эпох (L до/после, точность). */
  completedEpochs: readonly EpochSummaryData[] = []
  /** Снапшоты плоских 13 весов: [0] = стартовые константы, далее границы эпох. */
  weightSnapshots: readonly number[][] = []
  private cursor: SampleCursor
  /** Recorder-флаг (R1): onOp-колбэк курсора пишет StepRecord только в true. */
  private recording = true
  private readonly listeners = new Set<Listener>()

  constructor() {
    this.model = new MLP(XOR_SCENARIO.startWeights)
    this.cursor = this.newCursor(0)
    this.weightSnapshots = [flatWeights(this.model)] // эпоха 0 = стартовые константы
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
    cursor.advance() // onOp-рекордер пишет currentRecord только при recording
    if (op === 6) {
      // лосс-точка сэмпла пишется на его bce-опе — в любом режиме (R3)
      this.epochLossPoints = [...this.epochLossPoints, cursor.tensors.L!.data[0]!]
      const yhat = cursor.tensors.yhat!.data[0]!
      const y = cursor.y.data[0]!
      this.epochCorrect = [...this.epochCorrect, (yhat >= 0.5) === (y >= 0.5)]
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
      this.finalizeEpoch() // экран завершения эпохи — продолжение по advance()
    } else {
      this.sampleIndex = next
      this.cursor = this.newCursor(next)
    }
  }

  /** Сводка эпохи + снапшот весов на границе + переход на экран эпохи. */
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
    this.weightSnapshots = [...this.weightSnapshots, flatWeights(this.model)]
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
    this.drill = null
    this.version += 1
    this.emit()
  }

  /** Детерминированный старт: модель из констант сценария, курсор на шаге 1. */
  reset(): void {
    this.model = new MLP(XOR_SCENARIO.startWeights)
    this.epoch = 1
    this.sampleIndex = 0
    this.cursor = this.newCursor(0)
    this.currentRecord = null
    this.screen = 'walkthrough'
    this.epochLossPoints = []
    this.epochCorrect = []
    this.completedEpochs = []
    this.weightSnapshots = [flatWeights(this.model)]
    this.drill = null
    this.version += 1
    this.emit()
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
      if (this.recording) this.currentRecord = buildStepRecord(cursor, op)
    })
  }
}

/** Модульный синглтон — единственный реактивный корень прогона (R4). */
export const run = new TrainingRun()

declare global {
  interface Window {
    __run?: TrainingRun
  }
}

if (typeof window !== 'undefined') window.__run = run

/** Селекторный хук: срезы — примитивы/стабильные ссылки, Object.is (R4 §6). */
export function useRunSlice<T>(sel: (r: TrainingRun) => T): T {
  return useSyncExternalStore(run.subscribe, () => sel(run))
}
