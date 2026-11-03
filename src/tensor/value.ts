/**
 * Скалярное ядро (R1, порт gen_mock_trace.py): Value с data/grad/op/parents
 * и topo-backward механикой micrograd. Используется ТОЛЬКО ленивыми
 * экспандерами drill-down (expanders.ts) — A-математика по требованию,
 * view-слой над снапшотами чисел; гранулярность ИСПОЛНЕНИЯ walkthrough
 * остаётся op-level (решение R1: чистый micrograd-порт как движок отвергнут).
 *
 * Семантика как в Python: forward создаёт новые узлы, grad аккумулируется
 * на месте (+=), backward сеет ∂L/∂L = 1 в корне и идёт по topo-порядку.
 */

export type ScalarOp = '' | '+' | '-' | '*' | '/' | 'neg' | 'tanh' | 'sigmoid' | 'log'

export interface ValueInit {
  op?: ScalarOp
  parents?: readonly Value[]
  label?: string
}

export class Value {
  readonly data: number
  grad = 0
  readonly op: ScalarOp
  readonly label: string
  readonly parents: readonly Value[]
  private backwardFn: () => void = () => {}

  constructor(data: number, init: ValueInit = {}) {
    this.data = data
    this.op = init.op ?? ''
    this.label = init.label ?? ''
    this.parents = init.parents ?? []
  }

  add(o: Value): Value {
    const out = new Value(this.data + o.data, { op: '+', parents: [this, o] })
    out.backwardFn = () => {
      this.grad += out.grad
      o.grad += out.grad
    }
    return out
  }

  sub(o: Value): Value {
    const out = new Value(this.data - o.data, { op: '-', parents: [this, o] })
    out.backwardFn = () => {
      this.grad += out.grad
      o.grad += -out.grad
    }
    return out
  }

  mul(o: Value): Value {
    const out = new Value(this.data * o.data, { op: '*', parents: [this, o] })
    out.backwardFn = () => {
      this.grad += out.grad * o.data
      o.grad += out.grad * this.data
    }
    return out
  }

  div(o: Value): Value {
    const out = new Value(this.data / o.data, { op: '/', parents: [this, o] })
    out.backwardFn = () => {
      this.grad += out.grad / o.data
      o.grad += (-out.grad * this.data) / (o.data * o.data)
    }
    return out
  }

  neg(): Value {
    const out = new Value(-this.data, { op: 'neg', parents: [this] })
    out.backwardFn = () => {
      this.grad += -out.grad
    }
    return out
  }

  tanh(): Value {
    const out = new Value(Math.tanh(this.data), { op: 'tanh', parents: [this] })
    out.backwardFn = () => {
      this.grad += out.grad * (1 - out.data * out.data)
    }
    return out
  }

  sigmoid(): Value {
    const s = 1 / (1 + Math.exp(-this.data))
    const out = new Value(s, { op: 'sigmoid', parents: [this] })
    out.backwardFn = () => {
      this.grad += out.grad * s * (1 - s)
    }
    return out
  }

  log(): Value {
    const out = new Value(Math.log(this.data), { op: 'log', parents: [this] })
    out.backwardFn = () => {
      this.grad += out.grad / this.data
    }
    return out
  }

  /** Топологическая развёртка графа + обратный проход (micrograd-канон). */
  backward(): void {
    const topo: Value[] = []
    const seen = new Set<Value>()
    const visit = (v: Value): void => {
      if (seen.has(v)) return
      seen.add(v)
      for (const p of v.parents) visit(p)
      topo.push(v)
    }
    visit(this)
    this.grad = 1 // сеем ∂L/∂L = 1
    for (let k = topo.length - 1; k >= 0; k--) topo[k]!.backwardFn()
  }
}
