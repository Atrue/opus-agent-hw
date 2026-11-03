import { run, type Drill } from '../run/runState'
import type { StepRecord, TensorValues } from '../tensor'
import { exactRepr, formatKey } from '../format/numbers'
import SubscriptText from './SubscriptText'

/**
 * NumberDrilldown (Interaction Contract): открывается в слоте StepPanel
 * (замещает содержимое) по клику на число в StepPanel или узел/ребро
 * диаграммы. Состав: exact-repr + отформатированное значение + формула +
 * provenance; на backward-опах — раскрытие цепного правила на 1 уровень.
 * resolveRef работает над ТЕКУЩЕЙ записи прогона + живыми глобальными
 * тензорами (веса модели, вход/метка активного сэмпла) — только lookup,
 * без вычислений. Граница графа (∂L/∂x) — терминальная панель, не пустой
 * экран. Закрытие: backlink «← к шагу», Esc, автосброс при смене операции.
 */

const TERMINAL_BODY = 'Градиент дальше не распространяется: x — старт цепного правила. Смотри ∂L/∂W1 и ∂L/∂b1.'
const GLOSSARY = '∂L/∂W — градиент L по W (в CS231n: dL/dW)'

function flatten(values: TensorValues): number[] {
  const first = values[0]
  if (Array.isArray(first)) return (values as number[][]).flat()
  return [...(values as number[])]
}

interface ResolvedNumber {
  sym: string
  value: number
  provenance: string
}

const PROV_WEIGHT = 'вес модели (живое значение)'
const PROV_INPUT = 'входные данные — граница графа'
const PROV_TARGET = 'метка — граница графа'

/** Живые глобальные тензоры прогона: веса модели + вход/метка активного сэмпла. */
function globalTensors(): Record<string, { values: TensorValues; provenance: string }> {
  const cursor = run.activeCursor
  return {
    W1: { values: Array.from(run.model.W1.data), provenance: PROV_WEIGHT },
    b1: { values: Array.from(run.model.b1.data), provenance: PROV_WEIGHT },
    W2: { values: Array.from(run.model.W2.data), provenance: PROV_WEIGHT },
    b2: { values: Array.from(run.model.b2.data), provenance: PROV_WEIGHT },
    x: { values: Array.from(cursor.x.data), provenance: PROV_INPUT },
    y: { values: Array.from(cursor.y.data), provenance: PROV_TARGET },
  }
}

/** Разрешение ref → число: текущая запись (grads → outputs → inputs), затем
 *  живые глобальные тензоры прогона. Только lookup, без вычислений. */
function resolveRef(record: StepRecord, ref: string): ResolvedNumber | null {
  const m = /^(.+)\[(\d+)\]$/.exec(ref)
  const sym = m ? m[1]! : ref
  const index = m ? Number(m[2]) : 0

  const stepProvenance = `шаг ${record.index + 1} (${record.op})`
  const local: { values: TensorValues; provenance: string }[] = []
  if (record.grads !== null && sym in record.grads) local.push({ values: record.grads[sym]!, provenance: stepProvenance })
  if (record.outputs.sym === sym) local.push({ values: record.outputs.values, provenance: stepProvenance })
  const input = record.inputs.find((i) => i.sym === sym)
  if (input !== undefined) local.push({ values: input.values, provenance: input.provenance ?? stepProvenance })

  if (local.length > 0) {
    const all = flatten(local[0]!.values)
    const i = Math.min(Math.max(index, 0), all.length - 1)
    return { sym, value: all[i]!, provenance: local[0]!.provenance }
  }
  const globalEntry = globalTensors()[sym]
  if (globalEntry === undefined) return null
  const all = flatten(globalEntry.values)
  const i = Math.min(Math.max(index, 0), all.length - 1)
  return { sym, value: all[i]!, provenance: globalEntry.provenance }
}

function DrillHeading({ sym, value }: { sym: string; value: number }) {
  return (
    <h2 data-testid="drill-heading" className="num text-neutral-900">
      <SubscriptText text={sym} /> — {formatKey(value)}
    </h2>
  )
}

/** Терминальная панель границы графа (∂L/∂x) — Copywriting Contract. */
function TerminalPanel({ resolved }: { resolved: ResolvedNumber }) {
  return (
    <div data-testid="drill-terminal" className="terminal-panel">
      <p className="num text-neutral-900">
        <SubscriptText text="∂L/∂x" /> — входные данные
      </p>
      <p className="ui-text text-neutral-900">
        <SubscriptText text={TERMINAL_BODY} />
      </p>
      <div className="flex flex-wrap items-baseline gap-x-4">
        <button type="button" className="value-btn num text-neutral-900" onClick={() => run.openDrill('∂L/∂W1[0]')}>
          <SubscriptText text="∂L/∂W1" />
        </button>
        <button type="button" className="value-btn num text-neutral-900" onClick={() => run.openDrill('∂L/∂b1[0]')}>
          <SubscriptText text="∂L/∂b1" />
        </button>
      </div>
      <div data-testid="drill-exact" className="exact-row num">
        <span className="ui-label text-neutral-500">точное значение</span>
        <span className="exact-value">{exactRepr(resolved.value)}</span>
      </div>
    </div>
  )
}

export default function NumberDrilldown({ record, drill }: { record: StepRecord; drill: Drill }) {
  const resolved = resolveRef(record, drill.ref)
  const terminal = resolved !== null && resolved.sym === '∂L/∂x'
  const isBackward = record.phase === 'backward'

  return (
    <div
      data-testid="drill-panel"
      className="flex h-full flex-col gap-4 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      <button type="button" data-testid="drill-back" className="btn btn-secondary ui-label self-start" onClick={() => run.closeDrill()}>
        ← к шагу
      </button>

      {resolved === null ? (
        <p className="ui-text text-neutral-500">Число не найдено в текущей операции прогона.</p>
      ) : terminal ? (
        <TerminalPanel resolved={resolved} />
      ) : (
        <>
          <DrillHeading sym={resolved.sym} value={resolved.value} />

          <div data-testid="drill-exact" className="exact-row num">
            <span className="ui-label text-neutral-500">точное значение</span>
            <span className="exact-value">{exactRepr(resolved.value)}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="ui-label text-neutral-500">формула</span>
            <p data-testid="drill-formula" className="num text-neutral-900">
              <SubscriptText text={record.formula} />
            </p>
          </div>

          <p data-testid="drill-provenance" className="ui-text text-neutral-900">
            источник: {resolved.provenance}
          </p>

          {isBackward && (
            <div data-testid="drill-chain" className="flex flex-col gap-1">
              <span className="ui-label text-neutral-500">цепное правило — уровень выше</span>
              {record.inputs.map((input) => (
                <p key={input.sym} className="num text-neutral-500">
                  <SubscriptText text={input.sym} /> = {flatten(input.values).map(formatKey).join(', ')}
                </p>
              ))}
            </div>
          )}

          {resolved.sym.includes('∂') && (
            <p className="ui-text text-neutral-500">
              <SubscriptText text={GLOSSARY} />
            </p>
          )}
        </>
      )}
    </div>
  )
}
