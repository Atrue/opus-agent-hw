/**
 * Операция matvec (forward + градиенты): z = W·x и обратные шаги.
 * Перенос из ops.ts телом (D-34: операция и её градиенты — в одном файле,
 * зеркально value-ops/). Наивные циклы с ФИКСИРОВАННЫМ порядком
 * суммирования (j-внешний, i-внутренний; аккумуляция слева направо от 0) —
 * тот же порядок зеркалится скалярными экспандерами drill-down (инвариант
 * Р-1 ревью R1). Без BLAS: расхождение с референсом ~1 ulp при допуске
 * NFR-02 1e-6.
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
