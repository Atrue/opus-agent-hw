import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildLossChartData,
  linkHistoryOf,
  sessionGeometryOf,
  WEIGHT_ROWS,
  type LinkSeries,
} from '../../src/run/history'
import { TrainingRun, isSampleRecord, type SampleRecord } from '../../src/run/runState'
import { XOR_SCENARIO, SAMPLE_COUNT } from '../../src/run/scenario'
import { OPS_PER_SAMPLE } from '../../src/tensor'

/**
 * История обучения (UX-05/UX-06, планы 01.1-03 → 01.2-02): per-sample
 * история сессии (SampleRecord на границе сэмпла, стартовые записи прогонов)
 * — источник графика лосса (ось — сэмплы сессии, разделители прогонов) и
 * истории звена цепи (linkHistoryOf). Сброс — перезапуск прогона: история
 * живёт до reload, поэтому каждый тест — свежий TrainingRun (семантика reload).
 */

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

/** Завершает две эпохи: FF эпохи 1 → следующая → FF эпохи 2. */
function runTwoEpochs(): void {
  run.runEpoch()
  run.advance()
  run.runEpoch()
}

/** Записи сэмплов истории (стартовые записи отброшены). */
function sampleRecords(): SampleRecord[] {
  return run.sampleHistory.filter(isSampleRecord)
}

describe('История звена цепи: linkHistoryOf (01.2-02)', () => {
  it('весовой символ W1: 6 рядов — значения weights[индексы W1] по записям, включая стартовые', () => {
    runTwoEpochs()
    const { series } = linkHistoryOf(run.sampleHistory, 'z1', 'W1')
    expect(series).toHaveLength(6)
    expect(series.map((s) => s.label)).toEqual([...WEIGHT_ROWS.slice(0, 6)])
    const samples = sampleRecords()
    expect(samples).toHaveLength(SAMPLE_COUNT * 2)
    for (let j = 0; j < 6; j++) {
      const points = series[j]!.points
      // стартовая запись прогона + 8 границ сэмплов
      expect(points).toHaveLength(1 + SAMPLE_COUNT * 2)
      expect(points[0]!.sampleIndex).toBe(-1)
      expect(points[0]!.value).toBe(START_FLAT[j])
      for (let k = 0; k < samples.length; k++) {
        expect(points[k + 1]!.value).toBe(samples[k]!.weights[j])
      }
    }
  })

  it('разделители эпох и прогонов: метаданные точек несут границы runId/epoch', () => {
    runTwoEpochs()
    const { series } = linkHistoryOf(run.sampleHistory, 'L', 'L')
    const points = series[0]!.points
    expect(points.map((p) => p.epoch)).toEqual([1, 1, 1, 1, 2, 2, 2, 2])
    expect(points.map((p) => p.runId)).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
    expect(points.map((p) => p.sampleIndex)).toEqual([0, 1, 2, 3, 0, 1, 2, 3])
    // сброс — граница прогона: прогон 2 пишет свой runId и свою эпоху 1
    run.reset()
    run.runEpoch()
    const after = linkHistoryOf(run.sampleHistory, 'L', 'L').series[0]!.points
    expect(after.map((p) => p.runId)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2])
    expect(after[8]!.epoch).toBe(1)
    expect(after[8]!.sampleIndex).toBe(0)
  })

  it('скалярные и узловые символы: L — лосс, ŷ — прогноз, x — входы; звено W — все 13 весов', () => {
    runTwoEpochs()
    const samples = sampleRecords()
    const loss: LinkSeries = linkHistoryOf(run.sampleHistory, 'L', 'L').series[0]!
    expect(loss.label).toBe('L')
    expect(loss.points.map((p) => p.value)).toEqual(samples.map((s) => s.loss))
    const yhat = linkHistoryOf(run.sampleHistory, 'yhat', 'ŷ').series[0]!
    expect(yhat.label).toBe('ŷ')
    expect(yhat.points.map((p) => p.value)).toEqual(samples.map((s) => s.yhat))
    const x = linkHistoryOf(run.sampleHistory, 'x', 'x')
    expect(x.series).toHaveLength(2)
    expect(x.series[0]!.points.map((p) => p.value)).toEqual(samples.map((s) => s.x[0]!))
    const z1 = linkHistoryOf(run.sampleHistory, 'a1', 'tanh')
    expect(z1.series).toHaveLength(3)
    // плашка tanh показывает свой выход: ряд — активации a1
    expect(z1.series[0]!.points.map((p) => p.value)).toEqual(samples.map((s) => s.a1[0]!))
    // звено W (SGD): судьба обновления — все 13 весов по сэмплам
    const w = linkHistoryOf(run.sampleHistory, 'W', 'η')
    expect(w.series).toHaveLength(13)
    expect(w.series.map((s) => s.label)).toEqual([...WEIGHT_ROWS])
  })

  it('WEIGHT_ROWS: 13 меток в порядке плоского среза (W1 → b1 → W2 → b2)', () => {
    expect(WEIGHT_ROWS).toHaveLength(13)
    expect(WEIGHT_ROWS[0]).toBe('W1[0,0]')
    expect(WEIGHT_ROWS[5]).toBe('W1[2,1]')
    expect(WEIGHT_ROWS[6]).toBe('b1[0]')
    expect(WEIGHT_ROWS[9]).toBe('W2[0,0]')
    expect(WEIGHT_ROWS[12]).toBe('b2[0]')
  })
})

