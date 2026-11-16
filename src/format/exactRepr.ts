/**
 * Exact-значение для drill-down (перенос из numbers.ts телом, D-34): полный
 * repr числа без округления.
 */
import { toDisplayMinus } from './minus'

/** Exact-значение для drill-down: полный repr из JSON без округления. */
export function exactRepr(x: number): string {
  if (!Number.isFinite(x)) throw new Error(`exactRepr: не конечное число: ${String(x)}`)
  return toDisplayMinus(String(x))
}
