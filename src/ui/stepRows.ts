import type { StepRecord, TensorValues } from '../tensor'

/**
 * Чистая модель дефолтного вида шага (без React): какие числа показать,
 * что скрыть до drill-down. Жёсткие потолки UI-SPEC (анти-«стена цифр»):
 * ≤7 ключевых чисел в дефолтном виде, ≤30 на всём экране.
 */

const KEY_NUMBER_CAP = 7 // жёсткий потолок ключевых чисел на шаг
const PER_TENSOR_CAP = 3 // значений тензора в дефолтном виде; остальное — drill-down

export interface NumberRow {
  kind: 'result' | 'grad' | 'input'
  sym: string
  values: number[] // показанные значения
  hidden: number // скрыто до drill-down
  changed: boolean
}

/** «∂L/∂W2» → «dW2», «ŷ» → «yhat»: соответствие ASCII-ключам changed записи. */
function normalizeSym(sym: string): string {
  return sym.replace('∂L/∂', 'd').replace('ŷ', 'yhat')
}

function isChangedSym(step: StepRecord, sym: string): boolean {
  const n = normalizeSym(sym)
  return step.changed.some((c) => n === c || n.startsWith(c))
}

function flatten(values: TensorValues): number[] {
  const first = values[0]
  if (Array.isArray(first)) return (values as number[][]).flat()
  return [...(values as number[])]
}

/** Выходы + градиенты (без дублей) в пределах бюджета ключевых чисел, затем входы. */
export function buildStepRows(step: StepRecord): NumberRow[] {
  const rows: NumberRow[] = []
  let budget = KEY_NUMBER_CAP

  const pushKey = (sym: string, values: TensorValues, kind: 'result' | 'grad'): void => {
    const all = flatten(values)
    const shown = Math.min(PER_TENSOR_CAP, budget, all.length)
    budget -= shown
    rows.push({
      kind,
      sym,
      values: all.slice(0, shown),
      hidden: all.length - shown,
      changed: isChangedSym(step, sym),
    })
  }

  pushKey(step.outputs.sym, step.outputs.values, 'result')
  if (step.grads !== null) {
    for (const [sym, values] of Object.entries(step.grads)) {
      if (sym === step.outputs.sym) continue // дубль выхода — уже показан
      pushKey(sym, values, 'grad')
    }
  }
  for (const input of step.inputs) {
    const all = flatten(input.values)
    const shown = Math.min(PER_TENSOR_CAP, all.length)
    rows.push({ kind: 'input', sym: input.sym, values: all.slice(0, shown), hidden: all.length - shown, changed: false })
  }
  return rows
}
