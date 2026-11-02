import { useEffect } from 'react'
import { format } from 'd3-format'
import { player, selectIsFirst, selectIsLast, selectPosition, selectStep, usePlayer } from '../player/store'
import type { Phase, TensorValues } from '../player/types'

const fmt4g = format('.4g')

const PHASE_LABEL: Record<Phase, string> = {
  forward: 'forward',
  loss: 'loss',
  backward: 'backward',
  update: 'update',
  summary: 'сводка',
}

/** Первое ключевое число шага: только чтение из trace, никаких вычислений (Pattern 1). */
function firstOutputValue(values: TensorValues): number {
  const first = values[0]
  return Array.isArray(first) ? (first[0] as number) : (first as number)
}

export default function App() {
  const state = usePlayer()
  const step = selectStep(state)
  const position = selectPosition(state)
  const isFirst = selectIsFirst(state)
  const isLast = selectIsLast(state)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        player.next()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        player.prev()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-neutral-900">
      <header className="flex min-h-14 items-center justify-between border-b border-neutral-200 px-6">
        <h1 className="text-lg font-semibold">XOR — backprop за 14 шагов</h1>
        <div className="flex items-center gap-3">
          <span data-testid="step-indicator" className="text-sm text-neutral-500">
            {position}
          </span>
          <span className="rounded bg-neutral-700 px-2 py-0.5 text-xs font-medium text-white">
            {PHASE_LABEL[step.phase]}
          </span>
        </div>
      </header>

      <main className="flex max-w-3xl flex-1 flex-col items-start gap-4 px-6 py-6">
        <p className="font-mono text-2xl">{step.formula}</p>
        <p className="text-base leading-relaxed text-neutral-700">{step.narrative.ru}</p>
        <p data-testid="key-number" className="font-mono tabular-nums text-5xl">
          {fmt4g(firstOutputValue(step.outputs.values))}
        </p>
      </main>

      <footer className="flex min-h-18 items-center gap-3 border-t border-neutral-200 px-6 py-3">
        <button
          type="button"
          data-testid="btn-prev"
          onClick={player.prev}
          disabled={isFirst}
          className="rounded border border-neutral-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Назад
        </button>
        <button
          type="button"
          data-testid="btn-next"
          onClick={player.next}
          disabled={isLast}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Шаг
        </button>
      </footer>
    </div>
  )
}
