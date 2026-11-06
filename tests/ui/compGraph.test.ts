/**
 * Модель графа вычислений (01.2-06, правила владельца 2026-11-05): диаграмма =
 * буквальный вычислительный граф движка — звено-значение (закруглённый
 * квадрат) и звено-операция (круг), операции по-элементно; константы (x, y) —
 * белая рамка, параметры (W1/b1/W2/b2, 13 шт.) — зелёная; ОДНА update-станция
 * «W ← W − η·∂L/∂W»; раскладка детерминирована (ранг-колонки × строки,
 * фиксированный pitch — рамки канвы вычислимы из структуры). Гейты:
 * детерминизм, связность (каждое звено имеет ≥1 ребро), инвентарь, группы
 * звеньев цепи и 13 шагов ленты.
 */

import { describe, expect, it } from 'vitest'
import {
  GRAPH_EDGES,
  GRAPH_NODES,
  SEGMENT_GROUPS,
  STEP_GROUPS,
  buildGraph,
  graphBounds,
} from '../../src/ui/compGraph'

const ids = (xs: readonly { id: string }[]): string[] => xs.map((n) => n.id)

describe('compGraph: инвентарь звеньев XOR 2-3-1', () => {
  it('константы: x[0], x[1], y[0] — белая рамка', () => {
    const consts = GRAPH_NODES.filter((n) => n.role === 'const')
    expect(ids(consts).sort()).toEqual(['x[0]', 'x[1]', 'y[0]'])
  })

  it('параметры: все 13 (W1×6, b1×3, W2×3, b2) отображены и обновляются (Gap-ответ владельца)', () => {
    const params = GRAPH_NODES.filter((n) => n.role === 'param')
    expect(params).toHaveLength(13)
    for (const expectId of ['W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]', 'b1[0]', 'b1[1]', 'b1[2]', 'W2[0]', 'W2[1]', 'W2[2]', 'b2[0]']) {
      expect(params.some((p) => p.id === expectId), `параметр ${expectId} в графе`).toBe(true)
    }
  })

  it('операции по-элементно: matvec×3, add×3, tanh×3, matvec2, add2, σ, bce + РОВНО ОДНА update-станция', () => {
    const ops = GRAPH_NODES.filter((n) => n.kind === 'op')
    expect(ops).toHaveLength(14)
    expect(ops.filter((n) => n.id === 'op:update')).toHaveLength(1)
    expect(ops.filter((n) => n.label === 'tanh')).toHaveLength(3)
    expect(ops.filter((n) => n.label === '·')).toHaveLength(4) // matvec×3 + matvec2
    expect(ops.filter((n) => n.label === '+')).toHaveLength(4) // add×3 + add2
  })

  it('промежуточные значения — отдельные звенья: W1x×3, z1×3, a1×3, W2a1, z2, ŷ, L', () => {
    const computed = GRAPH_NODES.filter((n) => n.role === 'computed')
    expect(ids(computed).sort()).toEqual(['L', 'W1x[0]', 'W1x[1]', 'W1x[2]', 'W2a1', 'a1[0]', 'a1[1]', 'a1[2]', 'ŷ', 'z1[0]', 'z1[1]', 'z1[2]', 'z2'])
  })

  it('итого 43 звена: 3 константы + 13 параметров + 14 операций + 13 значений', () => {
    expect(GRAPH_NODES).toHaveLength(43)
  })
})

