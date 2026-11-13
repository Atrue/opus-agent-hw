/**
 * Операция sigmoid (forward + обратный шаг через выход). Перенос из ops.ts
 * телом (D-34: операция и её градиенты — в одном файле, зеркально value-ops/).
 */

/** σ(z) = 1/(1+e^(−z)) вперёд. */
export function sigmoidForward(z: Float64Array): Float64Array {
  const out = new Float64Array(z.length)
  for (let i = 0; i < z.length; i++) out[i] = 1 / (1 + Math.exp(-z[i]!))
  return out
}

/** Обратка σ через выход: gOut·out·(1 − out). */
export function sigmoidBackwardFromOutput(out: Float64Array, gOut: Float64Array): Float64Array {
  const dz = new Float64Array(out.length)
  for (let i = 0; i < out.length; i++) dz[i] = gOut[i]! * out[i]! * (1 - out[i]!)
  return dz
}
