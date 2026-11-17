import { describe, expect, it } from 'vitest'
import { NEURON_SCENARIO, XOR_SCENARIO } from '../../run/scenario'
import { buildGraph, graphBounds, NODE_H, NODE_W } from './geometry'
import { FRAME_OP_HALF, FRAME_PAD, frameGeometry, frameOfNode } from './frames'

/**
 * Гейты рамок-нейронов (2.1-03, фикс 4; ревизия ревью UAT 2026-11-17):
 * рамка охватывает внутренние веса и вычисления нейрона — параметры (w, b)
 * и операции взвешенной суммы («·», «+») — и НЕ охватывает последующие
 * вычисления (z, a1, ŷ), активации (σ/tanh) и входы. Геометрия — чистая
 * функция структуры (детерминизм), каждый член существует и принадлежит
 * ровно одной рамке, коробка вмещает членов, не-члены вне коробок.
 */
describe('frames: рамки-нейроны neuron (1) и XOR (4)', () => {
  it('neuron — ровно 1 рамка «Нейрон 1»; XOR — ровно 4 (скрытые 1–3 + выходной 4)', () => {
    expect(NEURON_SCENARIO.render.frames.map((f) => f.title)).toEqual(['Нейрон 1'])
    expect(XOR_SCENARIO.render.frames).toHaveLength(4)
    expect(XOR_SCENARIO.render.frames.map((f) => f.title)).toEqual(['Нейрон 1', 'Нейрон 2', 'Нейрон 3', 'Нейрон 4'])
  })

  it('каждый член рамки существует в узлах спека; член принадлежит ровно одной рамке', () => {
    for (const spec of [NEURON_SCENARIO, XOR_SCENARIO]) {
      const known = new Set(spec.render.nodes.map((n) => n.id))
      const owner = new Map<string, string>()
      for (const f of spec.render.frames) {
        expect(f.nodes.length, `${f.id}: члены непусты`).toBeGreaterThan(0)
        for (const id of f.nodes) {
          expect(known.has(id), `${f.id}: член ${id} существует`).toBe(true)
          expect(owner.has(id), `${id} не в двух рамках`).toBe(false)
          owner.set(id, f.id)
        }
      }
    }
  })

  it('члены — только внутренние веса и вычисления (w, b, «·», «+»); значения/активации/входы — не члены (ревью UAT)', () => {
    for (const spec of [NEURON_SCENARIO, XOR_SCENARIO]) {
      const members = new Set(spec.render.frames.flatMap((f) => f.nodes))
      for (const n of spec.render.nodes) {
        const internal = n.role === 'param' || (n.kind === 'op' && (n.label === '·' || n.label === '+'))
        if (internal) {
          expect(members.has(n.id), `${n.id} — внутренний вес/вычисление нейрона — член рамки`).toBe(true)
        } else {
          expect(members.has(n.id), `${n.id} (${n.role}${n.kind === 'op' ? ` ${n.label}` : ''}) — последующее вычисление — вне рамки`).toBe(false)
        }
      }
    }
  })

  it('output-биндинг и drill у каждой рамки валидны', () => {
    for (const spec of [NEURON_SCENARIO, XOR_SCENARIO]) {
      for (const f of spec.render.frames) {
        expect(f.output.kind, `${f.id}: output-биндинг задан`).toBeTruthy()
        expect(f.drill.length, `${f.id}: drill-реф непуст`).toBeGreaterThan(0)
      }
    }
  })

  it('frameGeometry: коробка вмещает всех членов (bbox + PAD); два вызова бит-идентичны', () => {
    for (const spec of [NEURON_SCENARIO, XOR_SCENARIO]) {
      const a = frameGeometry(spec)
      const b = frameGeometry(spec)
      expect(JSON.stringify(a), 'детерминизм геометрии').toBe(JSON.stringify(b))
      const nodes = new Map(buildGraph(spec).nodes.map((n) => [n.id, n]))
      for (const box of a) {
        const frame = spec.render.frames.find((f) => f.id === box.id)!
        for (const id of frame.nodes) {
          const n = nodes.get(id)!
          expect(n.x, `${id} внутри рамки ${box.id} по x`).toBeGreaterThanOrEqual(box.x)
          expect(n.x, `${id} внутри рамки ${box.id} по x`).toBeLessThanOrEqual(box.x + box.w)
          expect(n.y, `${id} внутри рамки ${box.id} по y`).toBeGreaterThanOrEqual(box.y)
          expect(n.y, `${id} внутри рамки ${box.id} по y`).toBeLessThanOrEqual(box.y + box.h)
        }
      }
    }
  })

  it('коробки рамок не выходят за канву и не пересекаются между собой', () => {
    for (const spec of [NEURON_SCENARIO, XOR_SCENARIO]) {
      const { w, h } = graphBounds(spec)
      const boxes = frameGeometry(spec)
      for (const box of boxes) {
        expect(box.x, `${box.id}: лево в канве`).toBeGreaterThanOrEqual(0)
        expect(box.y, `${box.id}: верх в канве`).toBeGreaterThanOrEqual(0)
        expect(box.x + box.w, `${box.id}: право в канве`).toBeLessThanOrEqual(w)
        expect(box.y + box.h, `${box.id}: низ в канве`).toBeLessThanOrEqual(h)
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!
          const b = boxes[j]!
          const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
          expect(overlap, `рамки ${a.id} и ${b.id} не пересекаются`).toBe(false)
        }
      }
    }
  })

  it('не-члены геометрически вне коробок: рамка не накрывает последующие вычисления (z, a1, ŷ, σ/tanh, входы)', () => {
    for (const spec of [NEURON_SCENARIO, XOR_SCENARIO]) {
      const members = new Set(spec.render.frames.flatMap((f) => f.nodes))
      const nodes = buildGraph(spec).nodes
      for (const box of frameGeometry(spec)) {
        for (const n of nodes) {
          if (members.has(n.id)) continue
          const hx = n.kind === 'op' ? FRAME_OP_HALF : NODE_W / 2
          const hy = n.kind === 'op' ? FRAME_OP_HALF : NODE_H / 2
          const overlap = n.x + hx > box.x && n.x - hx < box.x + box.w && n.y + hy > box.y && n.y - hy < box.y + box.h
          expect(overlap, `${n.id} не накрыт коробкой рамки ${box.id}`).toBe(false)
        }
      }
    }
  })

  it('frameOfNode: параметры и «·»/«+» — члены; входы/значения/активации — нет', () => {
    const owner = frameOfNode(NEURON_SCENARIO)
    expect(owner.get('W[0]'), 'вес — внутри рамки (ревью UAT)').toBe('n1')
    expect(owner.get('b[0]'), 'биас — внутри рамки').toBe('n1')
    expect(owner.get('op:matvec')).toBe('n1')
    expect(owner.get('op:add')).toBe('n1')
    expect(owner.has('x[0]'), 'входы вне рамки').toBe(false)
    expect(owner.has('z'), 'z — последующее вычисление — вне рамки').toBe(false)
    expect(owner.has('op:sigmoid'), 'активация вне рамки').toBe(false)
    expect(owner.has('ŷ'), 'ŷ вне рамки').toBe(false)
    expect(FRAME_PAD).toBe(12)
    expect(NODE_W).toBe(NODE_H) // квадратные блоки (фикс 5)
  })
})
