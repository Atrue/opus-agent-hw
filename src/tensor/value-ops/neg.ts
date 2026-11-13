/**
 * Унарный минус Value: out = −a (op-метка 'neg', родитель [a]).
 *
 * Производная: ∂out/∂a = −1.
 */
import { Value } from '../value'

export function neg(a: Value): Value {
  const backwardFn = (): readonly number[] => [-1]
  return new Value(-a.data, { op: 'neg', parents: [a], backwardFn })
}
