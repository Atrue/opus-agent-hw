import { run, useRunSlice } from '../run/runState'
import { symbolToSegment, type SegmentId } from './chainLinks'
import SubscriptText from './SubscriptText'

/**
 * Формула-строка (01.2-01) — навигационное ядро экрана: полная формула
 * сети на всю ширину полосой между шапкой и сценой, три сегмента —
 * forward-цепочка · лосс · update (разделитель · несёт фазный цвет токена).
 * Каждый символ (x, W1, b1, tanh, W2, b2, σ, ŷ, y, L, η, ∂L/∂W) — кнопка
 * (testid formula-sym-*, ASCII-safe), клик выбирает звено run.selectLink,
 * повторный клик по выбранному символу снимает выбор (aria-pressed).
 * Скобки/операторы — неинтерактивный текст; индексы — SubscriptText
 * (план Б §5.5). Hand-rolled, без KaTeX/MathJax (T-01.2-01-01).
 */

/** ASCII-safe testid-суффиксы символов (Unicode → ASCII). */
const SYM_TESTID: Record<string, string> = {
  x: 'x',
  W1: 'W1',
  b1: 'b1',
  tanh: 'tanh',
  W2: 'W2',
  b2: 'b2',
  σ: 'sigma',
  ŷ: 'yhat',
  y: 'y',
  L: 'L',
  η: 'eta',
  '∂L/∂W': 'dL-dW',
}

function FormulaSym({ sym, selected, onToggle }: { sym: string; selected: boolean; onToggle: (segment: SegmentId, sym: string) => void }) {
  return (
    <button
      type="button"
      data-testid={`formula-sym-${SYM_TESTID[sym]}`}
      className="formula-sym"
      aria-pressed={selected}
      onClick={() => onToggle(symbolToSegment[sym]!, sym)}
    >
      <SubscriptText text={sym} />
    </button>
  )
}

export default function FormulaStrip() {
  const selection = useRunSlice((r) => r.selection)
  const toggle = (segment: SegmentId, sym: string): void => {
    if (selection !== null && selection.segment === segment && selection.symbol === sym) run.clearLink()
    else run.selectLink(segment, sym)
  }
  const isSel = (sym: string): boolean => selection !== null && selection.symbol === sym
  const sym = (s: string): React.JSX.Element => <FormulaSym key={s} sym={s} selected={isSel(s)} onToggle={toggle} />
  return (
    <section aria-label="Формула сети" className="formula-strip">
      {/* forward: ŷ = σ(W2·tanh(W1·x + b1) + b2) */}
      <span className="formula-seg">
        {sym('ŷ')} = {sym('σ')}({sym('W2')}·{sym('tanh')}({sym('W1')}·{sym('x')} + {sym('b1')}) + {sym('b2')})
      </span>
      <span className="formula-sep" aria-hidden="true" style={{ color: 'var(--color-phase-loss)' }}>
        ·
      </span>
      {/* лосс: L = −[y·ln ŷ + (1−y)·ln(1−ŷ)] */}
      <span className="formula-seg">
        {sym('L')} = −[{sym('y')}·ln {sym('ŷ')} + (1−{sym('y')})·ln(1−{sym('ŷ')})]
      </span>
      <span className="formula-sep" aria-hidden="true" style={{ color: 'var(--color-phase-upd)' }}>
        ·
      </span>
      {/* update: W ← W − η·∂L/∂W (W — неинтерактивный глиф) */}
      <span className="formula-seg">
        W ← W − {sym('η')}·{sym('∂L/∂W')}
      </span>
    </section>
  )
}
