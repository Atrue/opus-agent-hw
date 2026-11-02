import { player, trace } from '../player/store'
import type { Drill } from '../player/store'
import type { TensorValues, TraceStep } from '../player/types'
import { exactRepr, formatKey } from '../format/numbers'
import SubscriptText from './SubscriptText'

/**
 * NumberDrilldown (Interaction Contract): открывается в слоте StepPanel
 * (замещает содержимое) по клику на число в StepPanel или узел/ребро
 * диаграммы. Состав: exact-repr (отдельная строка с горизонтальным
 * скроллом) + отформатированное значение + формула + provenance
 * (provenance в данных — Pattern 3, чистый data lookup); на backward-шагах
 * — раскрытие цепного правила на 1 уровень (формула + восходящие входы).
 * Граница графа (шаг 12, ∂L/∂x) — терминальная панель по Copywriting
 * Contract, не пустой экран. Закрытие: backlink «← к шагу», Esc,
 * автосброс при смене шага (в transition стора).
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

/** Provenance из данных: ищем первое упоминание символа во входах всех шагов. */
function provenanceFromData(sym: string): string | undefined {
  for (const step of trace.steps) {
    const input = step.inputs.find((i) => i.sym === sym)
    if (input?.provenance !== undefined) return input.provenance
  }
  return undefined
}

const GLOBAL_TENSORS: Record<string, TensorValues> = {
  W1: trace.weights.w1,
  b1: trace.weights.b1,
  W2: trace.weights.w2,
  b2: trace.weights.b2,
  x: trace.sample.x,
  y: [trace.sample.y],
}

/** Разрешение ref → число: текущий шаг (grads → outputs → inputs), затем
 *  глобальные тензоры трейса (веса/вход). Только lookup, без вычислений. */
function resolveRef(step: TraceStep, ref: string): ResolvedNumber | null {
  const m = /^(.+)\[(\d+)\]$/.exec(ref)
  const sym = m ? m[1]! : ref
  const index = m ? Number(m[2]) : 0

  const stepProvenance = `шаг ${step.index + 1} (${step.op})`
  const local: { values: TensorValues; provenance: string }[] = []
  if (step.grads !== null && sym in step.grads) local.push({ values: step.grads[sym]!, provenance: stepProvenance })
  if (step.outputs.sym === sym) local.push({ values: step.outputs.values, provenance: stepProvenance })
  const input = step.inputs.find((i) => i.sym === sym)
  if (input !== undefined) local.push({ values: input.values, provenance: input.provenance ?? stepProvenance })

  if (local.length > 0) {
    const all = flatten(local[0]!.values)
    const i = Math.min(Math.max(index, 0), all.length - 1)
    return { sym, value: all[i]!, provenance: local[0]!.provenance }
  }
  const globalValues = GLOBAL_TENSORS[sym]
  const globalProvenance = provenanceFromData(sym)
  if (globalValues === undefined || globalProvenance === undefined) return null
  const all = flatten(globalValues)
  const i = Math.min(Math.max(index, 0), all.length - 1)
  return { sym, value: all[i]!, provenance: globalProvenance }
}

function DrillHeading({ sym, value }: { sym: string; value: number }) {
  return (
    <h2 data-testid="drill-heading" className="num text-neutral-900">
      <SubscriptText text={sym} /> — {formatKey(value)}
    </h2>
  )
}

/** Терминальная панель границы графа (шаг 12, ∂L/∂x) — Copywriting Contract. */
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
        <button type="button" className="value-btn num text-neutral-900" onClick={() => player.openDrill('∂L/∂W1[0]')}>
          <SubscriptText text="∂L/∂W1" />
        </button>
        <button type="button" className="value-btn num text-neutral-900" onClick={() => player.openDrill('∂L/∂b1[0]')}>
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

export default function NumberDrilldown({ step, drill }: { step: TraceStep; drill: Drill }) {
  const resolved = resolveRef(step, drill.ref)
  const terminal = resolved !== null && resolved.sym === '∂L/∂x'
  const isBackward = step.phase === 'backward'

  return (
    <div
      data-testid="drill-panel"
      className="flex h-full flex-col gap-4 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      <button type="button" data-testid="drill-back" className="btn btn-secondary ui-label self-start" onClick={player.closeDrill}>
        ← к шагу
      </button>

      {resolved === null ? (
        <p className="ui-text text-neutral-500">Число не найдено в трейсе.</p>
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
              <SubscriptText text={step.formula} />
            </p>
          </div>

          <p data-testid="drill-provenance" className="ui-text text-neutral-900">
            источник: {resolved.provenance}
          </p>

          {isBackward && (
            <div data-testid="drill-chain" className="flex flex-col gap-1">
              <span className="ui-label text-neutral-500">цепное правило — уровень выше</span>
              {step.inputs.map((input) => (
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
