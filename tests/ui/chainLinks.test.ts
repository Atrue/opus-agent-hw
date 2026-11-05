/**
 * Модель звеньев «формулы-хребта» (план 01.2-01): 7 звеньев цепи
 * x → z1 → a1 → z2 → ŷ(yhat) → L → W; каждый символ формулы сети
 * отображается ровно в одно звено; геометрия звена непустая и согласована
 * с диаграммой (id узлов/рёбер/плашек/биасов). Формулы звеньев — из opMeta
 * сценария (z1 = matvec+add → «z1 = W1·x + b1»). RU-строки — здесь же.
 */

import { describe, expect, it } from 'vitest'
import { SEGMENTS, geometryOf, symbolToSegment, type SegmentGeometry } from '../../src/ui/chainLinks'
import { XOR_SCENARIO } from '../../src/run/scenario'

/** Полный словарь символов формулы-строки (must_haves плана). */
const FORMULA_SYMBOLS = ['x', 'W1', 'b1', 'tanh', 'W2', 'b2', 'σ', 'ŷ', 'y', 'L', 'η', '∂L/∂W'] as const

function geometrySize(g: SegmentGeometry): number {
  return g.nodes.size + g.edges.size + g.plates.size + g.biases.size
}

describe('chainLinks: звенья формулы-хребта', () => {
  it('7 звеньев в порядке цепи: x → z1 → a1 → z2 → yhat → L → W', () => {
    expect(SEGMENTS.map((s) => s.id)).toEqual(['x', 'z1', 'a1', 'z2', 'yhat', 'L', 'W'])
  })

  it('каждый символ формулы отображается ровно в одно звено и числится в нём', () => {
    expect(new Set(Object.keys(symbolToSegment))).toEqual(new Set(FORMULA_SYMBOLS))
    for (const sym of FORMULA_SYMBOLS) {
      const segId = symbolToSegment[sym] as unknown
      expect(segId, `символ «${sym}» отображается в звено`).toBeDefined()
      const segs = SEGMENTS.filter((s) => s.id === segId)
      expect(segs, `звено «${String(segId)}» существует и единственно`).toHaveLength(1)
      expect(segs[0]!.symbols, `символ «${sym}» числится в звене`).toContain(sym)
    }
  })

  it('RU-строки и формулы всех звеньев непустые', () => {
    for (const s of SEGMENTS) {
      expect(s.title.trim().length, `title звена ${s.id}`).toBeGreaterThan(0)
      expect(s.formula.trim().length, `formula звена ${s.id}`).toBeGreaterThan(0)
    }
  })

  it('формулы звеньев собираются из opMeta: z1/z2 — склейка matvec+add, остальные — формулы оп', () => {
    const byId = new Map(SEGMENTS.map((s) => [s.id, s]))
    // звено = объединение соседних оп: «z1 = W1·x» + «z1 = z1 + b1»
    expect(byId.get('z1')!.formula).toBe('z1 = W1·x + b1')
    expect(byId.get('z2')!.formula).toBe('z2 = W2·a1 + b2')
    // символы z1/z2 доступны через звенья z1/z2 — панель показывает их формулы
    expect(byId.get('a1')!.formula).toBe(XOR_SCENARIO.opMeta[2]!.formula) // a1 = tanh(z1)
    expect(byId.get('yhat')!.formula).toBe(XOR_SCENARIO.opMeta[5]!.formula) // ŷ = σ(z2)
    expect(byId.get('L')!.formula).toBe(XOR_SCENARIO.opMeta[6]!.formula) // bce
  })

  it('geometryOf(seg) непустая для всех 7 звеньев', () => {
    for (const s of SEGMENTS) {
      expect(geometrySize(geometryOf(s.id)), `геометрия звена ${s.id}`).toBeGreaterThan(0)
    }
  })

  it('geometryOf(seg, sym) непустая и вложена в геометрию звена', () => {
    for (const s of SEGMENTS) {
      const whole = geometryOf(s.id)
      for (const sym of s.symbols) {
        const part = geometryOf(s.id, sym)
        expect(geometrySize(part), `геометрия ${s.id}/${sym}`).toBeGreaterThan(0)
        for (const n of part.nodes) expect(whole.nodes.has(n), `${s.id}/${sym}: узел ${n} ∈ звену`).toBe(true)
        for (const e of part.edges) expect(whole.edges.has(e), `${s.id}/${sym}: ребро ${e} ∈ звену`).toBe(true)
        for (const p of part.plates) expect(whole.plates.has(p), `${s.id}/${sym}: плашка ${p} ∈ звену`).toBe(true)
        for (const b of part.biases) expect(whole.biases.has(b), `${s.id}/${sym}: биас ${b} ∈ звену`).toBe(true)
      }
    }
  })

  it('отображения символов на геометрию диаграммы (примеры плана)', () => {
    expect(geometryOf('x', 'x').nodes).toEqual(new Set(['x[0]', 'x[1]']))
    expect(geometryOf('z1', 'W1').edges).toEqual(new Set(['W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]']))
    expect(geometryOf('z1', 'b1').biases).toEqual(new Set(['b1[0]', 'b1[1]', 'b1[2]']))
    expect(geometryOf('a1', 'tanh').plates).toEqual(new Set(['tanh']))
    expect(geometryOf('a1', 'tanh').nodes).toEqual(new Set(['a1[0]', 'a1[1]', 'a1[2]']))
  })
})
