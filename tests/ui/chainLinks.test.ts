/**
 * Модель звеньев «формулы-хребта» (план 01.2-01; цепь-станций — 01.2-04):
 * 7 звеньев цепи x → z1 → a1 → z2 → ŷ(yhat) → L → W; каждый символ формулы
 * сети отображается ровно в одно звено; заголовки звеньев — символ формулы
 * первым (Gap 6 UAT); геометрия звена = станция цепи (узлы/рёбра/плашки/
 * биасы) и сверяется с контрактом CHAIN_GEOMETRY_IDS. Формулы звеньев — из
 * opMeta сценария (z1 = matvec+add → «z1 = W1·x + b1»). RU-строки — здесь же.
 */

import { describe, expect, it } from 'vitest'
import { CHAIN_GEOMETRY_IDS, SEGMENTS, geometryOf, symbolToSegment, type SegmentGeometry } from '../../src/ui/chainLinks'
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

describe('chainLinks: цепь-станций (01.2-04)', () => {
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

  it('geometryOf("a1"): a1-узлы + tanh-плашка, z1-узлов нет (станции различимы геометрически)', () => {
    const g = geometryOf('a1')
    expect(g.nodes).toEqual(new Set(['a1[0]', 'a1[1]', 'a1[2]']))
    expect(g.plates).toEqual(new Set(['tanh']))
    for (const n of geometryOf('z1').nodes) {
      expect(g.nodes.has(n), `z1-узел ${n} не входит в звено a1`).toBe(false)
    }
  })

  it('звено L — станция лосса: ŷ + y + L + плашка bce (Gap 4)', () => {
    const g = geometryOf('L')
    expect(g.nodes).toEqual(new Set(['ŷ', 'y', 'L']))
    expect(g.plates).toEqual(new Set(['bce']))
  })

  it('звено x — вход в цепи: узлы x + подводы примера (Gap 1)', () => {
    const g = geometryOf('x')
    expect(g.nodes).toEqual(new Set(['x[0]', 'x[1]']))
    expect(g.edges).toEqual(new Set(['sample-feed[0]', 'sample-feed[1]']))
  })
})

describe('chainLinks: контракт станций CHAIN_GEOMETRY_IDS (01.2-04)', () => {
  it('12 узлов / 11 рёбер / 3 плашки / 4 биаса: станции z1[0..2], z2, плашка bce', () => {
    expect(CHAIN_GEOMETRY_IDS.nodes).toHaveLength(12) // x×2, z1×3, a1×3, z2, ŷ, y, L
    expect(CHAIN_GEOMETRY_IDS.edges).toHaveLength(11) // W1×6 + W2×3 + подводы×2
    expect(CHAIN_GEOMETRY_IDS.plates).toHaveLength(3) // tanh, σ, bce
    expect(CHAIN_GEOMETRY_IDS.biases).toHaveLength(4) // b1×3 + b2×1
    expect(new Set(CHAIN_GEOMETRY_IDS.nodes)).toEqual(
      new Set(['x[0]', 'x[1]', 'z1[0]', 'z1[1]', 'z1[2]', 'a1[0]', 'a1[1]', 'a1[2]', 'z2', 'ŷ', 'y', 'L']),
    )
    expect(new Set(CHAIN_GEOMETRY_IDS.edges)).toEqual(
      new Set([
        'W1[0]',
        'W1[1]',
        'W1[2]',
        'W1[3]',
        'W1[4]',
        'W1[5]',
        'W2[0]',
        'W2[1]',
        'W2[2]',
        'sample-feed[0]',
        'sample-feed[1]',
      ]),
    )
    expect(new Set(CHAIN_GEOMETRY_IDS.plates)).toEqual(new Set(['tanh', 'σ', 'bce']))
  })

  it('вся геометрия звеньев (geometryOf seg и sym) ссылается только на id контракта', () => {
    const ids = {
      nodes: new Set(CHAIN_GEOMETRY_IDS.nodes),
      edges: new Set(CHAIN_GEOMETRY_IDS.edges),
      plates: new Set(CHAIN_GEOMETRY_IDS.plates),
      biases: new Set(CHAIN_GEOMETRY_IDS.biases),
    }
    for (const s of SEGMENTS) {
      const geometries = [geometryOf(s.id), ...s.symbols.map((sym) => geometryOf(s.id, sym))]
      for (const g of geometries) {
        for (const n of g.nodes) expect(ids.nodes.has(n), `узел «${n}» есть в контракте`).toBe(true)
        for (const e of g.edges) expect(ids.edges.has(e), `ребро «${e}» есть в контракте`).toBe(true)
        for (const p of g.plates) expect(ids.plates.has(p), `плашка «${p}» есть в контракте`).toBe(true)
        for (const b of g.biases) expect(ids.biases.has(b), `биас «${b}» есть в контракте`).toBe(true)
      }
    }
  })

  it('каждая сущность контракта покрыта хотя бы одним звеном (подсвечиваема выбором)', () => {
    const covered = { nodes: new Set<string>(), edges: new Set<string>(), plates: new Set<string>(), biases: new Set<string>() }
    for (const s of SEGMENTS) {
      const g = geometryOf(s.id)
      g.nodes.forEach((n) => covered.nodes.add(n))
      g.edges.forEach((e) => covered.edges.add(e))
      g.plates.forEach((p) => covered.plates.add(p))
      g.biases.forEach((b) => covered.biases.add(b))
    }
    expect([...covered.nodes].sort()).toEqual([...CHAIN_GEOMETRY_IDS.nodes].sort())
    expect([...covered.edges].sort()).toEqual([...CHAIN_GEOMETRY_IDS.edges].sort())
    expect([...covered.plates].sort()).toEqual([...CHAIN_GEOMETRY_IDS.plates].sort())
    expect([...covered.biases].sort()).toEqual([...CHAIN_GEOMETRY_IDS.biases].sort())
  })
})
