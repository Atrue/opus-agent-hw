/**
 * Ленивые скалярные раскрытия drill-down per-op (R1 §4.3): для запрошенного
 * индекса элемента векторного результата строят скалярную цепочку Value с
 * подстановкой чисел (формула + происхождение родителей) в ТОМ ЖЕ порядке
 * суммирования, что и векторные ядра ops.ts (инвариант Р-1: «drill-down =
 * движок», тест tests/tensor/expanders.test.ts). Вычисление — только по
 * требованию (hover/drill, 01.1-04); исполнение walkthrough их не трогает.
 *
 * Порядок суммирования зеркалит ops.ts: матричные суммы — аккумуляция
 * слева направо от нулевого индекса (i — matvec, j — grad-x). Строки формул
 * собираются только из чисел сценария (T-01.1-03: без пользовательского
 * ввода; рендер — дело React-слоя, dangerouslySetInnerHTML запрещён).
 */

import { Value } from './value'

/** Снапшот операнда: вектор или матрица (row-major). */
export type TensorSnapshot = readonly number[] | readonly (readonly number[])[]

/** Ленивый операнд: символ тензора + снапшот, который читается не раньше
 *  первого обращения к раскрытию (граница ленивости Р-4). */
export interface Operand {
  sym: string
  get: () => TensorSnapshot
}

export type ExpandRequest =
  | { kind: 'matvec'; w: Operand; x: Operand; row: number }
  | { kind: 'add'; a: Operand; b: Operand; index: number }
  | { kind: 'tanh'; z: Operand; index: number }
  | { kind: 'sigmoid'; z: Operand; index: number }
  | { kind: 'bce'; p: Operand; t: Operand }
  | { kind: 'matvec-grad-w'; gOut: Operand; x: Operand; row: number; col: number }
  | { kind: 'matvec-grad-x'; w: Operand; gOut: Operand; col: number }
  | { kind: 'add-grad'; gOut: Operand; index: number }
  | { kind: 'tanh-grad'; a: Operand; gOut: Operand; index: number }
  | { kind: 'sigmoid-grad'; out: Operand; gOut: Operand; index: number }
  | { kind: 'bce-grad'; p: Operand; t: Operand }
  | { kind: 'sgd'; w: Operand; g: Operand; lr: number; index: number }

/** Ленивое раскрытие: цепочка/число/формула материализуются при первом
 *  обращении и кэшируются; до этого ни один операнд не читается. */
export interface LazyExpansion {
  readonly computed: boolean
  readonly value: number
  readonly formula: string
  readonly root: Value
}

class LazyExpansionImpl implements LazyExpansion {
  private cache: { root: Value; formula: string } | null = null
  private readonly build: () => { root: Value; formula: string }

  constructor(build: () => { root: Value; formula: string }) {
    this.build = build
  }

  get computed(): boolean {
    return this.cache !== null
  }

  private materialize(): { root: Value; formula: string } {
    if (this.cache === null) this.cache = this.build()
    return this.cache
  }

  get value(): number {
    return this.materialize().root.data
  }

  get formula(): string {
    return this.materialize().formula
  }

  get root(): Value {
    return this.materialize().root
  }
}

/** Число в формуле: 4 значащие цифры, display-минус U+2212 (как formatKey UI). */
function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  if (n === 0) return '0'
  return String(Number(n.toPrecision(4))).replaceAll('-', '−')
}

function vecOf(op: Operand): readonly number[] {
  const s = op.get()
  if (s.length > 0 && Array.isArray(s[0])) {
    throw new Error(`expanders: операнд «${op.sym}» — ожидался вектор, получена матрица`)
  }
  return s as readonly number[]
}

function matOf(op: Operand): readonly (readonly number[])[] {
  const s = op.get()
  if (s.length === 0 || !Array.isArray(s[0])) {
    throw new Error(`expanders: операнд «${op.sym}» — ожидалась матрица, получен вектор`)
  }
  return s as readonly (readonly number[])[]
}

