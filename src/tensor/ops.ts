/**
 * Ядра операций (forward + backward) над Float64Array: наивные циклы с
 * ФИКСИРОВАННЫМ порядком суммирования — тот же порядок зеркалится
 * скалярными экспандерами drill-down (инвариант Р-1 ревью R1).
 *
 * RED-скелет: ядра не реализованы.
 */

export function matvecForward(_w: Float64Array, _rows: number, _cols: number, _x: Float64Array): Float64Array {
  throw new Error('ops.matvecForward: не реализовано (RED)')
}

export function matvecGradW(_gOut: Float64Array, _x: Float64Array, _rows: number, _cols: number): Float64Array {
  throw new Error('ops.matvecGradW: не реализовано (RED)')
}

export function matvecGradX(_w: Float64Array, _rows: number, _cols: number, _gOut: Float64Array): Float64Array {
  throw new Error('ops.matvecGradX: не реализовано (RED)')
}

export function addForward(_a: Float64Array, _b: Float64Array): Float64Array {
  throw new Error('ops.addForward: не реализовано (RED)')
}

export function tanhForward(_z: Float64Array): Float64Array {
  throw new Error('ops.tanhForward: не реализовано (RED)')
}

export function tanhBackwardFromOutput(_out: Float64Array, _gOut: Float64Array): Float64Array {
  throw new Error('ops.tanhBackwardFromOutput: не реализовано (RED)')
}

export function sigmoidForward(_z: Float64Array): Float64Array {
  throw new Error('ops.sigmoidForward: не реализовано (RED)')
}

export function sigmoidBackwardFromOutput(_out: Float64Array, _gOut: Float64Array): Float64Array {
  throw new Error('ops.sigmoidBackwardFromOutput: не реализовано (RED)')
}

export function bceForward(_p: Float64Array, _t: Float64Array): Float64Array {
  throw new Error('ops.bceForward: не реализовано (RED)')
}

export function bceGradP(_p: Float64Array, _t: Float64Array): Float64Array {
  throw new Error('ops.bceGradP: не реализовано (RED)')
}
