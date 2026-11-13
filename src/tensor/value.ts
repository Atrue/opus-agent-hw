/**
 * Скалярное ядро (R1, micrograd-механика): Value-контейнер с
 * data/grad/op/label/parents/backwardFn и свободная функция backward(root).
 * Используется ТОЛЬКО ленивыми экспандерами drill-down (expanders.ts) —
 * A-математика по требованию, view-слой над снапшотами чисел; гранулярность
 * ИСПОЛНЕНИЯ walkthrough остаётся op-level (решение R1: чистый micrograd-порт
 * как движок отвергнут).
 *
 * Семантика как в Python: forward (операции — свободные функции
 * value-ops/<op>.ts) создаёт новые узлы, grad аккумулируется на месте (+=),
 * backward сеет ∂L/∂L = 1 в корне и идёт по topo-порядку.
 *
 * D-34 (gap OQ-3/OQ-4): класс Value — чистый контейнер БЕЗ методов;
 * операция знает только локальные производные (backwardFn — чистые,
 * параллельно parents), chain rule — общий код backward().
 */

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
   *  parents, без incoming и мутаций); умножение на incoming и
   *  аккумулирование — общий код backward() (chain rule, D-34). */
  readonly backwardFn?: () => readonly number[]

  constructor(data: number, init: ValueInit = {}) {
    this.data = data
    this.op = init.op ?? ''
    this.label = init.label ?? ''
    this.parents = init.parents ?? []
    // exactOptionalPropertyTypes: поле не принимает явный undefined
    if (init.backwardFn !== undefined) this.backwardFn = init.backwardFn
  }
}

/**
 * Обратный проход графа (micrograd-канон): топологическая развёртка,
 * посев ∂L/∂L = 1 в корне, затем chain rule — ОБЩИЙ для всех операций:
 * локальные производные узла (backwardFn) умножаются на входящий v.grad
 * и аккумулируются в родителей в порядке родитель A → родитель B.
 */
export function backward(root: Value): void {
  const topo: Value[] = []
  const seen = new Set<Value>()
  const visit = (v: Value): void => {
    if (seen.has(v)) return
    seen.add(v)
    for (const p of v.parents) visit(p)
    topo.push(v)
  }
  visit(root)
  // сеем ∂L/∂L = 1
  root.grad = 1
  for (let k = topo.length - 1; k >= 0; k--) {
    const v = topo[k]!
    // лист (op '') не имеет родителей — обратный шаг пуст
    if (v.backwardFn === undefined) continue
    const g = v.grad
    const partials = v.backwardFn()
    for (let i = 0; i < partials.length; i++) v.parents[i]!.grad += partials[i]! * g
  }
}