/** Плоский снапшот параметра (row-major) — для sgd-индекса, как refs диаграммы. */
function flatOf(op: Operand): readonly number[] {
  const s = op.get()
  if (s.length === 0) return []
  if (Array.isArray(s[0])) return (s as readonly (readonly number[])[]).flat()
  return s as readonly number[]
}

function at<T>(values: readonly T[], i: number, what: string): T {
  if (i < 0 || i >= values.length) {
    throw new Error(`expanders: индекс ${String(i)} вне «${what}» [0..${String(values.length - 1)}]`)
  }
  return values[i]!
}

function leaf(data: number, label: string): Value {
  return new Value(data, { label })
}

function vecLeaf(op: Operand, vec: readonly number[], i: number): Value {
  return leaf(at(vec, i, op.sym), `${op.sym}[${String(i)}]`)
}

function matLeaf(op: Operand, mat: readonly (readonly number[])[], j: number, i: number): Value {
  return leaf(at(at(mat, j, op.sym), i, `${op.sym}[${String(j)}]`), `${op.sym}[${String(j)},${String(i)}]`)
}

function one(): Value {
  return leaf(1, '1')
}

// --- построители цепочек (порядок суммирования = ops.ts, инвариант Р-1) ---

function buildMatvec(req: Extract<ExpandRequest, { kind: 'matvec' }>): Value {
  const w = matOf(req.w)
  const x = vecOf(req.x)
  const cols = w[0]!.length
  // acc слева направо от i = 0 — как matvecForward (acc = 0; acc += w·x)
  let acc = matLeaf(req.w, w, req.row, 0).mul(vecLeaf(req.x, x, 0))
  for (let i = 1; i < cols; i++) acc = acc.add(matLeaf(req.w, w, req.row, i).mul(vecLeaf(req.x, x, i)))
  return acc
}

function buildMatvecGradX(req: Extract<ExpandRequest, { kind: 'matvec-grad-x' }>): Value {
  const w = matOf(req.w)
  const g = vecOf(req.gOut)
  const rows = w.length
  // Σ_j по возрастанию j — как matvecGradX
  let acc = matLeaf(req.w, w, 0, req.col).mul(vecLeaf(req.gOut, g, 0))
  for (let j = 1; j < rows; j++) acc = acc.add(matLeaf(req.w, w, j, req.col).mul(vecLeaf(req.gOut, g, j)))
  return acc
}

// --- рендер формул: символьная часть + подстановка чисел + результат ---

/** Приоритет для скобок: 4=лист, 3=унарные/функции, 2=·, 1=+/− (div — всегда скобки). */
function precOf(v: Value): number {
  if (v.parents.length === 0) return 4
  switch (v.op) {
    case 'tanh':
    case 'sigmoid':
    case 'log':
    case 'neg':
      return 3
    case '*':
      return 2
    default:
      return 1
  }
}

function render(v: Value, leafText: (v: Value) => string): string {
  if (v.parents.length === 0) return leafText(v)
  const wrap = (c: Value, minPrec: number): string => {
    const s = render(c, leafText)
    return precOf(c) < minPrec ? `(${s})` : s
  }
  const l = v.parents[0]!
  const r = v.parents[1]
  switch (v.op) {
    case '+':
      return `${wrap(l, 1)} + ${r === undefined ? '' : wrap(r, 1)}`
    case '-':
      return `${wrap(l, 1)} − ${r === undefined ? '' : wrap(r, 2)}`
    case '*':
      return `${wrap(l, 2)}·${r === undefined ? '' : wrap(r, 2)}`
    case '/': {
      // оба операнда в скобках, если составные: (a − b) / (c·d)
      const part = (c: Value): string => (c.parents.length === 0 ? render(c, leafText) : `(${render(c, leafText)})`)
      return `${part(l)} / ${r === undefined ? '' : part(r)}`
    }
    case 'neg':
      return `−${wrap(l, 4)}`
    case 'tanh':
      return `tanh(${render(l, leafText)})`
    case 'sigmoid':
      return `σ(${render(l, leafText)})`
    case 'log':
      return `ln(${render(l, leafText)})`
    default:
      return leafText(v)
  }
}

