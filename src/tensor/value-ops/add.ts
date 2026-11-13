/**
 * Операция сложения Value: out = a + b (op-метка '+', родители [a, b]).
 *
 * Производные: ∂out/∂a = 1, ∂out/∂b = 1.
 */
import { Value } from '../value'

export function add(a: Value, b: Value): Value {
  const backwardFn = (): readonly number[] => [1, 1]
  return new Value(a.data + b.data, { op: '+', parents: [a, b], backwardFn })
}
