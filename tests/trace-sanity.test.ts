import { expect, it } from 'vitest'
import trace from '../src/data/xor-trace.json'
import { validateTrace } from '../src/player/types'

const PHASE_ORDER = ['forward', 'loss', 'backward', 'update', 'summary'] as const

it('мок-трейс структурно валиден', () => {
  expect(trace.schemaVersion).toBe(1)
  expect(trace.steps).toHaveLength(14)
  const phases = trace.steps.map((s) => s.phase)
  const firstIdx = PHASE_ORDER.map((p) => phases.indexOf(p))
  expect(firstIdx).toEqual([...firstIdx].sort((a, b) => a - b)) // фазы не перемешаны
})

it('все числа finite (NaN/Inf в трейсе = генератор сломан)', () => {
  const flat = JSON.stringify(trace)
  expect(flat).not.toMatch(/NaN|Infinity/)
})

it('validateTrace принимает закоммиченный трейс', () => {
  expect(() => validateTrace(trace)).not.toThrow()
})
