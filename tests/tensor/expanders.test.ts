import { describe, expect, it } from 'vitest'
import { XOR_SCENARIO } from '../../src/run/scenario'
import { expandScalar, MLP, SampleCursor, tensorValuesOf, Value, type Operand } from '../../src/tensor'

/**
 * Инвариант «drill-down = движок» per-op (R1 §4.4 Р-1, NFR-02): ленивое
 * скалярное раскрытие экспандера совпадает с элементом векторного результата
 * ЖИВОГО движка (допуск ≤ 1e-12 — расхождение = ошибка порядка суммирования),
 * раскрытие строится только по запросу; формулы несут подстановку чисел
 * (данные тултипов 01.1-04). Числа — эталонный сэмпл 1 на стартовых весах.
 */

const TOL = 1e-12

/** Снапшот-операнд с подсчётом чтений (ленивость: 0 чтений до запроса). */
function snapOp(sym: string, values: number[] | number[][]): { op: Operand; reads: () => number } {
  let reads = 0
  const op: Operand = {
    sym,
    get: () => {
      reads += 1
      return values
    },
  }
  return { op, reads: () => reads }
}

/** Живой движок: операции 0..opCount-1 сэмпла 1 (курсор с записью, как в UI). */
function engineTo(opCount: number): { model: MLP; cursor: SampleCursor } {
  const model = new MLP(XOR_SCENARIO.startWeights)
  const sample = XOR_SCENARIO.samples[0]!
  const cursor = new SampleCursor(model, sample.x, sample.y, XOR_SCENARIO.lr)
  for (let k = 0; k < opCount; k++) cursor.advance()
  return { model, cursor }
}

function expectClose(actual: number, expected: number, ctx: string): void {
  expect(Math.abs(actual - expected), `${ctx}: |${String(actual)} − ${String(expected)}| ≤ ${String(TOL)}`).toBeLessThanOrEqual(TOL)
}

describe('инвариант «drill-down = движок» per-op (forward)', () => {
  it('matvec (слой 1): z1[j] — все строки', () => {
    const { model, cursor } = engineTo(1)
    const w = snapOp('W1', tensorValuesOf(model.W1) as number[][])
    const x = snapOp('x', Array.from(cursor.x.data))
    for (let j = 0; j < 3; j++) {
      const exp = expandScalar({ kind: 'matvec', w: w.op, x: x.op, row: j })
      expectClose(exp.value, cursor.tensors.z1p!.data[j]!, `z1[${String(j)}]`)
    }
  })

  it('add (слой 1): z1[i] = z1_pre[i] + b1[i]', () => {
    const { model, cursor } = engineTo(2)
    const a = snapOp('z1', Array.from(cursor.tensors.z1p!.data))
    const b = snapOp('b1', tensorValuesOf(model.b1) as number[])
    for (let i = 0; i < 3; i++) {
      const exp = expandScalar({ kind: 'add', a: a.op, b: b.op, index: i })
      expectClose(exp.value, cursor.tensors.z1!.data[i]!, `z1[${String(i)}]`)
    }
  })

  it('tanh: a1[i] — все три активации', () => {
    const { cursor } = engineTo(3)
    const z = snapOp('z1', Array.from(cursor.tensors.z1!.data))
    for (let i = 0; i < 3; i++) {
      const exp = expandScalar({ kind: 'tanh', z: z.op, index: i })
      expectClose(exp.value, cursor.tensors.a1!.data[i]!, `a1[${String(i)}]`)
    }
  })

  it('matvec (слой 2): z2 = W2·a1', () => {
    const { model, cursor } = engineTo(4)
    const w = snapOp('W2', tensorValuesOf(model.W2) as number[][])
    const a1 = snapOp('a1', Array.from(cursor.tensors.a1!.data))
    const exp = expandScalar({ kind: 'matvec', w: w.op, x: a1.op, row: 0 })
    expectClose(exp.value, cursor.tensors.z2p!.data[0]!, 'z2')
  })

  it('add (слой 2): z2 = z2_pre + b2', () => {
    const { model, cursor } = engineTo(5)
    const a = snapOp('z2', Array.from(cursor.tensors.z2p!.data))
    const b = snapOp('b2', tensorValuesOf(model.b2) as number[])
    const exp = expandScalar({ kind: 'add', a: a.op, b: b.op, index: 0 })
    expectClose(exp.value, cursor.tensors.z2!.data[0]!, 'z2')
  })

  it('sigmoid: ŷ = σ(z2)', () => {
    const { cursor } = engineTo(6)
    const z = snapOp('z2', Array.from(cursor.tensors.z2!.data))
    const exp = expandScalar({ kind: 'sigmoid', z: z.op, index: 0 })
    expectClose(exp.value, cursor.tensors.yhat!.data[0]!, 'yhat')
  })

  it('bce: L = −[y·ln ŷ + (1−y)·ln(1−ŷ)]', () => {
    const { cursor } = engineTo(7)
    const p = snapOp('ŷ', Array.from(cursor.tensors.yhat!.data))
    const t = snapOp('y', Array.from(cursor.y.data))
    const exp = expandScalar({ kind: 'bce', p: p.op, t: t.op })
    expectClose(exp.value, cursor.tensors.L!.data[0]!, 'L')
  })
})

