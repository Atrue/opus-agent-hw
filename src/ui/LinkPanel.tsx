import { useEffect } from 'react'
import { run, useRunSlice } from '../run/runState'
import { SEGMENTS, SEGMENT_NUMBER_SYMS } from './chainLinks'
import { XOR_SCENARIO } from '../run/scenario'
import type { Tensor } from '../tensor'
import { formatKey } from '../format/numbers'
import SubscriptText from './SubscriptText'
import LinkHistory from './LinkHistory'

/**
 * Панель звена (01.2-01): раскрывается под формульной строкой, когда выбран
 * символ (selection ≠ null; testid link-panel). Показывает заголовок звена,
 * формулу звена (из opMeta) и живые числа — значения тензоров живого прогона
 * (инвариант «drill-down = движок»: числа курсора идентичны записи шага);
 * до вычисления в текущем сэмпле строка символа не показывается. Крестик +
 * Esc снимают выбор (Esc — capture-приоритет над закрытием drill: панель
 * звена закрывается первой). Ниже чисел — раскрывающаяся история звена по
 * сэмплам (LinkHistory, 01.2-02).
 */

function tensorValues(t: Tensor | null): number[] | null {
  return t === null ? null : Array.from(t.data)
}

/** Живые значения по символу звена: веса/вход/метка/промежуточные тензоры
 *  курсора + η из сценария; градиент — после backward-опы (до — null).
 *  Экспортируется для live-строки истории звена (LinkHistory, 01.2-02). */
export function liveValues(sym: string): number[] | null {
  const t = run.activeCursor.tensors
  switch (sym) {
    case 'x':
      return Array.from(run.activeCursor.x.data)
    case 'y':
      return Array.from(run.activeCursor.y.data)
    case 'W1':
      return Array.from(run.model.W1.data)
    case 'b1':
      return Array.from(run.model.b1.data)
    case 'W2':
      return Array.from(run.model.W2.data)
    case 'b2':
      return Array.from(run.model.b2.data)
    case 'η':
      return [XOR_SCENARIO.lr]
    case 'z1':
      return tensorValues(t.z1)
    case 'a1':
      return tensorValues(t.a1)
    case 'z2':
      return tensorValues(t.z2)
    case 'ŷ':
      return tensorValues(t.yhat)
    case 'L':
      return tensorValues(t.L)
    case '∂L/∂W2': {
      const g = run.model.W2.grad
      return g === null ? null : Array.from(g)
    }
    case 'W2[0,0]':
      return [run.model.W2.data[0]!]
    default:
      return null
  }
}

/** Живые числа звена: ≤3 значений на символ, остаток — «+N» (анти-«стена
 *  цифр», паттерн operationRows); невычисленные символы пропускаются. */
function LinkNumberRow({ sym }: { sym: string }) {
  const values = liveValues(sym)
  if (values === null) return null
  const shown = values.slice(0, 3)
  return (
    <span className="num link-number">
      <SubscriptText text={sym} /> = {shown.map((v) => formatKey(v)).join(', ')}
      {values.length > shown.length ? ` +${values.length - shown.length}` : ''}
    </span>
  )
}

export default function LinkPanel() {
  const selection = useRunSlice((r) => r.selection)

  // Esc закрывает панель звена; capture-фаза — раньше bubble-слушателя Esc
  // в StepControls (закрытие drill), панель звена закрывается первой
  useEffect(() => {
    if (selection === null) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        run.clearLink()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [selection])

  if (selection === null) return null
  const segment = SEGMENTS.find((s) => s.id === selection.segment)!
  return (
    <section data-testid="link-panel" className="link-panel" aria-label={`Панель звена: ${segment.title}`}>
      <button
        type="button"
        data-testid="link-close"
        className="btn ui-label link-close"
        aria-label="Снять выбор звена"
        onClick={() => run.clearLink()}
      >
        <span className="icon" aria-hidden="true">
          close
        </span>
      </button>
      <div className="link-panel-main">
        <h2 className="ui-label text-on-surface-variant">{segment.title}</h2>
        <p data-testid="link-formula" className="num link-formula">
          <SubscriptText text={segment.formula} />
        </p>
      </div>
      <div className="link-numbers">
        {SEGMENT_NUMBER_SYMS[segment.id].map((sym) => (
          <LinkNumberRow key={sym} sym={sym} />
        ))}
      </div>
      <LinkHistory segment={selection.segment} symbol={selection.symbol} />
    </section>
  )
}
