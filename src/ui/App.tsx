import { run, useRunSlice } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import { parseHash, toHash } from '../run/url'
import { formatKey } from '../format/numbers'
import type { Phase } from '../tensor'
import ArchitectureDiagram from './ArchitectureDiagram'
import EpochSummary from './EpochSummary'
import LossChart from './LossChart'
import NumberDrilldown from './NumberDrilldown'
import OperationPanel from './OperationPanel'
import StepControls from './StepControls'
import StepperBand from './StepperBand'
import WeightsTable from './WeightsTable'

/**
 * Воркбенч walkthrough (DESIGN.md §4, D-25): жёсткий каркас — шапка (заголовок
 * + бейдж фазы + «Лекционный режим»), лента шагов (StepperBand, 2→4→8), main —
 * 12-колоночная сетка xl: DAG 4 | панель операции 5 | история 3 (график лосса
 * + таблица весов); md — 2 колонки, mobile — одна. Статус-бар 48px: контролы +
 * LOSS/LR + индикатор позиции + hotkeys (backdrop-blur разрешён хрому).
 *
 * Панель операции — уровень иерархии DOCS-02 (словарь R2); на границе эпохи
 * слот занимает экран завершения эпохи, при drill — NumberDrilldown.
 * Слоты фиксированы (проекторная стабильность); лекционный режим — класс
 * .lecture на корне (CSS-переменные).
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

export default function App() {
  const epoch = useRunSlice((r) => r.epoch)
  const sampleNumber = useRunSlice((r) => r.sampleIndex + 1)
  const stepNumber = useRunSlice((r) => r.stepInSample)
  const mode = useRunSlice((r) => r.mode)
  const screen = useRunSlice((r) => r.screen)
  const record = useRunSlice((r) => r.currentRecord)
  const drill = useRunSlice((r) => r.drill)
  const lossPoints = useRunSlice((r) => r.epochLossPoints)
  const phase = record?.phase ?? XOR_SCENARIO.opMeta[0]!.phase
  const phaseVar = PHASE_COLOR_VAR[phase]
  const lastLoss = lossPoints.length > 0 ? lossPoints[lossPoints.length - 1] : null

  return (
    <div className={`flex min-h-screen flex-col bg-background font-sans text-on-surface xl:h-screen${mode === 'lecture' ? ' lecture' : ''}`}>
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-outline-variant px-4">
        <h1 className="app-heading">XOR — backprop по шагам</h1>
        <div className="flex items-center gap-2">
          <span
            data-testid="phase-badge"
            className="phase-badge ui-label"
            style={{ background: `color-mix(in srgb, var(${phaseVar}) 14%, var(--color-surface-container-low))` }}
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

      {/* Лента шагов — навигационный хребет (индикатор, forward-only) */}
      <div className="shrink-0 border-b border-outline-variant px-4 py-2">
        <StepperBand />
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-12">
        {/* Слот SVG-диаграммы 2-3-1 (xl — 4 колонки): живые рёбра-веса,
            активная op, клик → drill; канва — «экран» container-lowest */}
        <section aria-label="Слот диаграммы сети" data-testid="diagram-slot" className="card min-h-[320px] md:col-span-1 xl:col-span-4">
          <div className="card-head">
            <span className="icon" aria-hidden="true">
              hub
            </span>
            <h2 className="card-title">Сеть 2-3-1</h2>
            <span className="card-meta ui-label">живые веса</span>
          </div>
          <div className="screen min-h-0 flex-1">
            <ArchitectureDiagram record={record} />
          </div>
        </section>

        {/* Панель шага (xl — 5 колонок): операция / drill-down / экран эпохи */}
        <section aria-label="Панель шага" className="flex min-h-0 flex-col md:col-span-1 xl:col-span-5">
          {screen === 'epoch-end' ? (
            <EpochSummary />
          ) : drill !== null && record !== null ? (
            <NumberDrilldown record={record} drill={drill} />
          ) : (
            <OperationPanel record={record} />
          )}
        </section>

        {/* История обучения (UX-05/UX-06; xl — 3 колонки): график лосса +
            таблица весов; потолок ≤30 чисел экрана шага её не считает */}
        <aside
          aria-label="История обучения"
          data-testid="history-zone"
          className="flex flex-col gap-4 md:col-span-2 xl:col-span-3 xl:min-h-0"
        >
          <div className="card min-h-[220px] flex-1">
            <div className="card-head">
              <span className="icon" aria-hidden="true">
                monitoring
              </span>
              <h2 className="card-title">Лосс по сэмплам</h2>
              <span className="card-meta ui-label">эпоха {epoch}</span>
            </div>
            <div className="screen min-h-0 flex-1">
              <LossChart />
            </div>
          </div>
          <div className="card min-h-[220px] flex-1">
            <div className="card-head">
              <span className="icon" aria-hidden="true">
                grid_view
              </span>
              <h2 className="card-title">Веса по эпохам</h2>
              <span className="card-meta ui-label">13 весов</span>
            </div>
            <WeightsTable />
          </div>
        </aside>
      </main>

      {/* Статус-бар 48px (DESIGN.md §4): контролы слева, LOSS/LR — моно-метрики,
          справа — индикатор позиции + hotkeys; нарратив живёт в панели операции */}
      <footer className="status-bar flex h-12 shrink-0 items-center gap-4 px-4">
        <StepControls />
        <div className="num flex items-center gap-4 whitespace-nowrap text-sm" data-testid="status-metrics">
          <span>
            LOSS <span className="text-on-surface-variant">{lastLoss === null ? '—' : formatKey(lastLoss)}</span>
          </span>
          <span>
            LR <span className="text-on-surface-variant">{formatKey(XOR_SCENARIO.lr)}</span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span data-testid="step-indicator" className="ui-label whitespace-nowrap text-on-surface-variant">
            Эпоха {epoch} · пример {sampleNumber} · шаг {stepNumber}
          </span>
          <span className="ui-label hidden items-center gap-2 whitespace-nowrap text-on-surface-variant lg:flex">
            <kbd className="kbd">Space</kbd> шаг
            <kbd className="kbd">Esc</kbd> к шагу
          </span>
        </div>
      </footer>
    </div>
  )
}