describe('инвариант «drill-down = движок» per-op (backward-градиенты)', () => {
  it('bce-grad: ∂L/∂ŷ = (ŷ−y)/(ŷ(1−ŷ))', () => {
    const { cursor } = engineTo(8)
    const p = snapOp('ŷ', Array.from(cursor.tensors.yhat!.data))
    const t = snapOp('y', Array.from(cursor.y.data))
    const exp = expandScalar({ kind: 'bce-grad', p: p.op, t: t.op })
    expectClose(exp.value, cursor.tensors.yhat!.grad![0]!, 'dyhat')
  })

  it('sigmoid-grad: ∂L/∂z2 = ∂L/∂ŷ · ŷ(1−ŷ)', () => {
    const { cursor } = engineTo(9)
    const out = snapOp('ŷ', Array.from(cursor.tensors.yhat!.data))
    const gOut = snapOp('∂L/∂ŷ', Array.from(cursor.tensors.yhat!.grad!))
    const exp = expandScalar({ kind: 'sigmoid-grad', out: out.op, gOut: gOut.op, index: 0 })
    expectClose(exp.value, cursor.tensors.z2!.grad![0]!, 'dz2')
  })

  it('matvec-grad (слой 2): ∂L/∂W2[j,i] = ∂L/∂z2[j]·a1[i] — все 3 веса; add-grad: ∂L/∂b2', () => {
    const { model, cursor } = engineTo(10)
    const gOut = snapOp('∂L/∂z2', Array.from(cursor.tensors.z2!.grad!))
    const a1 = snapOp('a1', Array.from(cursor.tensors.a1!.data))
    for (let i = 0; i < 3; i++) {
      const exp = expandScalar({ kind: 'matvec-grad-w', gOut: gOut.op, x: a1.op, row: 0, col: i })
      expectClose(exp.value, model.W2.grad![i]!, `dW2[0,${String(i)}]`)
    }
    const db2 = expandScalar({ kind: 'add-grad', gOut: gOut.op, index: 0 })
    expectClose(db2.value, model.b2.grad![0]!, 'db2')
  })

  it('matvec-grad-x (слой 2): ∂L/∂a1[i] = Σ_j W2[j,i]·∂L/∂z2[j]', () => {
    const { model, cursor } = engineTo(10)
    const w = snapOp('W2', tensorValuesOf(model.W2) as number[][])
    const gOut = snapOp('∂L/∂z2', Array.from(cursor.tensors.z2!.grad!))
    for (let i = 0; i < 3; i++) {
      const exp = expandScalar({ kind: 'matvec-grad-x', w: w.op, gOut: gOut.op, col: i })
      expectClose(exp.value, cursor.tensors.a1!.grad![i]!, `da1[${String(i)}]`)
    }
  })

  it('tanh-grad: ∂L/∂z1[i] = ∂L/∂a1[i]·(1−a1[i]²)', () => {
    const { cursor } = engineTo(11)
    const a = snapOp('a1', Array.from(cursor.tensors.a1!.data))
    const gOut = snapOp('∂L/∂a1', Array.from(cursor.tensors.a1!.grad!))
    for (let i = 0; i < 3; i++) {
      const exp = expandScalar({ kind: 'tanh-grad', a: a.op, gOut: gOut.op, index: i })
      expectClose(exp.value, cursor.tensors.z1!.grad![i]!, `dz1[${String(i)}]`)
    }
  })

  it('matvec-grad (слой 1): ∂L/∂W1 — все 6 весов; ∂L/∂b1; add-grad', () => {
    const { model, cursor } = engineTo(12)
    const gOut = snapOp('∂L/∂z1', Array.from(cursor.tensors.z1!.grad!))
    const x = snapOp('x', Array.from(cursor.x.data))
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 2; i++) {
        const exp = expandScalar({ kind: 'matvec-grad-w', gOut: gOut.op, x: x.op, row: j, col: i })
        expectClose(exp.value, model.W1.grad![j * 2 + i]!, `dW1[${String(j)},${String(i)}]`)
      }
      const db1 = expandScalar({ kind: 'add-grad', gOut: gOut.op, index: j })
      expectClose(db1.value, model.b1.grad![j]!, `db1[${String(j)}]`)
    }
  })

  it('matvec-grad-x (слой 1): ∂L/∂x[i] = Σ_j W1[j,i]·∂L/∂z1[j]', () => {
    const { model, cursor } = engineTo(12)
    const w = snapOp('W1', tensorValuesOf(model.W1) as number[][])
    const gOut = snapOp('∂L/∂z1', Array.from(cursor.tensors.z1!.grad!))
    for (let i = 0; i < 2; i++) {
      const exp = expandScalar({ kind: 'matvec-grad-x', w: w.op, gOut: gOut.op, col: i })
      expectClose(exp.value, cursor.x.grad![i]!, `dx[${String(i)}]`)
    }
  })

  it('sgd: W2[i] после = W2[i] − η·∂L/∂W2[i] (снапшоты «до» + градиенты)', () => {
    const { model, cursor } = engineTo(12) // sgd ещё не исполнена
    const wBefore = snapOp('W2', tensorValuesOf(model.W2) as number[][])
    const g = snapOp('∂L/∂W2', tensorValuesOf(model.W2) as number[][])
    const wBeforeValues = Array.from(model.W2.data)
    cursor.advance() // оп 12: sgd мутирует веса
    for (let i = 0; i < 3; i++) {
      const exp = expandScalar({ kind: 'sgd', w: wBefore.op, g: g.op, lr: cursor.lr, index: i })
      expectClose(exp.value, model.W2.data[i]!, `W2[${String(i)}] после sgd`)
    }
    // «до»-снапшот не совпадает с «после» — раскрытие действительно пересчитывает update
    expect(wBeforeValues[0]).not.toBe(model.W2.data[0]!)
  })
})

