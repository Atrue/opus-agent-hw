/**
 * Ключевое число таблиц (перенос из numbers.ts телом, D-34): d3-format 3.1.2
 * — не hand-roll (RESEARCH «Don't Hand-Roll»). Числа в компонентах не
 * вычисляются — сюда приходят только значения записи шага.
 */
import { format } from 'd3-format'
import { toDisplayMinus } from './minus'

const g4 = format('.4g')
const e3 = format('.3e')

/** Ключевое число: .4g (4 значащие цифры, ≤9 символов); |x| < 1e-3 → .3e. */
export function formatKey(x: number): string {
  if (!Number.isFinite(x)) throw new Error(`formatKey: не конечное число: ${String(x)}`)
  if (x === 0) return '0'
  return toDisplayMinus(Math.abs(x) < 1e-3 ? e3(x) : g4(x))
}
