/**
 * Натуральный логарифм Value: out = ln(a) (op-метка 'log', родитель [a]).
 *
 * Производная: ∂out/∂a = 1/a.
 *
 * Числовое: чистая производная (1/a)·incoming вместо прежнего fused
 * incoming/a — принятый ulp-дрейф ассоциации (D-34, 1e-12/1e-6).
 */
import { Value } from '../value'

export function log(a: Value): Value {
  const backwardFn = (): readonly number[] => [1 / a.data]
  return new Value(Math.log(a.data), { op: 'log', parents: [a], backwardFn })
}
