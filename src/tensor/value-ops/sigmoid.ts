/**
 * σ Value: out = 1/(1 + e^(−a)) (op-метка 'sigmoid', родитель [a]).
 *
 * Производная через выход: ∂out/∂a = σ(a)·(1 − σ(a)) = out·(1 − out).
 *
 * Числовое: чистая производная (out·(1−out))·incoming вместо прежнего fused
 * (incoming·out)·(1−out) — принятый ulp-дрейф ассоциации (D-34, 1e-12/1e-6).
 */
import { Value } from '../value'

export function sigmoid(a: Value): Value {
  const out = 1 / (1 + Math.exp(-a.data))
  const backwardFn = (): readonly number[] => [out * (1 - out)]
  return new Value(out, { op: 'sigmoid', parents: [a], backwardFn })
}
