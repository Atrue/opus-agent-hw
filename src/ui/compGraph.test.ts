/**
 * Модель графа вычислений (01.2-06, правила владельца 2026-11-05; D-32 —
 * лосс вне графа): диаграмма = буквальный вычислительный граф сети —
 * звено-значение (закруглённый квадрат) и звено-операция (круг), операции
 * по-элементно; константы (x) — белая рамка, параметры — зелёная; ОДНА
 * update-станция «W ← W − η·∂L/∂W»; раскладка детерминирована
 * (ранг-колонки × строки, фиксированный pitch — рамки канвы вычислимы
 * из структуры).
 *
 * 02-05: инвентарь параметризован спеком — XOR 2-3-1 (регрессия
 * движка) и «один нейрон» 2-1 (D-31 — носитель MVP R1). Гейты:
 * детерминизм, связность (каждое звено имеет ≥1 ребро), инвентарь,
 * группы звеньев цепи и шагов ленты (8 у нейрона, 13 у XOR),
 * отсутствие dangling-ссылок в группах (D-32).
 */

import { describe, expect, it } from 'vitest'
import { buildGraph, buildInventory, graphBounds, type GraphNode } from './compGraph'
import { NEURON_SCENARIO, XOR_SCENARIO, type ScenarioModel } from '../run/scenario'

const ids = (xs: readonly { id: string }[]): string[] => xs.map((n) => n.id)

/** Инвентарь + контракт-проверки, общие для любого сценария (D-30). */
function inventoryGates(spec: ScenarioModel, label: string): void {
  const inv = buildInventory(spec)

  it(`${label}: каждый узел имеет ≥1 ребро; рёбра ссылаются только на существующие узлы`, () => {
    const touched = new Set(inv.edges.flatMap((e) => [e.from, e.to]))
    const known = new Set(inv.nodes.map((n) => n.id))
    for (const n of inv.nodes) {
      expect(touched.has(n.id), `${label}: узел ${n.id} соединён ребром`).toBe(true)
    }
    for (const e of inv.edges) {
      expect(known.has(e.from), `${label}: ребро ${e.id}: from существует`).toBe(true)
      expect(known.has(e.to), `${label}: ребро ${e.id}: to существует`).toBe(true)
    }
  })

  it(`${label}: РОВНО ОДНА update-станция связана со всеми параметрами`, () => {
    expect(inv.nodes.filter((n) => n.id === 'op:update')).toHaveLength(1)
    const params = inv.nodes.filter((n) => n.role === 'param')
    const upd = inv.edges.filter((e) => e.to === 'op:update')
    expect(upd).toHaveLength(params.length)
    const paramIds = new Set(params.map((p) => p.id))
    for (const e of upd) expect(paramIds.has(e.from), `${label}: update ← ${e.from}`).toBe(true)
  })

  it(`${label}: ранг-колонки растут слева-направо по цепи: входы → ŷ → update (лосс вне графа, D-32)`, () => {
    const byId = new Map<string, GraphNode>(inv.nodes.map((n) => [n.id, n]))
    expect(byId.get('x[0]')!.col).toBeLessThan(byId.get('ŷ')!.col)
    expect(byId.get('ŷ')!.col).toBeLessThan(byId.get('op:update')!.col)
  })

  it(`${label}: ни одной dangling-ссылки — все id групп звеньев/шагов и symbolNodes существуют в графе (T-2-10)`, () => {
    const known = new Set(inv.nodes.map((n) => n.id))
    for (const seg of spec.render.segments) {
      expect(seg.nodes.length, `${label}: звено ${seg.id}: группа непуста`).toBeGreaterThan(0)
      for (const id of seg.nodes) {
        expect(known.has(id), `${label}: звено ${seg.id}: узел ${id} существует`).toBe(true)
      }
      for (const [sym, nodes] of Object.entries(seg.symbolNodes)) {
        expect(nodes.length, `${label}: ${seg.id}/${sym}: symbolNodes непусты`).toBeGreaterThan(0)
        for (const id of nodes) {
          expect(known.has(id), `${label}: ${seg.id}/${sym}: узел ${id} существует`).toBe(true)
        }
      }
    }
    for (const [step, stepIds] of spec.render.stepGroups.entries()) {
      expect(stepIds.length, `${label}: шаг ${String(step)}: группа непуста`).toBeGreaterThan(0)
      for (const id of stepIds) {
        expect(known.has(id), `${label}: шаг ${String(step)}: узел ${id} существует`).toBe(true)
      }
    }
  })

  it(`${label}: каждое звено цепи и каждая группа шагов непустые; шагов = ops.length`, () => {
    for (const seg of spec.render.segments) {
      expect(inv.segmentGroups[seg.id]!.nodes.size, `${label}: группа ${seg.id} непуста`).toBeGreaterThan(0)
    }
    expect(inv.stepGroups).toHaveLength(spec.ops.length)
    for (const [step, g] of Object.entries(inv.stepGroups)) {
      expect(g.nodes.size, `${label}: шаг ${step} имеет группу узлов`).toBeGreaterThan(0)
    }
  })

  it(`${label}: buildGraph() детерминирован; все звенья внутри рамок канвы`, () => {
    const a = buildGraph(spec)
    const b = buildGraph(spec)
    const pos = (g: typeof a): Record<string, string> => Object.fromEntries(g.nodes.map((n) => [n.id, `${n.x},${n.y}`]))
    expect(pos(a)).toEqual(pos(b))
    const { w, h } = graphBounds(spec)
    expect(a.view).toEqual({ w, h })
    for (const n of a.nodes) {
      expect(n.x, `${label}: узел ${n.id}: x в рамках`).toBeGreaterThanOrEqual(0)
      expect(n.y, `${label}: узел ${n.id}: y в рамках`).toBeGreaterThanOrEqual(0)
      expect(n.x, `${label}: узел ${n.id}: x в рамках`).toBeLessThanOrEqual(w)
      expect(n.y, `${label}: узел ${n.id}: y в рамках`).toBeLessThanOrEqual(h)
    }
  })
}

