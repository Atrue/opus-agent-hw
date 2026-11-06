/**
 * Модель звеньев «формулы-хребта» (план 01.2-01; цепь-станций — 01.2-04;
 * граф вычислений — 01.2-06): 7 звеньев цепи x → z1 → a1 → z2 → ŷ(yhat) → L →
 * W; каждый символ формулы сети отображается ровно в одно звено; заголовки
 * звеньев — символ формулы первым (Gap 6 UAT). Геометрия звена = ГРУППА
 * звеньев графа вычислений (узлы-значения/операции + рёбра между ними,
 * compGraph.SEGMENT_GROUPS): выбор символа формулы подсвечивает группу графа.
 * Формулы звеньев — из opMeta сценария (z1 = matvec+add → «z1 = W1·x + b1»).
 */

import { describe, expect, it } from 'vitest'
import { CHAIN_GEOMETRY_IDS, SEGMENTS, geometryOf, symbolToSegment, type SegmentGeometry } from '../../src/ui/chainLinks'
import { GRAPH_EDGES, GRAPH_NODES, SEGMENT_GROUPS } from '../../src/ui/compGraph'
import { XOR_SCENARIO } from '../../src/run/scenario'

/** Полный словарь символов формулы-строки (must_haves плана). */
const FORMULA_SYMBOLS = ['x', 'W1', 'b1', 'tanh', 'W2', 'b2', 'σ', 'ŷ', 'y', 'L', 'η', '∂L/∂W'] as const

/** Ведущий символ заголовка звена (заголовки символ-первым, 01.2-04). */
const LEADING_SYMBOL: Record<string, string> = {
  x: 'x',
  z1: 'z1',
  a1: 'a1',
  z2: 'z2',
  yhat: 'ŷ',
  L: 'L',
  W: 'W',
}

function geometrySize(g: SegmentGeometry): number {
  return g.nodes.size + g.edges.size
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
    expect(byId.get('z1')!.formula).toBe('z1 = W1·x + b1')
    expect(byId.get('z2')!.formula).toBe('z2 = W2·a1 + b2')
    expect(byId.get('a1')!.formula).toBe(XOR_SCENARIO.opMeta[2]!.formula) // a1 = tanh(z1)
    expect(byId.get('yhat')!.formula).toBe(XOR_SCENARIO.opMeta[5]!.formula) // ŷ = σ(z2)
    expect(byId.get('L')!.formula).toBe(XOR_SCENARIO.opMeta[6]!.formula) // bce
  })

  it('заголовки звеньев начинаются с символа формулы (Gap 6: имена = символы)', () => {
    for (const s of SEGMENTS) {
      const lead = LEADING_SYMBOL[s.id]!
      expect(s.title.startsWith(lead), `заголовок «${s.title}» начинается с «${lead}»`).toBe(true)
    }
  })

  it('symbolToSegment не изменился: формула-строка не пересобирается', () => {
    expect(symbolToSegment).toEqual({
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
})

describe('chainLinks: геометрия = группы графа вычислений (01.2-06)', () => {
  it('geometryOf(seg) возвращает группу SEGMENT_GROUPS (узлы + внутренние рёбра)', () => {
    for (const s of SEGMENTS) {
      const g = geometryOf(s.id)
      const ref = SEGMENT_GROUPS[s.id]!
      expect([...g.nodes], `узлы звена ${s.id}`).toEqual([...ref.nodes])
      expect([...g.edges], `рёбра звена ${s.id}`).toEqual([...ref.edges])
      expect(geometrySize(g), `геометрия звена ${s.id} непуста`).toBeGreaterThan(0)
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
      }
    }
  })

  it('звено a1 = tanh-опы + a1-значения (≥3 элементов — контракт e2e 8); z1-узлов нет', () => {
    const g = geometryOf('a1')
    expect(g.nodes.size).toBeGreaterThanOrEqual(3)
    expect([...g.nodes].filter((id) => id.startsWith('op:tanh'))).toHaveLength(3)
    expect([...g.nodes].filter((id) => id.startsWith('a1['))).toHaveLength(3)
    for (const n of geometryOf('z1').nodes) {
      if (n.startsWith('z1[')) expect(g.nodes.has(n), `z1-узел ${n} не входит в звено a1`).toBe(false)
    }
  })

  it('звено L — станция лосса: bce + y + L + ŷ', () => {
    const g = geometryOf('L')
    for (const id of ['op:bce', 'y[0]', 'L', 'ŷ']) expect(g.nodes.has(id), `L содержит ${id}`).toBe(true)
  })

  it('звено W — update-станция + все 13 параметров', () => {
    const g = geometryOf('W')
    expect(g.nodes.has('op:update')).toBe(true)
    expect([...g.nodes].filter((id) => id.startsWith('W1[') || id.startsWith('b1[') || id.startsWith('W2[') || id.startsWith('b2['))).toHaveLength(13)
  })
})

describe('chainLinks: контракт графа CHAIN_GEOMETRY_IDS (01.2-06)', () => {
  it('контракт = все узлы и рёбра графа вычислений', () => {
    expect(new Set(CHAIN_GEOMETRY_IDS.nodes)).toEqual(new Set(GRAPH_NODES.map((n) => n.id)))
    expect(new Set(CHAIN_GEOMETRY_IDS.edges)).toEqual(new Set(GRAPH_EDGES.map((e) => e.id)))
  })

  it('вся геометрия звеньев ссылается только на id контракта', () => {
    const nodes = new Set(CHAIN_GEOMETRY_IDS.nodes)
    const edges = new Set(CHAIN_GEOMETRY_IDS.edges)
    for (const s of SEGMENTS) {
      const geometries = [geometryOf(s.id), ...s.symbols.map((sym) => geometryOf(s.id, sym))]
      for (const g of geometries) {
        for (const n of g.nodes) expect(nodes.has(n), `узел «${n}» есть в контракте`).toBe(true)
        for (const e of g.edges) expect(edges.has(e), `ребро «${e}» есть в контракте`).toBe(true)
      }
    }
  })

  it('каждый узел графа покрыт хотя бы одним звеном (подсвечиваем выбором)', () => {
    const covered = new Set<string>()
    for (const s of SEGMENTS) geometryOf(s.id).nodes.forEach((n) => covered.add(n))
    expect([...covered].sort()).toEqual([...CHAIN_GEOMETRY_IDS.nodes].sort())
  })
})
