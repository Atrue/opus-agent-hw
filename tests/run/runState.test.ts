import { beforeEach, describe, expect, it } from 'vitest'
import { run } from '../../src/run/runState'
import { XOR_SCENARIO } from '../../src/run/scenario'

/**
 * Корень прогона (R3/R4): курсор (эпоха/пример/шаг), границы сэмпла и эпохи,
 * детерминированный reset, сброс drill при смене операции, лосс-точки на bce.
 */

const START_W1 = XOR_SCENARIO.startWeights.w1.flat()

beforeEach(() => {
  run.reset()
})

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

  it('пересекает границу эпохи: 4 сэмпла × 13 операций → эпоха 2, пример 1, шаг 1', () => {
    for (let i = 0; i < 4 * 13; i++) run.advance()
    expect(run.epoch).toBe(2)
    expect(run.sampleIndex).toBe(0)
    expect(run.stepInSample).toBe(1)
    // эпохи бесконечны: 52+1 операций не блокируются
    run.advance()
    expect(run.epoch).toBe(2)
    expect(run.stepInSample).toBe(2)
  })

  it('reset() возвращает детерминированный старт: стартовые веса, пустая история, шаг 1', () => {
    for (let i = 0; i < 20; i++) run.advance()
    run.reset()
    expect(run.epoch).toBe(1)
    expect(run.sampleIndex).toBe(0)
    expect(run.stepInSample).toBe(1)
    expect(run.currentRecord).toBeNull()
    expect(run.lossHistory).toHaveLength(0)
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
    expect(run.lossHistory).toHaveLength(0)
    run.advance() // оп 6 — bce
    expect(run.lossHistory).toHaveLength(1)
    expect(run.lossHistory[0]).toBeCloseTo(0.7097208011495857, 15)
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
