/**
 * Ленивые скалярные раскрытия drill-down per-op (R1 §4.3): для запрошенного
 * индекса элемента векторного результата строят скалярную цепочку Value с
 * подстановкой чисел (формула + происхождение родителей) в ТОМ ЖЕ порядке
 * суммирования, что и векторные ядра ops.ts (инвариант Р-1: «drill-down =
 * движок», тест tests/tensor/expanders.test.ts). Вычисление — только по
 * требованию (hover/drill, 01.1-04); исполнение walkthrough их не трогает.
 */

import type { Value } from './value'

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

export function expandScalar(_req: ExpandRequest): LazyExpansion {
  throw new Error('expanders.ts: не реализовано (RED)')
}
