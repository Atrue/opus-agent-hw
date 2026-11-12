import { useEffect } from 'react'
import { run } from '../run/run'
import { useRunSlice } from '../run/useRunSlice'
import { SEGMENTS, SEGMENT_NUMBER_SYMS } from './chainLinks'
import type { Tensor } from '../tensor'
import { formatKey } from '../format/numbers'
import { SubscriptText } from './SubscriptText'
import { LinkHistory } from './LinkHistory'

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

/** Живые значения по символу звена: разрешение через layerSymbols спека
 *  (D-30) — веса/биасы/слои по символу w/b/z/h, входы/метка/η напрямую;
 *  градиент — после backward-опы (до — null). Экспортируется для live-строки
 *  истории звена (LinkHistory, 01.2-02). */
export function liveValues(sym: string): number[] | null {
  const cursor = run.activeCursor
  const t = cursor.tensors
  const spec = run.scenario
  const syms = spec.render.layerSymbols
  if (sym === 'x') return Array.from(cursor.x.data)
  if (sym === 'y') return Array.from(cursor.y.data)
  if (sym === 'η') return [spec.lr]
  if (sym === 'L') return tensorValues(t.L)
  for (let k = 0; k < syms.length; k++) {
    if (sym === syms[k]!.w) return Array.from(run.model.weights[k]!.data)
    if (sym === syms[k]!.b) return Array.from(run.model.biases[k]!.data)
    if (sym === syms[k]!.z) return tensorValues(t.zPost[k])
    if (sym === syms[k]!.h) return tensorValues(t.h[k])
    if (sym === `∂L/∂${syms[k]!.w}`) {
      const g = run.model.weights[k]!.grad
      return g === null ? null : Array.from(g)
    }
  }
  // показательный вес update-станции: [0,0] последнего слоя
  const K = syms.length
  if (sym === `${syms[K - 1]!.w}[0,0]`) return [run.model.weights[K - 1]!.data[0]!]
  return null
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

export function LinkPanel() {
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
        <h2 className="ui-label text-on-surface-variant">
          <SubscriptText text={segment.title} />
        </h2>
        <p data-testid="link-formula" className="num link-formula">
          <SubscriptText text={segment.formula} />
        </p>
      </div>
      {/* подзаголовок живых чисел (01.2-05, пункт 5 UAT): пояснение семантики —
          что за числа и почему до вычисления строки нет */}
      <p className="ui-label w-full text-on-surface-variant">
        значения живого прогона — символ появляется после вычисления в текущем сэмпле
      </p>
      <div className="link-numbers">
        {SEGMENT_NUMBER_SYMS[segment.id].map((sym) => (
          <LinkNumberRow key={sym} sym={sym} />
        ))}
      </div>
      <LinkHistory segment={selection.segment} symbol={selection.symbol} />
    </section>
  )
}
