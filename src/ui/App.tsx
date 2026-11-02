import { player, selectIsFirst, selectIsLast, selectPosition, selectStep, trace, usePlayer } from '../player/store'
import type { Phase } from '../player/types'
import NarrativeLine from './NarrativeLine'
import StepControls from './StepControls'
import StepPanel from './StepPanel'

/**
 * Экран шага — layout-контракт UI-SPEC «Interaction Contract»:
 * header 56px (заголовок слева; справа «Шаг N из 14» + бейдж фазы + toggle
 * «Лекционный режим»), main 55% слот диаграммы / 45% StepPanel, gap 32px,
 * bottom bar 72px (контролы слева, нарратив справа). Слоты фиксированы:
 * смена шага не меняет высоты зон (проекторная стабильность, D-02).
 * Лекционный режим — класс .lecture на корне: меняет только CSS-переменные.
 */

const PHASE_LABEL: Record<Phase, string> = {
  forward: 'forward',
  loss: 'loss',
  backward: 'backward',
  update: 'update',
  summary: 'сводка',
}

const PHASE_COLOR_VAR: Record<Phase, string> = {
  forward: '--color-phase-fwd',
  loss: '--color-phase-loss',
  backward: '--color-phase-bwd',
  update: '--color-phase-upd',
  summary: '--color-phase-summary',
}

export default function App() {
  const state = usePlayer()
  const step = selectStep(state)
  const phaseVar = PHASE_COLOR_VAR[step.phase]

  return (
    <div className={`flex h-screen flex-col bg-white font-sans text-neutral-900${state.mode === 'lecture' ? ' lecture' : ''}`}>
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-6">
        <h1 className="app-heading">XOR — backprop за 14 шагов</h1>
        <div className="flex items-center gap-2">
          <span data-testid="step-indicator" className="ui-label whitespace-nowrap text-neutral-500">
            {selectPosition(state)}
          </span>
          <span
            data-testid="phase-badge"
            className="phase-badge ui-label"
            style={{ background: `color-mix(in srgb, var(${phaseVar}) 12%, white)` }}
          >
            <span className="phase-dot" style={{ background: `var(${phaseVar})` }} />
            {PHASE_LABEL[step.phase]}
          </span>
          <button
            type="button"
            data-testid="toggle-lecture"
            className="btn btn-secondary ui-label whitespace-nowrap"
            aria-pressed={state.mode === 'lecture'}
            onClick={player.toggleMode}
          >
            Лекционный режим
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 gap-8 px-6 py-6">
        {/* Слот SVG-диаграммы 2-3-1 (55%) — рендер диаграммы: план 01-03 */}
        <section
          aria-label="Слот диаграммы сети"
          data-testid="diagram-slot"
          className="w-[55%] rounded-lg border border-neutral-200 bg-neutral-50"
        />
        <section aria-label="Панель шага" className="w-[45%]">
          <StepPanel step={step} final={trace.final} />
        </section>
      </main>

      <footer className="flex h-[72px] shrink-0 items-center justify-between gap-8 border-t border-neutral-200 px-6">
        <StepControls isFirst={selectIsFirst(state)} isLast={selectIsLast(state)} />
        <NarrativeLine text={step.narrative.ru} />
      </footer>
    </div>
  )
}
