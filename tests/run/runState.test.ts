import { beforeEach, describe, expect, it } from 'vitest'
import { TrainingRun, isSampleRecord, type HistoryRecord, type SampleRecord, type StartRecord } from '../../src/run/runState'
import { XOR_SCENARIO, SAMPLE_COUNT } from '../../src/run/scenario'
import { OPS_PER_SAMPLE } from '../../src/tensor'

/**
 * Корень прогона (R3/R4): курсор (эпоха/пример/шаг), границы сэмпла и эпохи,
 * детерминированный reset, сброс drill при смене операции, лосс-точки на bce.
 *
 * План 01.1-03: эпохи и fast-forward — runEpoch() исполняет остаток эпохи
 * пакетно (record:false), экран завершения эпохи открывается после последней
 * операции эпохи (в любом режиме) и продолжается следующей эпохой — бесконечно.
 * Инвариант: advance()×N === runEpoch() (веса и лосс-точки идентичны).
 *
 * 01.2-02: reset() — перезапуск прогона, а не стирание сессии: sampleHistory
 * и completedEpochs живут до reload. Поэтому каждый тест работает с НОВЫМ
 * экземпляром TrainingRun (reload = честный сброс), а не синглтоном.
 */

const START_W1 = XOR_SCENARIO.startWeights.w1.flat()
const START_FLAT = [
  ...XOR_SCENARIO.startWeights.w1.flat(),
  ...XOR_SCENARIO.startWeights.b1,
  ...XOR_SCENARIO.startWeights.w2.flat(),
  ...XOR_SCENARIO.startWeights.b2,
]

/** Свежий прогон на каждый тест — сессия без истории (семантика reload). */
let run: TrainingRun

beforeEach(() => {
  run = new TrainingRun()
})

/** Плоские веса живой модели в порядке снапшота (W1, b1, W2, b2). */
function flatModelWeights(): number[] {
  return [
    ...Array.from(run.model.W1.data),
    ...Array.from(run.model.b1.data),
    ...Array.from(run.model.W2.data),
    ...Array.from(run.model.b2.data),
  ]
}

/** Запись сэмпла или throw (type-narrowing для ассертов). */
function asSample(rec: HistoryRecord): SampleRecord {
  if (!isSampleRecord(rec)) throw new Error(`ожидалась запись сэмпла, получена ${rec.kind}`)
  return rec
}

/** Стартовая запись или throw. */
function asStart(rec: HistoryRecord): StartRecord {
  if (isSampleRecord(rec)) throw new Error('ожидалась стартовая запись прогона')
  return rec
}

describe('TrainingRun: курсор прогона', () => {
  it('старт: эпоха 1, пример 1, шаг 1, записи ещё нет', () => {
    expect(run.epoch).toBe(1)
    expect(run.sampleIndex).toBe(0)
    expect(run.stepInSample).toBe(1)
    expect(run.currentRecord).toBeNull()
  })

  it('advance() исполняет операцию движка и двигает шаг', () => {
    run.advance()
    expect(run.stepInSample).toBe(2)
    expect(run.currentRecord?.op).toBe('matvec')
    expect(run.currentRecord?.outputs.values).toEqual([-0.9228963213252399, -0.712133557209278, 0.34329352823553405])
    run.advance()
    expect(run.stepInSample).toBe(3)
    expect(run.currentRecord?.op).toBe('add')
  })

  it('пересекает границу сэмпла: 13 операций → пример 2, шаг 1', () => {
    for (let i = 0; i < 13; i++) run.advance()
    expect(run.epoch).toBe(1)
    expect(run.sampleIndex).toBe(1)
    expect(run.stepInSample).toBe(1)
    // последняя запись — sgd; следующая операция уже нового сэмпла
    expect(run.currentRecord?.op).toBe('sgd')
  })

  it('reset() возвращает детерминированный старт: стартовые веса, чистая текущая эпоха, шаг 1', () => {
    for (let i = 0; i < 20; i++) run.advance()
    run.reset()
    expect(run.epoch).toBe(1)
    expect(run.sampleIndex).toBe(0)
    expect(run.stepInSample).toBe(1)
    expect(run.currentRecord).toBeNull()
    expect(run.epochLossPoints).toHaveLength(0)
    expect(Array.from(run.model.W1.data)).toEqual(START_W1)
  })

  it('смена операции сбрасывает drill', () => {
    run.advance()
    run.openDrill('z1[0]')
    expect(run.drill).not.toBeNull()
    run.advance()
    expect(run.drill).toBeNull()
  })

  it('лосс-точка добавляется на bce-опе (7-я операция сэмпла)', () => {
    for (let i = 0; i < 6; i++) run.advance()
    expect(run.epochLossPoints).toHaveLength(0)
    run.advance() // оп 6 — bce
    expect(run.epochLossPoints).toHaveLength(1)
    expect(run.epochLossPoints[0]).toBeCloseTo(0.7097208011495857, 15)
  })

  it('подписка: advance() будит слушателей, отписка снимает', () => {
    let fires = 0
    const unsubscribe = run.subscribe(() => {
      fires += 1
    })
    run.advance()
    expect(fires).toBe(1)
    unsubscribe()
    run.advance()
    expect(fires).toBe(1)
  })
})

