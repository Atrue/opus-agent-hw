/**
 * tanh Value: out = tanh(a) (op-метка 'tanh', родитель [a]).
 *
 * Производная через выход: ∂out/∂a = 1 − tanh²(a) = 1 − out².
 */
import { Value } from '../value'

export function tanh(a: Value): Value {
  const out = Math.tanh(a.data)
  const backwardFn = (): readonly number[] => [1 - out * out]
  return new Value(out, { op: 'tanh', parents: [a], backwardFn })
}
