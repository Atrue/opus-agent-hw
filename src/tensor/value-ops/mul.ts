/**
 * Операция умножения Value: out = a·b (op-метка '*', родители [a, b]).
 *
 * Производные: ∂out/∂a = b, ∂out/∂b = a.
 */
import { Value } from '../value'

export function mul(a: Value, b: Value): Value {
  const backwardFn = (): readonly number[] => [b.data, a.data]
  return new Value(a.data * b.data, { op: '*', parents: [a, b], backwardFn })
}
