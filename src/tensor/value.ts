/**
 * Скалярное ядро (R1, порт gen_mock_trace.py): Value с data/grad/op/parents
 * и topo-backward механикой micrograd. Используется ТОЛЬКО ленивыми
 * экспандерами drill-down (expanders.ts) — A-математика по требованию,
 * view-слой над снапшотами чисел; гранулярность ИСПОЛНЕНИЯ walkthrough
 * остаётся op-level (решение R1: чистый micrograd-порт как движок отвергнут).
 */

export type ScalarOp = '' | '+' | '*' | '/' | 'neg' | 'tanh' | 'sigmoid' | 'log'

export interface ValueInit {
  op?: ScalarOp
  parents?: readonly Value[]
  label?: string
}

const RED = (): never => {
  throw new Error('value.ts: не реализовано (RED)')
}

export class Value {
  readonly data: number
  grad = 0
  readonly op: ScalarOp
  readonly label: string
  readonly parents: readonly Value[]

  constructor(data: number, init: ValueInit = {}) {
    this.data = data
    this.op = init.op ?? ''
    this.label = init.label ?? ''
    this.parents = init.parents ?? []
    RED()
  }

  add(_o: Value): Value {
    RED()
  }

  sub(_o: Value): Value {
    RED()
  }

  mul(_o: Value): Value {
    RED()
  }

  div(_o: Value): Value {
    RED()
  }

  neg(): Value {
    RED()
  }

  tanh(): Value {
    RED()
  }

  sigmoid(): Value {
    RED()
  }

  log(): Value {
    RED()
  }

  /** Топологическая развёртка графа + обратный проход (micrograd-канон). */
  backward(): void {
    RED()
  }
}
