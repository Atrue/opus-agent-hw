import { run, useRunSlice } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import { parseHash, toHash } from '../run/url'
import type { Phase } from '../tensor'
import ArchitectureDiagram from './ArchitectureDiagram'
import NarrativeLine from './NarrativeLine'
import NumberDrilldown from './NumberDrilldown'
import OperationPanel from './OperationPanel'
import StepControls from './StepControls'

/**
 * Экран walkthrough на живом прогоне — layout-контракт UI-SPEC Rev 1.1:
 * header 56px (заголовок «XOR — backprop по шагам» слева; справа индикатор
 * «Эпоха N · пример K · шаг M» + бейдж фазы + toggle «Лекционный режим»),
 * main 55% слот диаграммы / 45% OperationPanel (панель операции — уровень
 * иерархии DOCS-02, словарь R2), gap 32px, bottom bar 72px
 * (контролы слева, нарратив справа). Слоты фиксированы (проекторная
 * стабильность). Лекционный режим — класс .lecture на корне (CSS-переменные).
 *
 * URL (R3): hash инициализируется до первого рендера и несёт только сценарий;
 * невалидное значение клампится к дефолту через history.replaceState.
 */

const PHASE_LABEL: Record<Phase, string> = {
  forward: 'forward',
  loss: 'loss',
  backward: 'backward',
  update: 'update',
}

const PHASE_COLOR_VAR: Record<Phase, string> = {
  forward: '--color-phase-fwd',
  loss: '--color-phase-loss',
  backward: '--color-phase-bwd',
  update: '--color-phase-upd',
}

// URL-state (R3): hash читается при старте — модуль исполняется раньше
// createRoot; невалидный hash нормализуется к дефолтному сценарию.
const initialScenario = parseHash(window.location.hash).scenario
if (window.location.hash !== toHash(initialScenario)) {
  window.history.replaceState(null, '', toHash(initialScenario))
}

// Нарратив до первого шага — предстоящей операции (числа появятся после «Шага»)
const INTRO_NARRATIVE = XOR_SCENARIO.opMeta[0]!.narrative

export default function App() {
  const epoch = useRunSlice((r) => r.epoch)
  const sampleNumber = useRunSlice((r) => r.sampleIndex + 1)
  const stepNumber = useRunSlice((r) => r.stepInSample)
  const mode = useRunSlice((r) => r.mode)
  const record = useRunSlice((r) => r.currentRecord)
  const drill = useRunSlice((r) => r.drill)
  const phase = record?.phase ?? XOR_SCENARIO.opMeta[0]!.phase
  const phaseVar = PHASE_COLOR_VAR[phase]

  return (
    <div className={`flex h-screen flex-col bg-white font-sans text-neutral-900${mode === 'lecture' ? ' lecture' : ''}`}>
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-6">
        <h1 className="app-heading">XOR — backprop по шагам</h1>
        <div className="flex items-center gap-2">
          <span data-testid="step-indicator" className="ui-label whitespace-nowrap text-neutral-500">
            Эпоха {epoch} · пример {sampleNumber} · шаг {stepNumber}
          </span>
          <span
            data-testid="phase-badge"
            className="phase-badge ui-label"
            style={{ background: `color-mix(in srgb, var(${phaseVar}) 12%, white)` }}
          >
            <span className="phase-dot" style={{ background: `var(${phaseVar})` }} />
            {PHASE_LABEL[phase]}
          </span>
          <button
            type="button"
            data-testid="toggle-lecture"
            className="btn btn-secondary ui-label whitespace-nowrap"
            aria-pressed={mode === 'lecture'}
            onClick={() => run.toggleMode()}
          >
            Лекционный режим
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 gap-8 px-6 py-6">
        {/* Слот SVG-диаграммы 2-3-1 (55%): живые рёбра-веса, активная op, клик → drill */}
        <section
          aria-label="Слот диаграммы сети"
          data-testid="diagram-slot"
          className="w-[55%] rounded-lg border border-neutral-200 bg-neutral-50"
        >
          <ArchitectureDiagram record={record} />
        </section>
        <section aria-label="Панель шага" className="w-[45%]">
          {drill !== null && record !== null ? (
            <NumberDrilldown record={record} drill={drill} />
          ) : (
            <OperationPanel record={record} />
          )}
        </section>
      </main>

      <footer className="flex h-[72px] shrink-0 items-center justify-between gap-8 border-t border-neutral-200 px-6">
        <StepControls />
        <NarrativeLine text={record?.narrative.ru ?? INTRO_NARRATIVE} />
      </footer>
    </div>
  )
}