describe('TrainingRun: selection звена формулы-хребта (01.2-01)', () => {
  it('selectLink публикует selection и инкрементирует version', () => {
    const v0 = run.version
    run.selectLink('z1', 'W1')
    expect(run.selection).toEqual({ segment: 'z1', symbol: 'W1' })
    expect(run.version).toBe(v0 + 1)
    run.clearLink()
  })

  it('clearLink снимает выбор', () => {
    run.selectLink('z1', 'W1')
    run.clearLink()
    expect(run.selection).toBeNull()
  })

  it('advance() НЕ сбрасывает selection — выбор звена живёт независимо от шага', () => {
    run.selectLink('L', 'L')
    run.advance()
    run.advance()
    expect(run.selection).toEqual({ segment: 'L', symbol: 'L' })
    run.clearLink()
  })

  it('reset() НЕ сбрасывает selection', () => {
    run.selectLink('W', 'η')
    run.reset()
    expect(run.selection).toEqual({ segment: 'W', symbol: 'η' })
    run.clearLink()
  })

  it('drill и selection независимы: openDrill не трогает выбор звена', () => {
    run.selectLink('x', 'x')
    run.advance()
    run.openDrill('z1[0]')
    expect(run.drill).not.toBeNull()
    expect(run.selection).toEqual({ segment: 'x', symbol: 'x' })
    run.clearLink()
    run.closeDrill()
  })
})

describe('TrainingRun: эпохи и fast-forward (R3)', () => {
  it('runEpoch() доводит прогон до экрана завершения эпохи и пишет лосс-точки всех сэмплов', () => {
    run.runEpoch()
    expect(run.screen).toBe('epoch-end')
    expect(run.epoch).toBe(1)
    expect(run.epochLossPoints).toHaveLength(SAMPLE_COUNT)
    // первый сэмпл — эталонный bce вывода движка
    expect(run.epochLossPoints[0]).toBeCloseTo(0.7097208011495857, 15)
    // сводка эпохи: L до = первая точка, L после = последняя
    expect(run.completedEpochs).toHaveLength(1)
    const summary = run.completedEpochs[0]!
    expect(summary.epoch).toBe(1)
    expect(summary.lossBefore).toBe(run.epochLossPoints[0])
    expect(summary.lossAfter).toBe(run.epochLossPoints[SAMPLE_COUNT - 1])
    expect(summary.accuracy).toBeGreaterThanOrEqual(0)
    expect(summary.accuracy).toBeLessThanOrEqual(1)
  })

  it('advance() после экрана эпохи открывает следующую эпоху (счётчик +1, курсор на первой операции)', () => {
    run.runEpoch()
    run.advance()
    expect(run.screen).toBe('walkthrough')
    expect(run.epoch).toBe(2)
    expect(run.sampleIndex).toBe(0)
    expect(run.stepInSample).toBe(1)
    expect(run.epochLossPoints).toHaveLength(0)
    run.advance() // обучение продолжается: эпохи бесконечны
    expect(run.stepInSample).toBe(2)
  })

  it('инвариант: прогон эпохи по-операционно и runEpoch() дают идентичные веса и лосс-точки', () => {
    for (let i = 0; i < SAMPLE_COUNT * OPS_PER_SAMPLE; i++) run.advance()
    const stepwiseWeights = flatModelWeights()
    const stepwisePoints = [...run.epochLossPoints]
    const stepwiseSummary = run.completedEpochs[0]

    run.reset()
    run.runEpoch()
    expect(flatModelWeights()).toEqual(stepwiseWeights)
    expect([...run.epochLossPoints]).toEqual(stepwisePoints)
    expect(run.completedEpochs.at(-1)).toEqual(stepwiseSummary)
    // веса границы эпохи 1 = последняя запись сэмпла истории (per-sample срез)
    const boundary = run.sampleHistory.filter(isSampleRecord).at(-1)!
    expect([...boundary.weights]).toEqual(stepwiseWeights)
  })

  it('пошаговое завершение эпохи открывает экран: 4×13 операций, счётчик эпохи ещё не двинулся', () => {
    for (let i = 0; i < SAMPLE_COUNT * OPS_PER_SAMPLE; i++) run.advance()
    expect(run.screen).toBe('epoch-end')
    expect(run.epoch).toBe(1)
    expect(run.sampleIndex).toBe(SAMPLE_COUNT - 1)
    expect(run.stepInSample).toBe(OPS_PER_SAMPLE)
    expect(run.completedEpochs).toHaveLength(1)
  })

  it('reset() с экрана завершения эпохи: стартовые константы, текущая эпоха чиста, история сессии живёт', () => {
    run.runEpoch()
    expect(run.screen).toBe('epoch-end')
    run.reset()
    expect(run.screen).toBe('walkthrough')
    expect(run.epoch).toBe(1)
    expect(run.epochLossPoints).toHaveLength(0)
    // перезапуск прогона, не стирание сессии (01.2-02, пункт 6 ТЗ)
    expect(run.completedEpochs).toHaveLength(1)
    expect(run.runId).toBe(2)
    expect(run.sampleHistory).toHaveLength(1 + SAMPLE_COUNT + 1)
    expect(flatModelWeights()).toEqual(START_FLAT)
  })

  it('FF с середины эпохи досчитывает только остаток: результат идентичен чистому прогону', () => {
    // чистая пошаговая эпоха 1 — эталон весов
    for (let i = 0; i < SAMPLE_COUNT * OPS_PER_SAMPLE; i++) run.advance()
    const stepwiseWeights = flatModelWeights()
    // смешанный путь: сэмпл 1 полностью + 5 операций сэмпла 2 пошагово, остаток — FF
    run.reset()
    for (let i = 0; i < OPS_PER_SAMPLE + 5; i++) run.advance()
    expect(run.stepInSample).toBe(6)
    run.runEpoch()
    expect(run.screen).toBe('epoch-end')
    expect(run.epochLossPoints).toHaveLength(SAMPLE_COUNT)
    expect(flatModelWeights()).toEqual(stepwiseWeights)
  })
})

