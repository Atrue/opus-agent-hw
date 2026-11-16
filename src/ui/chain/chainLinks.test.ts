/**
 * Модель звеньев «формулы-хребта» (план 01.2-01; цепь-станций — 01.2-04;
 * граф вычислений — 01.2-06): цепь звеньев — XOR: x → z1 → a1 → z2 → ŷ(yhat)
 * → L → W; нейрон (D-31): x → z → ŷ(yhat) → L → W. Каждый символ формулы
 * сети отображается ровно в одно звено; заголовки звеньев — символ формулы
 * первым (Gap 6 UAT). Геометрия звена = ГРУППА звеньев графа вычислений
 * (compGraph.SEGMENT_GROUPS): выбор символа формулы подсвечивает группу графа.
 * Формулы звеньев — из opMeta сценария (z1 = matvec+add → «z1 = W1·x + b1»).
 *
 * 02-05: данные параметризованы спеком (chainOf/buildInventory) — XOR как
 * регрессия движка, нейрон — носитель MVP R1; geometryOf-гейты (контекст
 * активного сценария = neuron по умолчанию) проверяют логику подсветки.
 */

import { describe, expect, it } from 'vitest'
import { chainOf } from './links'
import { geometryOf, type GeometryContext, type SegmentGeometry } from './geometry'
import { buildInventory } from '../graph/inventory'
import { NEURON_SCENARIO, XOR_SCENARIO, type ScenarioModel } from '../../run/scenario'

/** Контекст геометрии спека (рёбра/группы + символы). */
function contextOf(spec: ScenarioModel): GeometryContext {
  const inv = buildInventory(spec)
  const chain = chainOf(spec)
  return { edges: inv.edges, segmentGroups: inv.segmentGroups, symbolToSegment: chain.symbolToSegment, symbolNodes: chain.symbolNodes }
}

function geometrySize(g: SegmentGeometry): number {
  return g.nodes.size + g.edges.size
}

/** Символ → звено: каждый ровно в одно звено и числится в нём (любой спек). */
function mappingGates(spec: ScenarioModel, label: string, formulaSymbols: readonly string[]): void {
  const chain = chainOf(spec)
  it(`${label}: каждый символ формулы отображается ровно в одно звено и числится в нём`, () => {
    expect(new Set(Object.keys(chain.symbolToSegment))).toEqual(new Set(formulaSymbols))
    for (const sym of formulaSymbols) {
      const segId = chain.symbolToSegment[sym] as unknown
      expect(segId, `${label}: символ «${sym}» отображается в звено`).toBeDefined()
      const segs = chain.segments.filter((s) => s.id === segId)
      expect(segs, `${label}: звено «${String(segId)}» существует и единственно`).toHaveLength(1)
      expect(segs[0]!.symbols, `${label}: символ «${sym}» числится в звене`).toContain(sym)
    }
  })
  it(`${label}: RU-строки и формулы всех звеньев непустые; заголовки начинаются с символа`, () => {
    for (const s of chain.segments) {
      expect(s.title.trim().length, `${label}: title звена ${s.id}`).toBeGreaterThan(0)
      expect(s.formula.trim().length, `${label}: formula звена ${s.id}`).toBeGreaterThan(0)
      const lead = s.id === 'yhat' ? 'ŷ' : s.id
      expect(s.title.startsWith(lead), `${label}: заголовок «${s.title}» начинается с «${lead}»`).toBe(true)
    }
  })
  it(`${label}: геометрия звена = группа графа; геометрия символа непуста и вложена в звено`, () => {
    const ctx = contextOf(spec)
    for (const s of chain.segments) {
      const g = geometryOf(s.id, undefined, ctx)
      const ref = ctx.segmentGroups[s.id]!
      expect([...g.nodes], `${label}: узлы звена ${s.id}`).toEqual([...ref.nodes])
      expect(geometrySize(g), `${label}: геометрия звена ${s.id} непуста`).toBeGreaterThan(0)
      for (const sym of s.symbols) {
        const part = geometryOf(s.id, sym, ctx)
        expect(geometrySize(part), `${label}: геометрия ${s.id}/${sym}`).toBeGreaterThan(0)
        for (const n of part.nodes) expect(g.nodes.has(n), `${label}: ${s.id}/${sym}: узел ${n} ∈ звену`).toBe(true)
      }
    }
  })
  it(`${label}: вся геометрия ссылается только на узлы контракта; каждый узел покрыт звеном`, () => {
    const ctx = contextOf(spec)
    const covered = new Set<string>()
    for (const s of chain.segments) geometryOf(s.id, undefined, ctx).nodes.forEach((n) => covered.add(n))
    expect([...covered].sort()).toEqual([...buildInventory(spec).nodes.map((n) => n.id)].sort())
  })
}

