/**
 * Display-минус (UI-SPEC «Notation & Number Format», D-06): типографский
 * U+2212; ASCII «-» остаётся только в JSON-данных. Перенос из numbers.ts
 * телом (D-34).
 */

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
