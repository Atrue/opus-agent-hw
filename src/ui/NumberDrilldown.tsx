import { run, type Drill } from '../run/runState'
import type { StepRecord } from '../tensor'
import { exactRepr, formatKey } from '../format/numbers'
import { flattenTensorValues, resolveRef, type ResolvedNumber } from './hintData'
import SubscriptText from './SubscriptText'

/**
 * NumberDrilldown (Interaction Contract): открывается в слоте панели
 * операции (замещает содержимое) по клику на число в OperationPanel или
 * узел/ребро диаграммы. Состав: exact-repr + отформатированное значение +
 * формула + provenance; на backward-опах — раскрытие цепного правила на 1
 * уровень. resolveRef (переиспользуется tier-1 тултипами NumberHint, R5)
 * работает над ТЕКУЩЕЙ записью прогона + живыми глобальными тензорами
 * (веса модели, вход/метка активного сэмпла) — только lookup, без
 * вычислений. Граница графа (∂L/∂x) — терминальная панель, не пустой
 * экран. Закрытие: backlink «← к шагу», Esc, автосброс при смене операции.
 */

const TERMINAL_BODY = 'Градиент дальше не распространяется: x — старт цепного правила. Смотри ∂L/∂W1 и ∂L/∂b1.'
const GLOSSARY = '∂L/∂W — градиент L по W (в CS231n: dL/dW)'

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
                  <SubscriptText text={input.sym} /> = {flattenTensorValues(input.values).map(formatKey).join(', ')}
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
