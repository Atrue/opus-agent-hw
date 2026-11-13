/**
 * Операция поэлементного сложения (forward). Перенос из ops.ts телом
 * (D-34: операция и её градиенты — в одном файле, зеркально value-ops/).
 */

/** Поэлементная сумма. */
export function addForward(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i]! + b[i]!
  return out
}
