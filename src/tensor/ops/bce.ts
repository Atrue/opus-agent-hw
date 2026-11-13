/**
 * Операция BCE — бинарная перекрёстная энтропия (forward + градиент).
 * Перенос из ops.ts телом (D-34: операция и её градиенты — в одном файле,
 * зеркально value-ops/).
 */

/** BCE вперёд (скаляр [1], тензоры-операнды формы [1]): L = −[t·ln p + (1−t)·ln(1−p)]. */
export function bceForward(p: Float64Array, t: Float64Array): Float64Array {
  const pi = p[0]!
  const ti = t[0]!
  return new Float64Array([-(ti * Math.log(pi) + (1 - ti) * Math.log(1 - pi))])
}

/** ∂L/∂p = (p − t)/(p·(1 − p)) (скаляр [1]). */
export function bceGradP(p: Float64Array, t: Float64Array): Float64Array {
  const pi = p[0]!
  const ti = t[0]!
  return new Float64Array([(pi - ti) / (pi * (1 - pi))])
}