const symbolicLeaf = (v: Value): string => (v.label === '' ? fmt(v.data) : v.label)
const numericLeaf = (v: Value): string => fmt(v.data)

function formulaOf(root: Value): string {
  if (root.parents.length === 0) return `${symbolicLeaf(root)} = ${fmt(root.data)}`
  return `${render(root, symbolicLeaf)} = ${render(root, numericLeaf)} = ${fmt(root.data)}`
}

// --- диспетчер раскрытий ---

function buildChain(req: ExpandRequest): Value {
  switch (req.kind) {
    case 'matvec':
      return buildMatvec(req)
    case 'add': {
      const a = vecOf(req.a)
      const b = vecOf(req.b)
      return vecLeaf(req.a, a, req.index).add(vecLeaf(req.b, b, req.index))
    }
    case 'tanh':
      return vecLeaf(req.z, vecOf(req.z), req.index).tanh()
    case 'sigmoid':
      return vecLeaf(req.z, vecOf(req.z), req.index).sigmoid()
    case 'bce': {
      // L = −[y·ln ŷ + (1−y)·ln(1−ŷ)] — порядок слагаемых как bceForward
      const p = vecLeaf(req.p, vecOf(req.p), 0)
      const t = vecLeaf(req.t, vecOf(req.t), 0)
      const term1 = t.mul(p.log())
      const term2 = one().sub(t).mul(one().sub(p).log())
      return term1.add(term2).neg()
    }
    case 'matvec-grad-w': {
      // ∂L/∂W[j][i] = ∂L/∂z[j]·x[i] — без суммирования, как matvecGradW
      const g = vecOf(req.gOut)
      const x = vecOf(req.x)
      return vecLeaf(req.gOut, g, req.row).mul(vecLeaf(req.x, x, req.col))
    }
    case 'matvec-grad-x':
      return buildMatvecGradX(req)
    case 'add-grad':
      return vecLeaf(req.gOut, vecOf(req.gOut), req.index)
    case 'tanh-grad': {
      // ∂L/∂z = ∂L/∂a · (1 − a²) — как tanhBackwardFromOutput
      const a = vecOf(req.a)
      const g = vecOf(req.gOut)
      const av = vecLeaf(req.a, a, req.index)
      return vecLeaf(req.gOut, g, req.index).mul(one().sub(av.mul(av)))
    }
    case 'sigmoid-grad': {
      // ∂L/∂z = (∂L/∂ŷ · ŷ)·(1 − ŷ) — ассоциация как sigmoidBackwardFromOutput
      const out = vecOf(req.out)
      const g = vecOf(req.gOut)
      return vecLeaf(req.gOut, g, req.index)
        .mul(vecLeaf(req.out, out, req.index))
        .mul(one().sub(vecLeaf(req.out, out, req.index)))
    }
    case 'bce-grad': {
      // ∂L/∂ŷ = (ŷ − y)/(ŷ(1 − ŷ)) — как bceGradP
      const p = vecLeaf(req.p, vecOf(req.p), 0)
      const t = vecLeaf(req.t, vecOf(req.t), 0)
      return p.sub(t).div(p.mul(one().sub(p)))
    }
    case 'sgd': {
      // W = W − η·∂L/∂W — плоский индекс параметра (row-major, как refs диаграммы)
      const w = flatOf(req.w)
      const g = flatOf(req.g)
      return vecLeaf(req.w, w, req.index).sub(leaf(req.lr, 'η').mul(vecLeaf(req.g, g, req.index)))
    }
  }
}

/**
 * Ленивое скалярное раскрытие элемента результата операции: (операция,
 * операнды, индекс) → { value, formula, root }. Снапшоты операндов читаются
 * и цепочка Value строится ТОЛЬКО при первом обращении к value/formula/root.
 */
export function expandScalar(req: ExpandRequest): LazyExpansion {
  return new LazyExpansionImpl(() => {
    const root = buildChain(req)
    return { root, formula: formulaOf(root) }
  })
}
