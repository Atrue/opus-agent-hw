import { beforeEach, describe, expect, it } from 'vitest'
import { buildLossChartData, buildWeightsTable, WEIGHT_ROWS } from '../../src/run/history'
import { run } from '../../src/run/runState'
import { XOR_SCENARIO, SAMPLE_COUNT } from '../../src/run/scenario'

/**
 * История обучения (UX-05/UX-06, план 01.1-03): данные графика лосса и
 * таблицы весов поверх прогона. Снапшот эпохи 0 = стартовые константы
 * сценария; после каждой завершённой эпохи добавляется столбец; лосс-точки
 * и сводные L до/после обеих эпох сохранены; все числа истории конечны.
 */

const START_FLAT = [
  ...XOR_SCENARIO.startWeights.w1.flat(),
  ...XOR_SCENARIO.startWeights.b1,
  ...XOR_SCENARIO.startWeights.w2.flat(),
  ...XOR_SCENARIO.startWeights.b2,
]

/** Завершает две эпохи: FF эпохи 1 → следующая → FF эпохи 2. */
function runTwoEpochs(): void {
  run.runEpoch()
  run.advance()
  run.runEpoch()
}

beforeEach(() => {
  run.reset()
})

describe('История обучения: снапшоты весов (UX-06)', () => {
  it('снапшот эпохи 0 равен стартовым константам сценария', () => {
    expect(run.weightSnapshots).toHaveLength(1)
    expect(run.weightSnapshots[0]).toEqual(START_FLAT)
  })

  it('после каждой завершённой эпохи добавляется столбец: 2 эпохи → 3 снапшота', () => {
    run.runEpoch()
    expect(run.weightSnapshots).toHaveLength(2)
    run.advance()
    expect(run.weightSnapshots).toHaveLength(2) // старт эпохи 2 нового столбца не добавляет
    run.runEpoch()
    expect(run.weightSnapshots).toHaveLength(3)
    // снапшоты границ различаются: SGD сдвинул веса
    expect(run.weightSnapshots[1]).not.toEqual(run.weightSnapshots[0])
    expect(run.weightSnapshots[2]).not.toEqual(run.weightSnapshots[1])
  })

  it('WEIGHT_ROWS: 13 меток строк в порядке снапшота (W1 → b1 → W2 → b2)', () => {
    expect(WEIGHT_ROWS).toHaveLength(13)
    expect(WEIGHT_ROWS[0]).toBe('W1[0,0]')
    expect(WEIGHT_ROWS[5]).toBe('W1[2,1]')
    expect(WEIGHT_ROWS[6]).toBe('b1[0]')
    expect(WEIGHT_ROWS[9]).toBe('W2[0,0]')
    expect(WEIGHT_ROWS[12]).toBe('b2[0]')
  })

  it('buildWeightsTable: строки = 13 весов, столбцы = эпохи 0..N', () => {
    runTwoEpochs()
    const table = buildWeightsTable(run.weightSnapshots)
    expect(table.epochs).toEqual([0, 1, 2])
    expect(table.rows).toHaveLength(13)
    expect(table.rows[0]!.label).toBe('W1[0,0]')
    expect(table.rows[0]!.values).toEqual(run.weightSnapshots.map((s) => s[0]))
    expect(table.rows[12]!.label).toBe('b2[0]')
    expect(table.rows[12]!.values).toEqual(run.weightSnapshots.map((s) => s[12]))
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
    for (const snap of run.weightSnapshots) {
      expect(snap).toHaveLength(13)
      for (const w of snap) expect(Number.isFinite(w)).toBe(true)
    }
  })

  it('buildLossChartData: линия текущей эпохи + точки завершённых эпох, шкала конечна', () => {
    runTwoEpochs()
    const chart = buildLossChartData(run.epochLossPoints, run.completedEpochs)
    expect(chart.line).toHaveLength(SAMPLE_COUNT)
    expect(chart.line[0]!.y).toBe(run.epochLossPoints[0])
    expect(chart.dots).toHaveLength(2)
    expect(chart.dots[0]!.y).toBe(run.completedEpochs[0]!.lossAfter)
    expect(chart.dots[1]!.y).toBe(run.completedEpochs[1]!.lossAfter)
    // точки завершённых эпох — левее линии текущей (единая ось сэмплов)
    expect(chart.dots[1]!.x).toBeLessThan(chart.line[0]!.x)
    expect(Number.isFinite(chart.yMin)).toBe(true)
    expect(Number.isFinite(chart.yMax)).toBe(true)
    expect(chart.yMin).toBeLessThanOrEqual(chart.yMax)
  })

  it('buildLossChartData до первого шага: пустые ряды, пустое состояние без NaN', () => {
    const chart = buildLossChartData([], [])
    expect(chart.line).toHaveLength(0)
    expect(chart.dots).toHaveLength(0)
    expect(Number.isFinite(chart.yMin)).toBe(true)
    expect(Number.isFinite(chart.yMax)).toBe(true)
  })
})
