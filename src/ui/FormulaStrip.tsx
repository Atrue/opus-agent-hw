import React from 'react'
import { run } from '../run/run'
import { useRunSlice } from '../run/useRunSlice'
import { XOR_SCENARIO } from '../run/scenario'
import { symbolToSegment, type SegmentId } from './chainLinks'
import { SubscriptText } from './SubscriptText'

/**
 * Формула-строка (01.2-01) — навигационное ядро экрана: полная формула
 * сети на всю ширину полосой между шапкой и сценой; сегменты (forward-цепочка
 * · лосс · update) и их интерактивные символы — данные спека (spec.render.
 * formula, D-30), разделитель · несёт фазный цвет следующего сегмента.
 * Каждый символ — кнопка (testid formula-sym-*, ASCII-safe), клик выбирает
 * звено run.selectLink, повторный клик по выбранному символу снимает выбор
 * (aria-pressed). Скобки/операторы — неинтерактивный текст; индексы —
 * SubscriptText (план Б §5.5). Hand-rolled, без KaTeX/MathJax (T-01.2-01-01).
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

/** Фазный цвет разделителя (токен фазы следующего сегмента). */
const SEG_PHASE_COLOR: Record<'forward' | 'loss' | 'update', string> = {
  forward: 'var(--color-phase-fwd)',
  loss: 'var(--color-phase-loss)',
  update: 'var(--color-phase-upd)',
}

function FormulaSym({ sym, selected, onToggle }: { sym: string; selected: boolean; onToggle: (segment: SegmentId, sym: string) => void }) {
  return (
    <button
      type="button"
      data-testid={`formula-sym-${SYM_TESTID[sym] ?? sym}`}
      className="formula-sym"
      aria-pressed={selected}
      onClick={() => onToggle(symbolToSegment[sym]!, sym)}
    >
      <SubscriptText text={sym} />
    </button>
  )
}

export function FormulaStrip() {
  const selection = useRunSlice((r) => r.selection)
  const toggle = (segment: SegmentId, sym: string): void => {
    if (selection !== null && selection.segment === segment && selection.symbol === sym) run.clearLink()
    else run.selectLink(segment, sym)
  }
  const isSel = (sym: string): boolean => selection !== null && selection.symbol === sym
  const sym = (s: string, key: string): React.JSX.Element => <FormulaSym key={key} sym={s} selected={isSel(s)} onToggle={toggle} />
  return (
    <section aria-label="Формула сети" className="formula-strip">
      {XOR_SCENARIO.render.formula.map((seg, i) => (
        <React.Fragment key={seg.phase}>
          {i > 0 && (
            <span className="formula-sep" aria-hidden="true" style={{ color: SEG_PHASE_COLOR[seg.phase] }}>
              ·
            </span>
          )}
          <span className="formula-seg">
            {seg.tokens.map((tok, j) =>
              tok.kind === 'sym' ? sym(tok.sym, `${seg.phase}-${tok.sym}-${String(j)}`) : <span key={`t-${String(j)}`}>{tok.text}</span>,
            )}
          </span>
        </React.Fragment>
      ))}
    </section>
  )
}