describe('compGraph: детерминированные рамки канвы', () => {
  it('buildGraph() детерминирован: два вызова дают бит-идентичные координаты', () => {
    const a = buildGraph()
    const b = buildGraph()
    const pos = (g: typeof a): Record<string, string> => Object.fromEntries(g.nodes.map((n) => [n.id, `${n.x},${n.y}`]))
    expect(pos(a)).toEqual(pos(b))
    expect(a.view).toEqual(b.view)
  })

  it('все звенья внутри рамок канвы (0 ≤ x ≤ W, 0 ≤ y ≤ H)', () => {
    const { nodes, view } = buildGraph()
    const { w, h } = graphBounds()
    expect(view).toEqual({ w, h })
    for (const n of nodes) {
      expect(n.x, `узел ${n.id}: x ≥ 0`).toBeGreaterThanOrEqual(0)
      expect(n.y, `узел ${n.id}: y ≥ 0`).toBeGreaterThanOrEqual(0)
      expect(n.x, `узел ${n.id}: x в рамках`).toBeLessThanOrEqual(w)
      expect(n.y, `узел ${n.id}: y в рамках`).toBeLessThanOrEqual(h)
    }
  })

  it('ранг-колонки растут слева-направо по цепи: x/W1 → … → L → update', () => {
    const byId = new Map(GRAPH_NODES.map((n) => [n.id, n]))
    expect(byId.get('x[0]')!.col).toBeLessThan(byId.get('op:matvec[0]')!.col)
    expect(byId.get('op:matvec[0]')!.col).toBeLessThan(byId.get('op:tanh[0]')!.col)
    expect(byId.get('op:tanh[0]')!.col).toBeLessThan(byId.get('op:bce')!.col)
    expect(byId.get('op:bce')!.col).toBeLessThan(byId.get('L')!.col)
    expect(byId.get('L')!.col).toBeLessThanOrEqual(byId.get('op:update')!.col)
  })
})

describe('compGraph: связность (правило владельца: звено в цепи соединено ребром)', () => {
  it('каждый узел имеет ≥1 ребро', () => {
    const touched = new Set(GRAPH_EDGES.flatMap((e) => [e.from, e.to]))
    for (const n of GRAPH_NODES) {
      expect(touched.has(n.id), `узел ${n.id} соединён ребром`).toBe(true)
    }
  })

  it('рёбра ссылаются только на существующие узлы', () => {
    const known = new Set(GRAPH_NODES.map((n) => n.id))
    for (const e of GRAPH_EDGES) {
      expect(known.has(e.from), `ребро ${e.id}: from существует`).toBe(true)
      expect(known.has(e.to), `ребро ${e.id}: to существует`).toBe(true)
    }
  })

  it('update-станция связана со всеми 13 параметрами', () => {
    const upd = GRAPH_EDGES.filter((e) => e.to === 'op:update')
    expect(upd).toHaveLength(13)
    const params = new Set(GRAPH_NODES.filter((n) => n.role === 'param').map((n) => n.id))
    for (const e of upd) expect(params.has(e.from), `update ← ${e.from}`).toBe(true)
  })
})

describe('compGraph: группы звеньев цепи и шагов ленты', () => {
  it('звено a1 = tanh-опы + a1-значения (6 элементов), z1-узлов нет', () => {
    const g = SEGMENT_GROUPS.a1!
    expect(g.nodes.size).toBe(6)
    expect([...g.nodes].filter((id) => id.startsWith('op:tanh')).length).toBe(3)
    expect([...g.nodes].filter((id) => id.startsWith('a1[')).length).toBe(3)
    for (const id of SEGMENT_GROUPS.z1!.nodes) {
      if (id.startsWith('z1[')) expect(g.nodes.has(id), `z1-узел ${id} не входит в a1`).toBe(false)
    }
  })

  it('звено L = bce + y + L (+ŷ на входе оператора)', () => {
    const g = SEGMENT_GROUPS.L!
    for (const id of ['op:bce', 'y[0]', 'L']) expect(g.nodes.has(id), `L содержит ${id}`).toBe(true)
  })

  it('каждое звено цепи имеет непустую группу; каждая из 13 шагов ленты — непустую', () => {
    for (const seg of ['x', 'z1', 'a1', 'z2', 'yhat', 'L', 'W'] as const) {
      expect(SEGMENT_GROUPS[seg]!.nodes.size, `группа ${seg} непуста`).toBeGreaterThan(0)
    }
    expect(Object.keys(STEP_GROUPS)).toHaveLength(13)
    for (const [step, g] of Object.entries(STEP_GROUPS)) {
      expect(g.nodes.size, `шаг ${step} имеет группу узлов`).toBeGreaterThan(0)
    }
  })

  it('13-й шаг (sgd) — update-станция и параметры', () => {
    const g = STEP_GROUPS[12]!
    expect(g.nodes.has('op:update')).toBe(true)
    expect([...g.nodes].filter((id) => id.startsWith('W') || id.startsWith('b')).length).toBe(13)
  })
})