describe('Геометрия сессии: sessionGeometryOf + buildLossChartData (01.2-02)', () => {
  it('полные эпохи → x-границы эпох; сброс → граница прогона; база линии текущей эпохи', () => {
    expect(sessionGeometryOf([], 0)).toEqual({ runBounds: [], epochEndXs: [], samples: 0, samplesBefore: 0 })
    run.runEpoch()
    expect(sessionGeometryOf(run.sampleHistory, run.completedEpochs.length)).toEqual({
      runBounds: [],
      epochEndXs: [SAMPLE_COUNT],
      samples: SAMPLE_COUNT,
      samplesBefore: SAMPLE_COUNT,
    })
    run.advance() // старт эпохи 2
    run.runEpoch()
    expect(sessionGeometryOf(run.sampleHistory, run.completedEpochs.length)).toEqual({
      runBounds: [],
      epochEndXs: [SAMPLE_COUNT, SAMPLE_COUNT * 2],
      samples: SAMPLE_COUNT * 2,
      samplesBefore: SAMPLE_COUNT * 2,
    })
    // сброс после двух эпох: граница прогона на 8, точки эпох живы
    run.reset()
    const afterReset = sessionGeometryOf(run.sampleHistory, run.completedEpochs.length, {
      runId: run.runId,
      epoch: run.epoch,
    })
    expect(afterReset.runBounds).toEqual([SAMPLE_COUNT * 2])
    expect(afterReset.epochEndXs).toEqual([SAMPLE_COUNT, SAMPLE_COUNT * 2])
    expect(afterReset.samples).toBe(SAMPLE_COUNT * 2)
    expect(afterReset.samplesBefore).toBe(SAMPLE_COUNT * 2) // сэмплов прогона 2 ещё нет
    run.runEpoch() // эпоха 1 прогона 2
    const afterRun2 = sessionGeometryOf(run.sampleHistory, run.completedEpochs.length, {
      runId: run.runId,
      epoch: run.epoch,
    })
    expect(afterRun2.runBounds).toEqual([SAMPLE_COUNT * 2])
    expect(afterRun2.epochEndXs).toEqual([SAMPLE_COUNT, SAMPLE_COUNT * 2, SAMPLE_COUNT * 3])
    expect(afterRun2.samples).toBe(SAMPLE_COUNT * 3)
    expect(afterRun2.samplesBefore).toBe(SAMPLE_COUNT * 2)
  })

  it('сброс внутри эпохи: граница прогона без точки эпохи (эпоха не завершена)', () => {
    for (let i = 0; i < 2 * OPS_PER_SAMPLE; i++) run.advance() // сэмплы 1–2 эпохи 1
    run.reset()
    const g = sessionGeometryOf(run.sampleHistory, run.completedEpochs.length)
    expect(g.runBounds).toEqual([2])
    expect(g.epochEndXs).toEqual([])
    expect(g.samples).toBe(2)
  })

  it('buildLossChartData: точки эпох на накопительных позициях сессии; линия нового прогона — правее границы', () => {
    runTwoEpochs()
    run.reset()
    const geometry = sessionGeometryOf(run.sampleHistory, run.completedEpochs.length, {
      runId: run.runId,
      epoch: run.epoch,
    })
    const chart = buildLossChartData(run.epochLossPoints, run.completedEpochs, geometry)
    expect(chart.dots.map((p) => p.x)).toEqual([SAMPLE_COUNT, SAMPLE_COUNT * 2])
    expect(chart.dots[1]!.y).toBe(run.completedEpochs[1]!.lossAfter)
    expect(chart.runBounds).toEqual([SAMPLE_COUNT * 2])
    expect(chart.line).toHaveLength(0) // текущая эпоха прогона 2 чиста
    // первый сэмпл прогона 2: линия растёт правее границы 8
    for (let i = 0; i < 13; i++) run.advance()
    const geometry2 = sessionGeometryOf(run.sampleHistory, run.completedEpochs.length, {
      runId: run.runId,
      epoch: run.epoch,
    })
    const chart2 = buildLossChartData(run.epochLossPoints, run.completedEpochs, geometry2)
    expect(chart2.line).toHaveLength(1)
    expect(chart2.line[0]!.x).toBe(SAMPLE_COUNT * 2 + 1)
    expect(chart2.runBounds).toEqual([SAMPLE_COUNT * 2])
    expect(Number.isFinite(chart2.yMin)).toBe(true)
    expect(Number.isFinite(chart2.yMax)).toBe(true)
  })
})

