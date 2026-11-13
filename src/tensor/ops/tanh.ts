/**
 * Операция tanh (forward + обратный шаг через выход). Перенос из ops.ts
 * телом (D-34: операция и её градиенты — в одном файле, зеркально value-ops/).
 */

/** tanh вперёд (Math.tanh — расхождение с python math.tanh ~1 ulp). */
export function tanhForward(z: Float64Array): Float64Array {
  const out = new Float64Array(z.length)
  for (let i = 0; i < z.length; i++) out[i] = Math.tanh(z[i]!)
  return out
}

/** Обратка tanh через выход: gOut·(1 − out²). */
export function tanhBackwardFromOutput(out: Float64Array, gOut: Float64Array): Float64Array {
  const dz = new Float64Array(out.length)
  for (let i = 0; i < out.length; i++) dz[i] = gOut[i]! * (1 - out[i]! * out[i]!)
  return dz
}
