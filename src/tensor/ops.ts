/**
 * Ядра операций (forward + backward) над Float64Array: наивные циклы с
 * ФИКСИРОВАННЫМ порядком суммирования (j-внешний, i-внутренний; аккумуляция
 * слева направо от 0) — тот же порядок зеркалится скалярными экспандерами
 * drill-down (инвариант Р-1 ревью R1). Без BLAS: расхождение с референсом
 * ~1 ulp при допуске NFR-02 1e-6.
 */

/** z = W·x: матрица w [rows×cols] row-major на вектор x [cols] → [rows]. */
export function matvecForward(w: Float64Array, rows: number, cols: number, x: Float64Array): Float64Array {
  const out = new Float64Array(rows)
  for (let j = 0; j < rows; j++) {
    let acc = 0
    for (let i = 0; i < cols; i++) acc += w[j * cols + i]! * x[i]!
    out[j] = acc
  }
  return out
}

/** ∂L/∂W = ∂L/∂z · xᵀ: dW[j][i] = gOut[j]·x[i] (без суммирования). */
export function matvecGradW(gOut: Float64Array, x: Float64Array, rows: number, cols: number): Float64Array {
  const dW = new Float64Array(rows * cols)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) dW[j * cols + i] = gOut[j]! * x[i]!
  }
  return dW
}

/** ∂L/∂x = Wᵀ·∂L/∂z: dx[i] = Σ_j (по возрастанию j) W[j][i]·gOut[j]. */
export function matvecGradX(w: Float64Array, rows: number, cols: number, gOut: Float64Array): Float64Array {
  const dx = new Float64Array(cols)
  for (let i = 0; i < cols; i++) {
    let acc = 0
    for (let j = 0; j < rows; j++) acc += w[j * cols + i]! * gOut[j]!
    dx[i] = acc
  }
  return dx
}

/** Поэлементная сумма. */
export function addForward(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i]! + b[i]!
  return out
}

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

/** σ(z) = 1/(1+e^(−z)) вперёд. */
export function sigmoidForward(z: Float64Array): Float64Array {
  const out = new Float64Array(z.length)
  for (let i = 0; i < z.length; i++) out[i] = 1 / (1 + Math.exp(-z[i]!))
  return out
}

/** Обратка σ через выход: gOut·out·(1 − out). */
export function sigmoidBackwardFromOutput(out: Float64Array, gOut: Float64Array): Float64Array {
  const dz = new Float64Array(out.length)
  for (let i = 0; i < out.length; i++) dz[i] = gOut[i]! * out[i]! * (1 - out[i]!)
  return dz
}

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