describe('compGraph: инвентарь звеньев XOR 2-3-1 (регрессия движка)', () => {
  const inv = buildInventory(XOR_SCENARIO)

  it('константы: x[0], x[1] — белая рамка (y — вне графа, D-32)', () => {
    const consts = inv.nodes.filter((n) => n.role === 'const')
    expect(ids(consts).sort()).toEqual(['x[0]', 'x[1]'])
  })

  it('параметры: все 13 (W1×6, b1×3, W2×3, b2) отображены и обновляются (Gap-ответ владельца)', () => {
    const params = inv.nodes.filter((n) => n.role === 'param')
    expect(params).toHaveLength(13)
    for (const expectId of ['W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]', 'b1[0]', 'b1[1]', 'b1[2]', 'W2[0]', 'W2[1]', 'W2[2]', 'b2[0]']) {
      expect(params.some((p) => p.id === expectId), `параметр ${expectId} в графе`).toBe(true)
    }
  })

  it('операции по-элементно: matvec×3, add×3, tanh×3, matvec2, add2, σ + РОВНО ОДНА update-станция (bce вне графа, D-32)', () => {
    const ops = inv.nodes.filter((n) => n.kind === 'op' || n.kind === 'update')
    expect(ops).toHaveLength(13)
    expect(ops.filter((n) => n.id === 'op:update')).toHaveLength(1)
    expect(ops.filter((n) => n.label === 'tanh')).toHaveLength(3)
    // matvec×3 + matvec2
    expect(ops.filter((n) => n.label === '·')).toHaveLength(4)
    // add×3 + add2
    expect(ops.filter((n) => n.label === '+')).toHaveLength(4)
  })

  it('промежуточные значения — отдельные звенья: W1x×3, z1×3, a1×3, W2a1, z2, ŷ', () => {
    const computed = inv.nodes.filter((n) => n.role === 'computed')
    expect(ids(computed).sort()).toEqual(['W1x[0]', 'W1x[1]', 'W1x[2]', 'W2a1', 'a1[0]', 'a1[1]', 'a1[2]', 'z1[0]', 'z1[1]', 'z1[2]', 'z2', 'ŷ'])
  })

  it('итого 40 звеньев: 2 константы + 13 параметров + 13 операций + 12 значений', () => {
    expect(inv.nodes).toHaveLength(40)
  })

  it('13 групп шагов ленты; 13-й (sgd) — update-станция и параметры', () => {
    expect(inv.stepGroups).toHaveLength(13)
    const g = inv.stepGroups[12]!
    expect(g.nodes.has('op:update')).toBe(true)
    expect([...g.nodes].filter((id) => id.startsWith('W') || id.startsWith('b')).length).toBe(13)
  })
})

describe('compGraph: инвентарь звеньев «один нейрон» 2-1 (D-31)', () => {
  const inv = buildInventory(NEURON_SCENARIO)

  it('12 звеньев: 2 константы (x1, x2) + 3 параметра (W₁, W₂, b) + 4 операции (· + σ + станция) + 3 значения (Wx, z, ŷ); лосс вне графа (D-32)', () => {
    expect(inv.nodes).toHaveLength(12)
    expect(ids(inv.nodes.filter((n) => n.role === 'const')).sort()).toEqual(['x[0]', 'x[1]'])
    expect(ids(inv.nodes.filter((n) => n.role === 'param')).sort()).toEqual(['W[0]', 'W[1]', 'b[0]'])
    expect(inv.nodes.filter((n) => n.kind === 'update')).toHaveLength(1)
    expect(ids(inv.nodes.filter((n) => n.role === 'computed')).sort()).toEqual(['Wx', 'z', 'ŷ'])
  })

  it('8 групп шагов ленты; 8-й (sgd) — update-станция и все 3 параметра', () => {
    expect(inv.stepGroups).toHaveLength(8)
    const g = inv.stepGroups[7]!
    expect(g.nodes.has('op:update')).toBe(true)
    expect([...g.nodes].filter((id) => id === 'W[0]' || id === 'W[1]' || id === 'b[0]')).toHaveLength(3)
  })
})

inventoryGates(XOR_SCENARIO, 'XOR')
inventoryGates(NEURON_SCENARIO, 'neuron')
