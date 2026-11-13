/**
 * Скалярное ядро (R1, micrograd-механика): Value с data/grad/op/parents
 * и topo-backward. Используется ТОЛЬКО ленивыми
 * экспандерами drill-down (expanders.ts) — A-математика по требованию,
 * view-слой над снапшотами чисел; гранулярность ИСПОЛНЕНИЯ walkthrough
 * остаётся op-level (решение R1: чистый micrograd-порт как движок отвергнут).
 *
 * Семантика как в Python: forward создаёт новые узлы, grad аккумулируется
 * на месте (+=), backward сеет ∂L/∂L = 1 в корне и идёт по topo-порядку.
 *
 * Декомпозиция D-29: op-методы только записывают данные (op-метка +
 * родители); локальные градиенты считают чистые функции value-grads.ts,
 * метод runBackward умножает их на входящий grad и аккумулирует в том же
 * порядке побочных эффектов, что исходные замыкания (бит-идентичность).
 */

import {
  localGradAdd,
  localGradDiv,
  localGradLog,
  localGradMul,
  localGradNeg,
  localGradSigmoid,
  localGradSub,
  localGradTanh,
} from './value-grads'

export type ScalarOp = '' | '+' | '-' | '*' | '/' | 'neg' | 'tanh' | 'sigmoid' | 'log'

export interface ValueInit {
  op?: ScalarOp
  parents?: readonly Value[]
  label?: string
  backwardFn?: () => readonly number[]
}

export class Value {
  readonly data: number
  grad = 0
  readonly op: ScalarOp
  readonly label: string
  readonly parents: readonly Value[]
  /** Обратный шаг операции: ЧИСТЫЕ локальные производные (параллельно
   *  parents, без incoming и мутаций); умножение на incoming и аккумулирование
   *  — общий код backward() (chain rule, D-34). */
  readonly backwardFn?: () => readonly number[]

  constructor(data: number, init: ValueInit = {}) {
    this.data = data
    this.op = init.op ?? ''
    this.label = init.label ?? ''
    this.parents = init.parents ?? []
    this.backwardFn = init.backwardFn
  }

  add(o: Value): Value {
    return new Value(this.data + o.data, { op: '+', parents: [this, o] })
  }

  sub(o: Value): Value {
    return new Value(this.data - o.data, { op: '-', parents: [this, o] })
  }

  mul(o: Value): Value {
    return new Value(this.data * o.data, { op: '*', parents: [this, o] })
  }

  div(o: Value): Value {
    return new Value(this.data / o.data, { op: '/', parents: [this, o] })
  }

  neg(): Value {
    return new Value(-this.data, { op: 'neg', parents: [this] })
  }

  tanh(): Value {
    return new Value(Math.tanh(this.data), { op: 'tanh', parents: [this] })
  }

  sigmoid(): Value {
    return new Value(1 / (1 + Math.exp(-this.data)), { op: 'sigmoid', parents: [this] })
  }

  log(): Value {
    return new Value(Math.log(this.data), { op: 'log', parents: [this] })
  }

  /** Исполняет обратный шаг этой op (вызывается topo-обходом backward):
   *  чистые локальные градиенты (value-grads.ts) на входящий this.grad
   *  аккумулируются в родителей в порядке родитель A → родитель B — тот же
   *  порядок побочных эффектов и числовые выражения, что исходные замыкания. */
  runBackward(): void {
    const a = this.parents[0]
    const b = this.parents[1]
    switch (this.op) {
      case '+': {
        const [ga, gb] = localGradAdd(this.grad)
        a!.grad += ga
        b!.grad += gb
        return
      }
      case '-': {
        const [ga, gb] = localGradSub(this.grad)
        a!.grad += ga
        b!.grad += gb
        return
      }
      case '*': {
        const [ga, gb] = localGradMul(a!.data, b!.data, this.grad)
        a!.grad += ga
        b!.grad += gb
        return
      }
      case '/': {
        const [ga, gb] = localGradDiv(a!.data, b!.data, this.grad)
        a!.grad += ga
        b!.grad += gb
        return
      }
      case 'neg': {
        const [g] = localGradNeg(this.grad)
        a!.grad += g
        return
      }
      case 'tanh': {
        const [g] = localGradTanh(this.data, this.grad)
        a!.grad += g
        return
      }
      case 'sigmoid': {
        const [g] = localGradSigmoid(this.data, this.grad)
        a!.grad += g
        return
      }
      case 'log': {
        const [g] = localGradLog(a!.data, this.grad)
        a!.grad += g
      }
      // лист (op '') не имеет родителей — обратный шаг пуст
    }
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
    // сеем ∂L/∂L = 1
    this.grad = 1
    for (let k = topo.length - 1; k >= 0; k--) topo[k]!.runBackward()
  }
}