describe('TrainingRun: SampleRecord-история сессии (01.2-02)', () => {
  it('(а) полная эпоха: стартовая запись + по одной записи на каждый сэмпл', () => {
    run.runEpoch()
    expect(run.sampleHistory).toHaveLength(1 + SAMPLE_COUNT)
    const start = asStart(run.sampleHistory[0]!)
    expect(start.runId).toBe(1)
    expect(start.epoch).toBe(1)
    expect(start.weights).toEqual(START_FLAT)
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const rec = asSample(run.sampleHistory[i + 1]!)
      expect(rec.runId).toBe(1)
      expect(rec.epoch).toBe(1)
      expect(rec.sampleIndex).toBe(i)
      expect([...rec.x]).toEqual([...XOR_SCENARIO.samples[i]!.x])
      expect(rec.y).toBe(XOR_SCENARIO.samples[i]!.y)
      expect(Number.isFinite(rec.yhat)).toBe(true)
      expect(Number.isFinite(rec.loss)).toBe(true)
      expect(rec.loss).toBe(run.epochLossPoints[i])
      expect(rec.correct).toBe((rec.yhat >= 0.5) === (rec.y >= 0.5))
      expect(rec.a1).toHaveLength(3)
      expect(rec.z1).toHaveLength(3)
      expect(rec.z2).toHaveLength(1)
      expect(rec.weights).toHaveLength(13)
      for (const w of rec.weights) expect(Number.isFinite(w)).toBe(true)
    }
    // первый сэмпл — эталонный bce движка; последний sgd сдвинул веса
    expect(asSample(run.sampleHistory[1]!).loss).toBeCloseTo(0.7097208011495857, 15)
    expect(asSample(run.sampleHistory[SAMPLE_COUNT]!).weights).not.toEqual(START_FLAT)
  })

  it('(б) reset — перезапуск прогона: история живёт, runId+1, стартовые константы, шаг 1', () => {
    run.runEpoch()
    run.reset()
    expect(run.runId).toBe(2)
    expect(run.screen).toBe('walkthrough')
    expect(run.stepInSample).toBe(1)
    expect(run.sampleIndex).toBe(0)
    expect(run.currentRecord).toBeNull()
    expect(run.epochLossPoints).toHaveLength(0)
    expect(flatModelWeights()).toEqual(START_FLAT)
    // сводки завершённых эпох и история сессии живут до reload (пункт 6 ТЗ)
    expect(run.completedEpochs).toHaveLength(1)
    expect(run.sampleHistory).toHaveLength(1 + SAMPLE_COUNT + 1)
    const start2 = asStart(run.sampleHistory[1 + SAMPLE_COUNT]!)
    expect(start2.runId).toBe(2)
    expect(start2.epoch).toBe(1)
    expect(start2.weights).toEqual(START_FLAT)
    // обучение продолжает копить историю: эпоха 1 прогона 2 дописывается
    run.runEpoch()
    expect(run.sampleHistory).toHaveLength(1 + SAMPLE_COUNT * 2 + 1)
    expect(run.completedEpochs).toHaveLength(2)
  })

  it('(в) инвариант R3 на истории: две эпохи пошагово и FF — идентичные sampleHistory', () => {
    const stepwise = new TrainingRun()
    for (let e = 0; e < 2; e++) {
      for (let i = 0; i < SAMPLE_COUNT * OPS_PER_SAMPLE; i++) stepwise.advance()
      stepwise.advance() // экран завершения эпохи → следующая эпоха
    }
    const ff = new TrainingRun()
    for (let e = 0; e < 2; e++) {
      ff.runEpoch()
      ff.advance()
    }
    expect(ff.sampleHistory).toEqual(stepwise.sampleHistory)
  })
})
