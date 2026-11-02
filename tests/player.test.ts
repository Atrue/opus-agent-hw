import { describe, expect, it } from 'vitest'
import { trace, transition, type PlayerState } from '../src/player/store'
import { buildStepRows } from '../src/ui/StepPanel'

const last = trace.steps.length - 1 // 13

const base: PlayerState = { stepIndex: 0, drill: null, mode: 'default' }

const drilled = (i: number): PlayerState => ({
  ...base,
  stepIndex: i,
  drill: { kind: 'number', stepIndex: i, ref: 'z1[0]' },
})

describe('переходы плеера: кламп 0..13, сброс drill', () => {
  it('next на последнем шаге (13) — no-op, stepIndex остаётся 13', () => {
    const s = transition({ ...base, stepIndex: last }, { type: 'next' })
    expect(s.stepIndex).toBe(last)
  })

  it('prev на 0 — no-op, stepIndex остаётся 0', () => {
    const s = transition({ ...base, stepIndex: 0 }, { type: 'prev' })
    expect(s.stepIndex).toBe(0)
  })

  it('jumpTo(-5) → 0', () => {
    expect(transition(base, { type: 'jumpTo', index: -5 }).stepIndex).toBe(0)
  })

  it('jumpTo(99) → 13', () => {
    expect(transition(base, { type: 'jumpTo', index: 99 }).stepIndex).toBe(last)
  })

  it('next внутри диапазона увеличивает шаг на 1', () => {
    expect(transition({ ...base, stepIndex: 4 }, { type: 'next' }).stepIndex).toBe(5)
  })

  it('смена шага (next/prev/jumpTo) сбрасывает drill в null', () => {
    expect(transition(drilled(4), { type: 'next' }).drill).toBeNull()
    expect(transition(drilled(4), { type: 'prev' }).drill).toBeNull()
    expect(transition(drilled(4), { type: 'jumpTo', index: 0 }).drill).toBeNull()
  })

  it('toggleMode переключает default ↔ lecture (лекционный режим)', () => {
    const lecture = transition(base, { type: 'toggleMode' })
    expect(lecture.mode).toBe('lecture')
    expect(transition(lecture, { type: 'toggleMode' }).mode).toBe('default')
  })
})

describe('StepPanel — потолки чисел (анти-«стена цифр», UI-SPEC)', () => {
  it('≤7 ключевых чисел в дефолтном виде на каждом из 14 шагов', () => {
    for (const step of trace.steps) {
      const key = buildStepRows(step)
        .filter((r) => r.kind !== 'input')
        .reduce((n, r) => n + r.values.length, 0)
      expect(key, `шаг ${step.index + 1} (${step.op || step.phase})`).toBeLessThanOrEqual(7)
    }
  })

  it('≤30 чисел на всём экране (ключевые + входы)', () => {
    for (const step of trace.steps) {
      const total = buildStepRows(step).reduce((n, r) => n + r.values.length, 0)
      expect(total, `шаг ${step.index + 1}`).toBeLessThanOrEqual(30)
    }
  })

  it('highlight изменившихся: на каждом шаге с changed есть подсвеченный ключевой тензор', () => {
    for (const step of trace.steps) {
      if (step.changed.length === 0) continue
      const highlighted = buildStepRows(step).some((r) => r.kind !== 'input' && r.changed)
      expect(highlighted, `шаг ${step.index + 1}`).toBe(true)
    }
  })
})