describe('chainLinks XOR: 7 звеньев в порядке цепи (регрессия движка)', () => {
  const chain = chainOf(XOR_SCENARIO)

  it('порядок цепи: x → z1 → a1 → z2 → yhat → L → W', () => {
    expect(chain.segments.map((s) => s.id)).toEqual(['x', 'z1', 'a1', 'z2', 'yhat', 'L', 'W'])
  })

  it('формулы звеньев собираются из opMeta: z1/z2 — склейка matvec+add, остальные — формулы оп', () => {
    const byId = new Map(chain.segments.map((s) => [s.id, s]))
    expect(byId.get('z1')!.formula).toBe('z1 = W1·x + b1')
    expect(byId.get('z2')!.formula).toBe('z2 = W2·a1 + b2')
    // a1 = tanh(z1)
    expect(byId.get('a1')!.formula).toBe(XOR_SCENARIO.ops[2]!.formula)
    // ŷ = σ(z2)
    expect(byId.get('yhat')!.formula).toBe(XOR_SCENARIO.ops[5]!.formula)
    // bce
    expect(byId.get('L')!.formula).toBe(XOR_SCENARIO.ops[6]!.formula)
  })

  it('symbolToSegment не изменился: формула-строка не пересобирается', () => {
    expect(chain.symbolToSegment).toEqual({
      x: 'x',
      W1: 'z1',
      b1: 'z1',
      tanh: 'a1',
      W2: 'z2',
      b2: 'z2',
      σ: 'yhat',
      ŷ: 'yhat',
      y: 'L',
      L: 'L',
      η: 'W',
      '∂L/∂W': 'W',
    })
  })

  it('звено a1 = tanh-опы + a1-значения (≥3 — контракт e2e 8); звено W — станция + все 13 параметров', () => {
    const ctx = contextOf(XOR_SCENARIO)
    const a1 = geometryOf('a1', undefined, ctx)
    expect(a1.nodes.size).toBeGreaterThanOrEqual(3)
    expect([...a1.nodes].filter((id) => id.startsWith('op:tanh'))).toHaveLength(3)
    expect([...a1.nodes].filter((id) => id.startsWith('a1['))).toHaveLength(3)
    const w = geometryOf('W', undefined, ctx)
    expect(w.nodes.has('op:update')).toBe(true)
    expect([...w.nodes].filter((id) => id.startsWith('W1[') || id.startsWith('b1[') || id.startsWith('W2[') || id.startsWith('b2['))).toHaveLength(13)
  })
})

describe('chainLinks нейрон: цепь сжата до 5 звеньев x → z → ŷ → L → W (D-31)', () => {
  const chain = chainOf(NEURON_SCENARIO)

  it('порядок цепи: x → z → yhat → L → W; звено W — станция + 3 параметра', () => {
    expect(chain.segments.map((s) => s.id)).toEqual(['x', 'z', 'yhat', 'L', 'W'])
    const ctx = contextOf(NEURON_SCENARIO)
    const w = geometryOf('W', undefined, ctx)
    expect(w.nodes.has('op:update')).toBe(true)
    expect([...w.nodes].filter((id) => id === 'W[0]' || id === 'W[1]' || id === 'b[0]')).toHaveLength(3)
  })

  it('формула звена z — склейка matvec+add: «z = W·x + b»', () => {
    const byId = new Map(chain.segments.map((s) => [s.id, s]))
    expect(byId.get('z')!.formula).toBe('z = W·x + b')
    expect(byId.get('yhat')!.formula).toBe(NEURON_SCENARIO.ops[2]!.formula)
    expect(byId.get('L')!.formula).toBe(NEURON_SCENARIO.ops[3]!.formula)
  })

  it('symbolToSegment нейрона: W и b выбирают z; σ и ŷ — прогноз', () => {
    expect(chain.symbolToSegment).toEqual({
      x: 'x',
      W: 'z',
      b: 'z',
      σ: 'yhat',
      ŷ: 'yhat',
      y: 'L',
      L: 'L',
      η: 'W',
      '∂L/∂W': 'W',
    })
  })
})

const XOR_SYMBOLS = ['x', 'W1', 'b1', 'tanh', 'W2', 'b2', 'σ', 'ŷ', 'y', 'L', 'η', '∂L/∂W'] as const
const NEURON_SYMBOLS = ['x', 'W', 'b', 'σ', 'ŷ', 'y', 'L', 'η', '∂L/∂W'] as const

mappingGates(XOR_SCENARIO, 'XOR', XOR_SYMBOLS)
mappingGates(NEURON_SCENARIO, 'neuron', NEURON_SYMBOLS)
