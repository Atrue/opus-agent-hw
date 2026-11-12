/**
 * buildModel(spec) (D-30): сеть строится из декларативной модели — LayerSpec[]
 * + стартовые веса → параметры-тензоры. params() возвращает ТОЛЬКО параметры
 * (геттер без входов, PyTorch-аналогия parameters()); вход подаётся в
 * forward(x), возвращающий все промежуточные тензоры. MLP 2-3-1 — частный
 * случай спека (фаза 3 подключит его без нового слоя). Ориентация matvec без
 * транспонирований: z = W·x ↔ W.matmul(x).
 */

import { Tensor } from './tensor'

/**
 * Спецификация слоя сети (D-30): декларативная структура — buildModel строит
 * из последовательности LayerSpec граф параметров и walked-опы.
 */
export interface LayerSpec {
  /** Размер входа слоя (первый слой = размерность x). */
  inputs: number
  /** Число нейронов слоя. */
  units: number
  /** Активация: 'tanh' — скрытый слой, 'sigmoid' — выходной. */
  activation: 'tanh' | 'sigmoid'
}

/** Структурное подмножество ScenarioModel, из которого строится граф. */
export interface ModelSpec {
  net: readonly LayerSpec[]
  loss: { kind: 'bce' }
  /** Стартовые веса по слоям: ключи `w1`/`b1`… — 1-based номер слоя. */
  startWeights: Readonly<Record<string, number[][] | number[]>>
}

/** Промежуточные тензоры forward-прохода по слоям (индекс слоя 0-based). */
export interface ForwardTensors {
  /** zPre[k] = W_k·h_{k-1} — взвешенная сумма до биаса (h_{-1} = x). */
  zPre: (Tensor | null)[]
  /** zPost[k] = zPre[k] + b_k — после биаса. */
  zPost: (Tensor | null)[]
  /** h[k] = act(zPost[k]) — активация слоя; h[K-1] = ŷ. */
  h: (Tensor | null)[]
}

/** Сеть, построенная из спека: параметры отделены от входов (D-30). */
export class ScenarioNet {
  readonly layers: readonly LayerSpec[]
  readonly weights: readonly Tensor[]
  readonly biases: readonly Tensor[]

  constructor(spec: ModelSpec) {
    this.layers = spec.net
    this.weights = spec.net.map((_, k) => Tensor.of(spec.startWeights[`w${String(k + 1)}`] as number[][], true))
    this.biases = spec.net.map((_, k) => Tensor.of(spec.startWeights[`b${String(k + 1)}`] as number[], true))
  }

  /** Только параметры сети (без входов); порядок = плоский снапшот layer-major:
   *  W1, b1, W2, b2… */
  params(): readonly Tensor[] {
    const out: Tensor[] = []
    for (let k = 0; k < this.layers.length; k++) {
      out.push(this.weights[k]!, this.biases[k]!)
    }
    return out
  }

  /** Полный forward: та же последовательность тензорных оп, что исполняет
   *  SampleCursor пошагово (топологический порядок = порядок walked-оп). */
  forward(x: Tensor): ForwardTensors {
    const K = this.layers.length
    const zPre: (Tensor | null)[] = new Array(K).fill(null)
    const zPost: (Tensor | null)[] = new Array(K).fill(null)
    const h: (Tensor | null)[] = new Array(K).fill(null)
    let input: Tensor = x
    for (let k = 0; k < K; k++) {
      const zp = this.weights[k]!.matmul(input)
      const z = zp.add(this.biases[k]!)
      const a = this.layers[k]!.activation === 'tanh' ? z.tanh() : z.sigmoid()
      zPre[k] = zp
      zPost[k] = z
      h[k] = a
      input = a
    }
    return { zPre, zPost, h }
  }
}

/** Сеть из декларативной модели (D-30): spec → граф параметров. */
export function buildModel(spec: ModelSpec): ScenarioNet {
  return new ScenarioNet(spec)
}
