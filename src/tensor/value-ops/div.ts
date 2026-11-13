/**
 * Операция деления Value: out = a / b (op-метка '/', родители [a, b]).
 *
 * Производные: ∂out/∂a = 1/b, ∂out/∂b = −a/b².
 *
 * Числовое: чистая производная (1/b)·incoming вместо прежнего fused
 * incoming/b — принятый ulp-дрейф ассоциации (D-34, допуск 1e-12/1e-6).
 */
import { Value } from '../value'

export function div(a: Value, b: Value): Value {
  const backwardFn = (): readonly number[] => [1 / b.data, (-a.data) / (b.data * b.data)]
  return new Value(a.data / b.data, { op: '/', parents: [a, b], backwardFn })
}
