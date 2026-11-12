/**
 * Чистые функции локального градиента Value-оп (D-29): каждая возвращает
 * вклады в родителей для входящего градиента incoming (∂L/∂out), НЕ мутируя
 * узлы, — аккумулирует метод Value.runBackward (value.ts) в том же порядке
 * побочных эффектов, что исходные замыкания (родитель A → родитель B;
 * бит-идентичность — Pitfall 2 ревью фазы 02, инвариант «drill-down =
 * движок» 1e-12 в expanders.test.ts).
 *
 * Числовые выражения — один-в-один с прежними замыканиями value.ts:
 * перестановка порядка умножения/сложения меняет биты (NFR-02).
 */

/** ∂/∂a (a + b) = 1, ∂/∂b (a + b) = 1 → вклады (incoming, incoming). */
export function localGradAdd(incoming: number): readonly [number, number] {
  return [incoming, incoming]
}

/** ∂/∂a (a − b) = 1, ∂/∂b (a − b) = −1 → вклады (incoming, −incoming). */
export function localGradSub(incoming: number): readonly [number, number] {
  return [incoming, -incoming]
}

/** ∂/∂a (a·b) = b, ∂/∂b (a·b) = a → вклады (incoming·b, incoming·a). */
export function localGradMul(a: number, b: number, incoming: number): readonly [number, number] {
  return [incoming * b, incoming * a]
}

/** ∂/∂a (a/b) = 1/b, ∂/∂b (a/b) = −a/b² → вклады (incoming/b, (−incoming·a)/(b·b)). */
export function localGradDiv(a: number, b: number, incoming: number): readonly [number, number] {
  return [incoming / b, (-incoming * a) / (b * b)]
}

/** ∂/∂a (−a) = −1 → вклад −incoming. */
export function localGradNeg(incoming: number): readonly [number] {
  return [-incoming]
}

/** ∂/∂a tanh(a) = 1 − tanh²(a) = 1 − out² → вклад incoming·(1 − out·out). */
export function localGradTanh(out: number, incoming: number): readonly [number] {
  return [incoming * (1 - out * out)]
}

/** ∂/∂a σ(a) = σ(a)·(1 − σ(a)) = out·(1 − out) → вклад incoming·out·(1 − out). */
export function localGradSigmoid(out: number, incoming: number): readonly [number] {
  return [incoming * out * (1 - out)]
}

/** ∂/∂a ln(a) = 1/a → вклад incoming/a. */
export function localGradLog(a: number, incoming: number): readonly [number] {
  return [incoming / a]
}