describe('История обучения: лосс и сводные эпох (UX-05)', () => {
  it('лосс-точки обеих эпох сохранены: сводные L до/после корректны', () => {
    runTwoEpochs()
    expect(run.completedEpochs).toHaveLength(2)
    const first = run.completedEpochs[0]!
    const second = run.completedEpochs[1]!
    // эпоха 1: L до — эталонный bce первого сэмпла
    expect(first.epoch).toBe(1)
    expect(first.lossBefore).toBeCloseTo(0.7097208011495857, 15)
    // точки текущей (второй) эпохи доступны: сводка согласована с ними
    expect(run.epochLossPoints).toHaveLength(SAMPLE_COUNT)
    expect(second.epoch).toBe(2)
    expect(second.lossBefore).toBe(run.epochLossPoints[0])
    expect(second.lossAfter).toBe(run.epochLossPoints[SAMPLE_COUNT - 1]!)
  })

  it('точность/сводка вычислены верно; все числа истории конечны (XOR)', () => {
    runTwoEpochs()
    for (const s of run.completedEpochs) {
      expect(s.accuracy).toBeGreaterThanOrEqual(0)
      expect(s.accuracy).toBeLessThanOrEqual(1)
      expect(s.correct).toBeGreaterThanOrEqual(0)
      expect(s.correct).toBeLessThanOrEqual(SAMPLE_COUNT)
      expect(s.accuracy).toBeCloseTo(s.correct / SAMPLE_COUNT, 15)
      expect(Number.isFinite(s.lossBefore)).toBe(true)
      expect(Number.isFinite(s.lossAfter)).toBe(true)
    }
    for (const p of run.epochLossPoints) expect(Number.isFinite(p)).toBe(true)
    // per-sample история: записи сэмплов конечны, лосс согласован с границами эпох
    const samples = sampleRecords()
    expect(samples).toHaveLength(SAMPLE_COUNT * 2)
    for (const rec of samples) {
      expect(Number.isFinite(rec.loss)).toBe(true)
      expect(Number.isFinite(rec.yhat)).toBe(true)
      expect(rec.weights).toHaveLength(13)
      for (const w of rec.weights) expect(Number.isFinite(w)).toBe(true)
    }
    // L до/после каждой эпохи — лосс первого/последнего сэмпла этой эпохи
    expect(samples[0]!.loss).toBe(run.completedEpochs[0]!.lossBefore)
    expect(samples[SAMPLE_COUNT - 1]!.loss).toBe(run.completedEpochs[0]!.lossAfter)
    expect(samples[SAMPLE_COUNT]!.loss).toBe(run.completedEpochs[1]!.lossBefore)
    expect(samples[SAMPLE_COUNT * 2 - 1]!.loss).toBe(run.completedEpochs[1]!.lossAfter)
  })

  it('buildLossChartData до первого шага: пустые ряды, пустое состояние без NaN', () => {
    const chart = buildLossChartData([], [], sessionGeometryOf([], 0))
    expect(chart.line).toHaveLength(0)
    expect(chart.dots).toHaveLength(0)
    expect(Number.isFinite(chart.yMin)).toBe(true)
    expect(Number.isFinite(chart.yMax)).toBe(true)
  })
})
