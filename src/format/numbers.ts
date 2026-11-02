/**
 * Единственное место форматирования чисел (UI-SPEC «Notation & Number Format», D-06):
 * d3-format 3.1.2 — не hand-roll (RESEARCH «Don't Hand-Roll»). Числа в компонентах
 * не вычисляются — сюда приходят только значения из trace JSON (Pattern 1).
 *
 * display-минус — типографский U+2212; ASCII «-» остаётся только в JSON-данных.
 */
import { format } from 'd3-format'

const g4 = format('.4g')
const e3 = format('.3e')

/** display-минус U+2212 (MINUS SIGN). */
export const MINUS = '−'

/** Конверсия ASCII-минусов в display-минус — только на display-слое.
 *  Знак экспоненты после e/E остаётся ASCII — как в образце UI-SPEC «−2.451e-5». */
export function toDisplayMinus(text: string): string {
  if (!text.includes('-')) return text
  return text.replace(/-/g, (ch, offset: number) =>
    offset > 0 && (text[offset - 1] === 'e' || text[offset - 1] === 'E') ? ch : MINUS,
  )
}

/** Ключевое число: .4g (4 значащие цифры, ≤9 символов); |x| < 1e-3 → .3e. */
export function formatKey(x: number): string {
  if (!Number.isFinite(x)) throw new Error(`formatKey: не конечное число: ${String(x)}`)
  if (x === 0) return '0'
  return toDisplayMinus(Math.abs(x) < 1e-3 ? e3(x) : g4(x))
}

/** Exact-значение для drill-down: полный repr из JSON без округления. */
export function exactRepr(x: number): string {
  if (!Number.isFinite(x)) throw new Error(`exactRepr: не конечное число: ${String(x)}`)
  return toDisplayMinus(String(x))
}