describe('ленивость экспандеров (R1 §4.4 Р-4)', () => {
  it('цепочка не строится до первого запроса .value; снапшоты читаются один раз и кэшируются', () => {
    const { model, cursor } = engineTo(1)
    const w = snapOp('W1', tensorValuesOf(model.W1) as number[][])
    const x = snapOp('x', Array.from(cursor.x.data))
    const exp = expandScalar({ kind: 'matvec', w: w.op, x: x.op, row: 1 })
    expect(exp.computed, 'запрос раскрытия ничего не вычисляет').toBe(false)
    expect(w.reads(), 'операнд W1 не читается до запроса').toBe(0)
    expect(x.reads(), 'операнд x не читается до запроса').toBe(0)
    const value = exp.value
    expect(exp.computed, 'первое обращение строит цепочку').toBe(true)
    expect(w.reads(), 'снапшот W1 прочитан ровно один раз').toBe(1)
    expect(x.reads(), 'снапшот x прочитан ровно один раз').toBe(1)
    expect(exp.value, 'повторное обращение — из кэша').toBe(value)
    expect(w.reads(), 'кэш не перечитывает операнды').toBe(1)
    expect(exp.formula, 'формула тоже из кэша').toContain('W1[1,0]·x[0]')
    expect(w.reads()).toBe(1)
  })
})

describe('формулы с подстановкой чисел (данные тултипов 01.1-04)', () => {
  it('matvec: символы + подставленные числа в порядке суммирования + результат', () => {
    const { model, cursor } = engineTo(1)
    const w = snapOp('W1', tensorValuesOf(model.W1) as number[][])
    const x = snapOp('x', Array.from(cursor.x.data))
    const exp = expandScalar({ kind: 'matvec', w: w.op, x: x.op, row: 1 })
    expect(exp.formula).toBe('W1[1,0]·x[0] + W1[1,1]·x[1] = −0.9229·1 + 0.3924·0 = −0.9229')
  })

  it('градиент matvec: цепочка «∂L/∂W1[j,i] = ∂L/∂z1[j] · x[i]» с числами', () => {
    const { cursor } = engineTo(12)
    const gOut = snapOp('∂L/∂z1', Array.from(cursor.tensors.z1!.grad!))
    const x = snapOp('x', Array.from(cursor.x.data))
    const exp = expandScalar({ kind: 'matvec-grad-w', gOut: gOut.op, x: x.op, row: 1, col: 0 })
    expect(exp.formula).toBe('∂L/∂z1[1]·x[0] = 0.02814·1 = 0.02814')
  })

  it('sgd: W = W − η·∂L/∂W с числами (η = 0.5)', () => {
    const { model } = engineTo(12)
    const w = snapOp('W2', tensorValuesOf(model.W2) as number[][])
    const g = snapOp('∂L/∂W2', tensorValuesOf(model.W2) as number[][])
    const exp = expandScalar({ kind: 'sgd', w: w.op, g: g.op, lr: 0.5, index: 0 })
    expect(exp.formula).toBe('W2[0] − η·∂L/∂W2[0] = −0.1352 − 0.5·0.3905 = −0.3305')
  })
})

describe('скалярное ядро Value (порт gen_mock_trace.py, micrograd-механика)', () => {
  it('backward топологически раскручивает граф; повторное использование узла даёт сумму путей', () => {
    const a = new Value(2, { label: 'a' })
    const b = new Value(-3, { label: 'b' })
    const c = a.mul(b).add(a) // c = a·b + a = −4
    c.backward()
    expect(c.data).toBe(-4)
    expect(a.grad, 'dc/da = b + 1').toBe(-2)
    expect(b.grad, 'dc/db = a').toBe(2)
  })

  it('tanh/sigmoid/log/div: локальные производные против аналитических', () => {
    const z = new Value(0.7, { label: 'z' })
    z.tanh().div(new Value(2, { label: '2' })).backward()
    expect(z.grad).toBeCloseTo((1 - Math.tanh(0.7) ** 2) / 2, 15)

    const u = new Value(0.5, { label: 'u' })
    u.sigmoid().log().backward()
    expect(u.grad).toBeCloseTo(1 - 1 / (1 + Math.exp(-0.5)), 15) // d/du ln(σ(u)) = 1−σ(u)
  })
})
